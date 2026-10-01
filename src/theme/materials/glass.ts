import type { ColorScheme, GlassMaterial } from '../types';

/**
 * Liquid Glass material values: the app's own glass (translucent surfaces over a glowing backdrop), drawn
 * with standard views, so it looks the same on iOS and Android. Values from the approved prototype.
 */
export const glassMaterials: Record<ColorScheme, GlassMaterial> = {
  light: {
    backdrop:
      'radial-gradient(110% 55% at 0% 0%, #D3EEDB 0%, rgba(211,238,219,0) 60%), ' +
      'radial-gradient(80% 45% at 100% 28%, #D8E8F4 0%, rgba(216,232,244,0) 62%), ' +
      'radial-gradient(100% 55% at 25% 100%, #E4F2D6 0%, rgba(228,242,214,0) 62%)',
    card: {
      background: 'rgba(255,255,255,0.56)',
      edge: 'rgba(255,255,255,0.8)',
      shadow:
        'inset 0px 1px 0px rgba(255,255,255,0.95), inset 0px 0px 0px 0.5px rgba(255,255,255,0.6), ' +
        '0px 10px 30px -12px rgba(20,48,32,0.10)',
    },
    accentShadow: 'inset 0px 1px 0px rgba(255,255,255,0.35), 0px 8px 20px -8px rgba(30,154,82,0.55)',
    strong: 'rgba(255,255,255,0.78)',
    tint: 'rgba(16,40,26,0.06)',
    tabBar: {
      tint: 'rgba(247,250,247,0.72)',
      blur: 40,
      highlight: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%)',
      edgeLight: 'inset 0px 1px 0px rgba(255,255,255,0.85), inset 0px 0px 0px 0.5px rgba(255,255,255,0.6)',
      shadow: '0px 12px 30px -10px rgba(20,48,32,0.22)',
    },
    fab: {
      highlight: 'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 55%)',
      ring: 'rgba(255,255,255,0.85)',
      shadow: 'inset 0px -3px 8px rgba(0,0,0,0.16), 0px 8px 18px -6px rgba(30,154,82,0.6)',
    },
    // Opaque: the liquid is drawn from overlapping shapes, so a translucent fill would show darker seams.
    // About rgba(30,154,82,0.13) over the frosted bar.
    pill: '#DBEEE2',
    sheet: { tint: 'rgba(248,251,248,0.80)', blur: 30 },
    // Nearly opaque: there's no live blur behind toasts (it costs every frame), so a more see-through
    // toast would let the screen's text show through its own.
    toast: { background: 'rgba(16,23,19,0.95)', foreground: '#F6F7F5', blur: 30 },
    canvasBase: '#F1F5F1',
    heatEmpty: 'rgba(16,40,26,0.075)',
  },
  dark: {
    backdrop:
      'radial-gradient(110% 55% at 0% 0%, #10301F 0%, rgba(16,48,31,0) 60%), ' +
      'radial-gradient(80% 45% at 100% 30%, #0F2234 0%, rgba(15,34,52,0) 62%), ' +
      'radial-gradient(100% 55% at 25% 100%, #18280F 0%, rgba(24,40,15,0) 62%)',
    card: {
      background: 'rgba(34,42,37,0.5)',
      edge: 'rgba(255,255,255,0.12)',
      shadow:
        'inset 0px 1px 0px rgba(255,255,255,0.14), inset 0px 0px 0px 0.5px rgba(255,255,255,0.08), ' +
        '0px 10px 30px -12px rgba(0,0,0,0.35)',
    },
    // The brand green is the same in both schemes (see brand.ts), so its glow is too.
    accentShadow: 'inset 0px 1px 0px rgba(255,255,255,0.4), 0px 8px 22px -8px rgba(30,154,82,0.45)',
    strong: 'rgba(48,58,52,0.70)',
    tint: 'rgba(255,255,255,0.07)',
    tabBar: {
      tint: 'rgba(20,26,22,0.72)',
      blur: 40,
      highlight: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 45%)',
      edgeLight: 'inset 0px 1px 0px rgba(255,255,255,0.14), inset 0px 0px 0px 0.5px rgba(255,255,255,0.08)',
      shadow: '0px 12px 30px -10px rgba(0,0,0,0.6)',
    },
    fab: {
      highlight: 'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0) 55%)',
      ring: 'rgba(20,26,22,0.9)',
      shadow: 'inset 0px -3px 8px rgba(0,0,0,0.2), 0px 8px 18px -6px rgba(30,154,82,0.5)',
    },
    // Equals rgba(61,214,140,0.18) over the tab bar (opaque, see light).
    pill: '#1B3C2B',
    sheet: { tint: 'rgba(24,30,26,0.82)', blur: 30 },
    toast: { background: 'rgba(237,242,238,0.96)', foreground: '#0D100E', blur: 30 },
    canvasBase: '#060907',
    heatEmpty: 'rgba(255,255,255,0.08)',
  },
};
