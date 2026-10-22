// Turns off Android 14's automatic stylus handwriting on the app's text fields.
//
// With it on (the default from Android 14), every EditText registers a position listener: each frame it moves,
// the main thread is posted gesture-exclusion and keep-clear updates for it. The active workout has two fields
// per set, so scrolling it cost ~32 such messages a frame (v35 trace, 22 Oct 2026). Typing is unaffected;
// only starting handwriting by writing on a field with a stylus goes away.
const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

const STYLE = 'TerasEditText';

module.exports = function withoutAutoHandwriting(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    const field = {
      $: { name: STYLE, parent: 'Widget.AppCompat.EditText' },
      item: [{ $: { name: 'android:autoHandwritingEnabled', 'tools:targetApi': '34' }, _: 'false' }],
    };
    styles.resources.style = [
      ...(styles.resources.style ?? []).filter((style) => style.$.name !== STYLE),
      field,
    ];
    config.modResults = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'editTextStyle',
      value: `@style/${STYLE}`,
    });
    return config;
  });
};
