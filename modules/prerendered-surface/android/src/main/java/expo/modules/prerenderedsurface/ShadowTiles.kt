package expo.modules.prerenderedsurface

import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Picture
import android.graphics.Rect
import android.graphics.RectF
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.LruCache
import android.view.View
import java.lang.ref.WeakReference
import java.util.concurrent.Executors
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

// React Native draws outer box shadows from Android 9 and inner ones from Android 10; below that it draws
// none (BackgroundStyleApplicator.setBoxShadow), and neither does this.
private const val MIN_OUTSET_SDK = Build.VERSION_CODES.P
private const val MIN_INSET_SDK = Build.VERSION_CODES.Q

/** CSS: a Gaussian whose standard deviation is half the blur radius (React Native's BLUR_RADIUS_SIGMA_SCALE). */
private const val BLUR_SIGMA_SCALE = 0.5f

/** Android takes a blur as a radius; hwui turns it back into sigma = 0.57735 x radius + 0.5 (Blur.cpp). */
private const val SIGMA_TO_RADIUS_RATIO = 0.57735f

/** Skia pads a blurred mask by three sigma: nothing is drawn further out. */
private const val SIGMA_REACH = 3f

/** The bitmaps kept: some thirty at a card's size. */
private const val CACHE_BYTES = 16 * 1024 * 1024

/** A tile bigger than this would push most of the cache out (or itself): such a shadow is drawn live. */
private const val MAX_TILE_BYTES = CACHE_BYTES / 4

/**
 * Rest between two bitmaps: each one is drawn on the RenderThread, so making them back to back would hold
 * up the frames being drawn meanwhile. About one frame.
 */
private const val PAUSE_BETWEEN_TILES_MS = 16L

private const val TAG = "PrerenderedSurface"

private val ZERO_RADII = FloatArray(8)

/** React Native's FilterHelper.sigmaToRadius, for a sigma already in pixels. */
private fun sigmaToRadius(pxSigma: Float): Float =
  if (pxSigma > 0.5f) (pxSigma - 0.5f) / SIGMA_TO_RADIUS_RATIO else 0f

/** React Native's adjustRadiusForSpread (BoxShadowBorderRadius.kt). */
private fun adjustRadiusForSpread(radius: Float, spread: Float): Float {
  val multiplier = if (radius < abs(spread)) 1 + (radius / abs(spread) - 1).pow(3) else 1f
  return (radius + spread * multiplier).coerceAtLeast(0f)
}

private fun radii(radius: Float) = FloatArray(8) { radius }

/** One shadow in pixels, and how far in from each side its corners still shape it. */
private class Geometry(shadow: SurfaceShadow, val radius: Float, density: Float) {
  val inset = shadow.inset
  val offsetX = shadow.offsetX * density
  val offsetY = shadow.offsetY * density
  val spread = shadow.spread * density
  private val sigma = shadow.blur * BLUR_SIGMA_SCALE * density

  /** The blur as the paint takes it. */
  val blurRadius = sigmaToRadius(sigma)

  /** An inner shadow's outer edge: React Native takes the unscaled blur here (after Blink). */
  val blurExtent = sigmaToRadius(shadow.blur * density)

  private val reach = ceil(SIGMA_REACH * sigma).toInt() + 1

  /** Room the shadow takes outside the surface: none for an inner shadow, which is clipped to it. */
  val pad = if (inset) 0 else ceil(abs(spread) + max(abs(offsetX), abs(offsetY))).toInt() + reach + 1

  /** Beyond this from a side, the shadow along that side is the same all the way. */
  val cornerX = ceil(radius + abs(spread) + abs(offsetX)).toInt() + reach + 1
  val cornerY = ceil(radius + abs(spread) + abs(offsetY)).toInt() + reach + 1
}

/** A shadow drawn once, and along which axes it may be stretched. */
private class Tile(val bitmap: Bitmap, val geometry: Geometry, val stretchX: Boolean, val stretchY: Boolean)

private data class TileKey(
  val inset: Boolean,
  val offsetX: Float,
  val offsetY: Float,
  val blur: Float,
  val spread: Float,
  val color: Int,
  val radius: Float,
  val density: Float,
  /** The surface's width when the tile is drawn at exactly that width (too narrow to stretch), else 0. */
  val width: Int,
  val height: Int,
)

/**
 * Box shadows rendered once into bitmaps and stretched to each surface, as a nine-patch is: along a
 * straight side the shadow is the same all the way, so the one middle row and column are stretched and
 * the corners stay as drawn. A surface too small to stretch along an axis gets a bitmap at its exact size
 * there. Each bitmap is rendered by the GPU, as the live shadow is, with React Native's own calls
 * (OutsetBoxShadowDrawable, InsetBoxShadowDrawable), so it looks the same; only the blurring happens once.
 *
 * A bitmap is made on a worker thread, never inside a frame. Until it is ready the shadow is drawn live,
 * exactly as React Native draws it, and the surface is drawn again once the bitmap is in. A shadow the GPU
 * can't render into a bitmap, or a canvas that can't draw one (software), stays live.
 */
internal object ShadowTiles {
  private val cache =
    object : LruCache<TileKey, Tile>(CACHE_BYTES) {
      override fun sizeOf(key: TileKey, value: Tile) = value.bitmap.width * value.bitmap.height * 4
    }

  /** Bitmaps being made, and the views to draw again when each is in. Main thread only. */
  private val waiting = HashMap<TileKey, MutableList<WeakReference<View>>>()

  /** Shadows the GPU failed to render into a bitmap: drawn live from then on. Main thread only. */
  private val liveOnly = HashSet<TileKey>()

  private val worker =
    Executors.newSingleThreadExecutor { task ->
      Thread(task, "ShadowTiles").apply {
        isDaemon = true
        priority = Thread.MIN_PRIORITY
      }
    }
  private val mainThread = Handler(Looper.getMainLooper())
  // Filtered, as a cached layer's texture is: a surface under a transform (the tab bar's sliding well, a
  // key shrinking under a finger) samples between pixels. Unmoved, every pixel lands exactly.
  private val blitPaint = Paint().apply { isFilterBitmap = true }
  private val src = Rect()
  private val dst = Rect()

  fun draw(
    view: View,
    canvas: Canvas,
    shadow: SurfaceShadow,
    width: Int,
    height: Int,
    radius: Float,
    density: Float,
  ) {
    if (Build.VERSION.SDK_INT < if (shadow.inset) MIN_INSET_SDK else MIN_OUTSET_SDK) return
    if (shadow.color ushr 24 == 0) return
    // Corners rounder than half the box draw as half the box (Skia scales them down): a pill's 9999 then
    // shares its tiles, rather than a new full-size bitmap for each size.
    val clamped = min(radius, min(width, height) / 2f)
    val geometry = Geometry(shadow, clamped, density)
    val stretchX = width >= 2 * geometry.cornerX + 1
    val stretchY = height >= 2 * geometry.cornerY + 1
    val key =
      TileKey(
        shadow.inset,
        shadow.offsetX,
        shadow.offsetY,
        shadow.blur,
        shadow.spread,
        shadow.color,
        clamped,
        density,
        if (stretchX) 0 else width,
        if (stretchY) 0 else height,
      )
    // A hardware bitmap can only be drawn by the GPU; a software canvas (a screenshot of the view) gets
    // the live shadow.
    val tile = if (canvas.isHardwareAccelerated) cache.get(key) else null
    if (tile != null) {
      blit(canvas, tile, width, height)
      return
    }
    drawLive(canvas, shadow.color, geometry, width.toFloat(), height.toFloat())
    if (canvas.isHardwareAccelerated && key !in liveOnly) {
      val tileWidth = if (stretchX) 2 * geometry.cornerX + 1 else width
      val tileHeight = if (stretchY) 2 * geometry.cornerY + 1 else height
      if (tileWidth.toLong() * tileHeight * 4 > MAX_TILE_BYTES) {
        liveOnly.add(key)
        return
      }
      request(key, view, shadow.color, geometry, tileWidth, tileHeight, stretchX, stretchY)
    }
  }

  /** The shadow drawn straight onto the canvas, as React Native draws it. */
  private fun drawLive(canvas: Canvas, color: Int, geometry: Geometry, width: Float, height: Float) {
    val box = RectF(0f, 0f, width, height)
    val count = canvas.save()
    if (geometry.inset) {
      drawInset(canvas, box, geometry, shadowPaint(color, geometry))
    } else {
      drawOutset(canvas, box, geometry, shadowPaint(color, geometry))
    }
    canvas.restoreToCount(count)
  }

  /** Makes the bitmap on the worker, then puts it in and draws every view waiting on it again. */
  private fun request(
    key: TileKey,
    view: View,
    color: Int,
    geometry: Geometry,
    boxWidth: Int,
    boxHeight: Int,
    stretchX: Boolean,
    stretchY: Boolean,
  ) {
    val views = waiting[key]
    if (views != null) {
      if (views.none { it.get() === view }) views.add(WeakReference(view))
      return
    }
    waiting[key] = mutableListOf(WeakReference(view))
    worker.execute {
      val tile =
        try {
          render(color, geometry, boxWidth, boxHeight, stretchX, stretchY)
        } catch (error: Throwable) {
          // Any failure (out of memory included) costs only the bitmap: the shadow is drawn live instead,
          // and the views waiting on it are still told.
          Log.w(TAG, "GPU render of a shadow failed; drawing it live", error)
          null
        }
      mainThread.post {
        if (tile != null) cache.put(key, tile) else liveOnly.add(key)
        waiting.remove(key)?.forEach { it.get()?.invalidate() }
      }
      try {
        Thread.sleep(PAUSE_BETWEEN_TILES_MS)
      } catch (interrupted: InterruptedException) {
        Thread.currentThread().interrupt()
      }
    }
  }

  private fun shadowPaint(color: Int, geometry: Geometry) =
    Paint().apply {
      this.color = color
      if (geometry.blurRadius > 0f) {
        maskFilter = BlurMaskFilter(geometry.blurRadius, BlurMaskFilter.Blur.NORMAL)
      }
    }

  /** Worker thread: the shadow on a box of the tile's size, rendered by the GPU into a hardware bitmap. */
  private fun render(
    color: Int,
    geometry: Geometry,
    boxWidth: Int,
    boxHeight: Int,
    stretchX: Boolean,
    stretchY: Boolean,
  ): Tile {
    val width = boxWidth + 2 * geometry.pad
    val height = boxHeight + 2 * geometry.pad
    val picture = Picture()
    val canvas = picture.beginRecording(width, height)
    canvas.translate(geometry.pad.toFloat(), geometry.pad.toFloat())
    val box = RectF(0f, 0f, boxWidth.toFloat(), boxHeight.toFloat())
    val paint = shadowPaint(color, geometry)
    if (geometry.inset) drawInset(canvas, box, geometry, paint) else drawOutset(canvas, box, geometry, paint)
    picture.endRecording()
    return Tile(Bitmap.createBitmap(picture, width, height, Bitmap.Config.HARDWARE), geometry, stretchX, stretchY)
  }

  /** OutsetBoxShadowDrawable.draw, for a box at the origin. */
  private fun drawOutset(canvas: Canvas, box: RectF, geometry: Geometry, paint: Paint) {
    val shadowRect =
      RectF(box).apply {
        inset(-geometry.spread, -geometry.spread)
        offset(geometry.offsetX, geometry.offsetY)
      }
    if (geometry.radius > 0f) {
      // As React Native: the clip sits 0.4 px inside the box, against antialiased-clip artifacts.
      val clip = RectF(box).apply { inset(0.4f, 0.4f) }
      canvas.clipOutPath(Path().apply { addRoundRect(clip, radii(geometry.radius), Path.Direction.CW) })
      val shadowRadii = radii(adjustRadiusForSpread(geometry.radius, geometry.spread))
      canvas.drawPath(Path().apply { addRoundRect(shadowRect, shadowRadii, Path.Direction.CW) }, paint)
    } else {
      canvas.clipOutRect(box)
      canvas.drawRect(shadowRect, paint)
    }
  }

  /** InsetBoxShadowDrawable.draw, for a box at the origin with no border. */
  private fun drawInset(canvas: Canvas, box: RectF, geometry: Geometry, paint: Paint) {
    val inner =
      RectF(box).apply {
        if (2 * geometry.spread > box.width()) setEmpty() else inset(geometry.spread, geometry.spread)
        offset(geometry.offsetX, geometry.offsetY)
      }
    val outer =
      RectF(box).apply {
        inset(-geometry.blurExtent, -geometry.blurExtent)
        union(inner)
      }
    if (geometry.radius > 0f) {
      val boxRadii = radii(geometry.radius)
      canvas.clipPath(Path().apply { addRoundRect(box, boxRadii, Path.Direction.CW) })
      val innerRadii = FloatArray(8) { adjustRadiusForSpread(boxRadii[it], -geometry.spread) }
      canvas.drawDoubleRoundRect(outer, ZERO_RADII, inner, innerRadii, paint)
    } else {
      canvas.clipRect(box)
      canvas.drawDoubleRoundRect(outer, ZERO_RADII, inner, ZERO_RADII, paint)
    }
  }

  private fun blit(canvas: Canvas, tile: Tile, width: Int, height: Int) {
    val geometry = tile.geometry
    val xs = spans(tile.stretchX, geometry.pad, geometry.cornerX, width, tile.bitmap.width)
    val ys = spans(tile.stretchY, geometry.pad, geometry.cornerY, height, tile.bitmap.height)
    for (y in ys.indices step 4) {
      for (x in xs.indices step 4) {
        src.set(xs[x], ys[y], xs[x + 1], ys[y + 1])
        dst.set(xs[x + 2], ys[y + 2], xs[x + 3], ys[y + 3])
        canvas.drawBitmap(tile.bitmap, src, dst, blitPaint)
      }
    }
  }

  /**
   * Along one axis, the bitmap's spans and where each lands, four numbers per span: source start and end,
   * destination start and end, measured from the surface's own edge. Stretched: the near corner as drawn,
   * the one middle pixel across the rest, the far corner as drawn. Otherwise the whole bitmap, as drawn.
   */
  private fun spans(stretch: Boolean, pad: Int, corner: Int, length: Int, bitmapLength: Int): IntArray =
    if (!stretch) {
      intArrayOf(0, bitmapLength, -pad, length + pad)
    } else {
      intArrayOf(
        0, pad + corner, -pad, corner,
        pad + corner, pad + corner + 1, corner, length - corner,
        pad + corner + 1, bitmapLength, length - corner, length + pad,
      )
    }
}
