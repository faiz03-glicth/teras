package expo.modules.prerenderedsurface

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** One shadow of a CSS box-shadow list, as the JS side parsed it: lengths in dp, the colour as ARGB. */
class SurfaceShadow : Record {
  @Field val offsetX: Float = 0f
  @Field val offsetY: Float = 0f
  @Field val blur: Float = 0f
  @Field val spread: Float = 0f
  @Field val color: Int = 0
  @Field val inset: Boolean = false
}
