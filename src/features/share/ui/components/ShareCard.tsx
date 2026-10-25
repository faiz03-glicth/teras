import type { Ref } from 'react';
import { Text as RNText, View, type TextStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { pictureLabel, type ShareModel } from '@/features/share/domain/shareModel';
import type { ShareLayout, ShareLook } from '@/features/share/domain/types';
import { Icon } from '@/shared/ui';

import { CARD_HEIGHT, CARD_LOOKS, CARD_WIDTH, type CardLook } from '../cardLooks';
import { ShareBody } from './ShareBody';

/** Each side of the body on the Muscles layout. Two fit the card's 300 pt of room with a gap between. */
const BODY_SIDE_WIDTH = 138;
const BADGE = 28;

/** The soft shadow a Clear picture puts under its words, ready to spread into a text style. */
function shadowOf(look: CardLook): TextStyle | undefined {
  if (!look.textShadow) return undefined;
  return {
    textShadowColor: look.textShadow.color,
    textShadowOffset: { width: 0, height: look.textShadow.offsetY },
    textShadowRadius: look.textShadow.radius,
  };
}

const SHADOWS: Record<ShareLook, TextStyle | undefined> = {
  clear: shadowOf(CARD_LOOKS.clear),
  black: shadowOf(CARD_LOOKS.black),
  parchment: shadowOf(CARD_LOOKS.parchment),
};

export interface ShareCardProps {
  model: ShareModel;
  layout: ShareLayout;
  look: ShareLook;
  /** What a capture reads: the card is the one view that becomes the picture. */
  ref?: Ref<View>;
}

/**
 * The picture that gets shared: a Story, 360 × 640, in one of three fixed looks and one of three layouts.
 * It is drawn at that size whatever it is shown at (the sheet scales it down to preview it), with text that
 * ignores the phone's font size, so the picture is the same on every phone. One card is on screen at a
 * time, and it is only turned into an image when the person taps a key.
 */
export function ShareCard({ model, layout, look: lookName, ref }: ShareCardProps) {
  const look = CARD_LOOKS[lookName];
  const shadow = SHADOWS[lookName];
  const ink = { color: look.ink };
  const ink2 = { color: look.ink2 };

  return (
    <View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={pictureLabel(model, layout)}
      importantForAccessibility="yes"
      style={[styles.card, { backgroundColor: look.fill }, lookName !== 'clear' && styles.rounded]}
      testID="share-card"
    >
      <View
        style={styles.content}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <RNText
          allowFontScaling={false}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.title, ink, shadow]}
          testID="share-card-title"
        >
          {model.title}
        </RNText>

        {layout === 'summary' && (
          <View style={styles.stats} testID="share-card-summary">
            {model.stats.map((stat) => (
              <View key={stat.unit} style={styles.stat}>
                <RNText
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                  style={[styles.statValue, ink, shadow]}
                >
                  {stat.value}
                </RNText>
                <RNText allowFontScaling={false} style={[styles.statUnit, ink2, shadow]}>
                  {stat.unit}
                </RNText>
              </View>
            ))}
          </View>
        )}

        {layout === 'lifts' && (
          <View style={styles.lifts} testID="share-card-lifts">
            {model.topLifts.map((lift) => (
              <View key={lift.exerciseId}>
                <RNText
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  style={[styles.liftBest, ink, shadow]}
                >
                  {lift.best}
                </RNText>
                <RNText allowFontScaling={false} numberOfLines={2} style={[styles.liftName, ink2, shadow]}>
                  {lift.name}
                </RNText>
              </View>
            ))}
            {model.topLifts.length === 0 && (
              <RNText allowFontScaling={false} style={[styles.liftName, ink2, shadow]}>
                No completed lifts
              </RNText>
            )}
          </View>
        )}

        {layout === 'muscles' && (
          <View style={styles.muscles} testID="share-card-muscles">
            <ShareBody highlight={model.muscles} colors={look.body} sideWidth={BODY_SIDE_WIDTH} />
          </View>
        )}

        <View style={styles.footer}>
          <View
            style={[
              styles.badge,
              { backgroundColor: look.badge.fill },
              look.badge.border !== null && { borderWidth: 1.5, borderColor: look.badge.border },
            ]}
          >
            <Icon name="check" size={16} color={look.badge.check} />
          </View>
          <RNText allowFontScaling={false} style={[styles.mark, ink, shadow]}>
            TERAS
          </RNText>
        </View>
      </View>
    </View>
  );
}

/*
 * The type of the picture: sizes in points of the 360 × 640 card (not the phone's font size), from the
 * mockup. The Inter weights are the theme's own fonts.
 */
const styles = StyleSheet.create((theme) => ({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    paddingTop: 34,
    paddingHorizontal: 30,
    paddingBottom: 28,
  },
  rounded: { borderRadius: 22 },
  // The words and the figure are one picture to a screen reader, named by the card itself.
  content: { flex: 1 },
  title: { fontFamily: theme.fonts.bold, fontSize: 56, lineHeight: 58, letterSpacing: -1.8 },
  stats: { flex: 1, justifyContent: 'center', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  statValue: {
    flexShrink: 1,
    fontFamily: theme.fonts.bold,
    fontSize: 76,
    lineHeight: 80,
    letterSpacing: -2.4,
    fontVariant: ['tabular-nums'],
  },
  statUnit: { fontFamily: theme.fonts.semibold, fontSize: 28, lineHeight: 32 },
  lifts: { flex: 1, justifyContent: 'center', gap: 28 },
  liftBest: { fontFamily: theme.fonts.bold, fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
  liftName: { fontFamily: theme.fonts.medium, fontSize: 20, lineHeight: 26 },
  muscles: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { fontFamily: theme.fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: 3 },
}));
