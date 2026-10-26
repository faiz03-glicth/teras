import { Image, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { edgeRoom, type CtaFace, type CtaLook } from '@/theme';

import { usePressState } from './PressableScale';

// Both pictures are drawn once by scripts/songket-ground.js: the engraved songket as a 30 x 24 tile (a 3x
// image) that repeats over the face, and the soft drop shadow as a strip the key stretches across its width.
const FACE_TILE = require('../../../assets/songket/cta-face.png') as number;
const DROP_SHADOW = require('../../../assets/songket/cta-shadow.png') as number;

/** The strip is as wide as a full-width key plus this much blur on each side. */
const DROP_BLEED = 14;

/** A big gold key's look together with what Black dresses it in. */
export type DressedCtaLook = CtaLook & { face: CtaFace };

/** Whether a big gold key's look carries the engraved face (Black does, Parchment's plain gold does not). */
export const isDressed = (look: CtaLook): look is DressedCtaLook => look.face !== undefined;

/**
 * What a big gold button in Black wears besides its gold and its edges, all of it pictures and flat colour,
 * nothing drawn live: the songket engraved over the WHOLE face (a tile repeated edge to edge under the
 * label, which stays readable: the engraving is gold on gold), a darker band along the face's bottom, and
 * a soft drop shadow beneath the ledge. Held, the key has no ledge, band or drop, and the face grows to
 * fill the room the ledge left.
 *
 * Put it first inside a PressableScale given `shareState`. It lies inside the key's edges (its rim and the
 * ledge it stands on), so the engraving lies on the face alone, and it reads the press state: only this
 * small tree draws again as a finger goes down, never the button's content.
 */
export function GoldFace({ look }: { look: DressedCtaLook }) {
  const { held } = usePressState();
  const { face } = look;
  const room = edgeRoom(held ? look.pressed : look);
  return (
    <>
      <Image
        source={DROP_SHADOW}
        resizeMode="stretch"
        fadeDuration={0}
        accessible={false}
        importantForAccessibility="no"
        style={[styles.drop(face.drop.height), { opacity: held ? 0 : face.drop.opacity }]}
        testID="gold-face-drop"
      />
      <View
        pointerEvents="none"
        style={styles.clip(room.top, room.right, room.bottom, room.left)}
        testID="gold-face"
      >
        <Image
          source={FACE_TILE}
          resizeMode="repeat"
          fadeDuration={0}
          accessible={false}
          importantForAccessibility="no"
          style={styles.engraving}
          testID="gold-face-engraving"
        />
        {!held && (
          <View
            style={[
              styles.underside,
              { height: face.underside.height, backgroundColor: face.underside.color },
            ]}
            testID="gold-face-underside"
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Inside the key's edges, so it lies on the face alone; clipped by the face's own corners.
  clip: (top: number, right: number, bottom: number, left: number) => ({
    position: 'absolute' as const,
    top,
    right,
    bottom,
    left,
    borderRadius: Math.max(0, theme.radii.control - left),
    overflow: 'hidden' as const,
  }),
  engraving: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  underside: { position: 'absolute', right: 0, bottom: 0, left: 0 },
  // Beneath the key's box (its ledge lies inside it), stretched across its width and past it by the blur.
  drop: (height: number) => ({
    position: 'absolute' as const,
    top: '100%' as const,
    left: -DROP_BLEED,
    right: -DROP_BLEED,
    height,
    pointerEvents: 'none' as const,
  }),
}));
