package expo.modules.prerenderedsurface

import android.graphics.Color
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** A raised or inset surface whose shadows are drawn from bitmaps, not blurred again on every draw. */
class PrerenderedSurfaceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PrerenderedSurface")

    View(PrerenderedSurfaceView::class) {
      Prop("fill") { view: PrerenderedSurfaceView, fill: Int? ->
        view.fill = fill ?: Color.TRANSPARENT
      }

      Prop("radius") { view: PrerenderedSurfaceView, radius: Float? ->
        view.radius = radius ?: 0f
      }

      Prop("shadows") { view: PrerenderedSurfaceView, shadows: List<SurfaceShadow>? ->
        view.shadows = shadows ?: emptyList()
      }
    }
  }
}
