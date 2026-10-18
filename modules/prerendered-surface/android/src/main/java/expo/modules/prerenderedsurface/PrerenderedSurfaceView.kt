package expo.modules.prerenderedsurface

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * A surface's fill and box shadows, drawn as React Native draws them (CompositeBackgroundDrawable): the
 * outer shadows under the fill, the first listed on top, then the fill, then the inner shadows. Each
 * shadow comes from a bitmap rendered once (ShadowTiles; drawn live until its bitmap is ready), so a
 * redraw (a cached layer rebuilt when its screen comes back) copies pixels instead of blurring again. It
 * draws past its own bounds, as a box shadow does: the parent must not clip it (React Native's views
 * don't).
 */
@SuppressLint("ViewConstructor")
class PrerenderedSurfaceView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var fill: Int = Color.TRANSPARENT
    set(value) {
      field = value
      fillPaint.color = value
      invalidate()
    }

  /** dp, the same on every corner. */
  var radius: Float = 0f
    set(value) {
      field = value
      invalidate()
    }

  var shadows: List<SurfaceShadow> = emptyList()
    set(value) {
      field = value
      invalidate()
    }

  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val fillRect = RectF()

  init {
    setWillNotDraw(false)
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (width <= 0 || height <= 0) return
    val density = resources.displayMetrics.density
    val radiusPx = radius * density

    for (index in shadows.indices.reversed()) {
      val shadow = shadows[index]
      if (!shadow.inset) ShadowTiles.draw(this, canvas, shadow, width, height, radiusPx, density)
    }

    if (Color.alpha(fill) != 0) {
      fillRect.set(0f, 0f, width.toFloat(), height.toFloat())
      if (radiusPx > 0f) {
        canvas.drawRoundRect(fillRect, radiusPx, radiusPx, fillPaint)
      } else {
        canvas.drawRect(fillRect, fillPaint)
      }
    }

    for (index in shadows.indices.reversed()) {
      val shadow = shadows[index]
      if (shadow.inset) ShadowTiles.draw(this, canvas, shadow, width, height, radiusPx, density)
    }
  }
}
