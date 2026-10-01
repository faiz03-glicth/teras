module.exports = function (api) {
  const isTest = api.env('test');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Drizzle migrations are .sql files bundled as strings.
      ['inline-import', { extensions: ['.sql'] }],
      // All styled code lives under src/; route files in app/ only mount screens.
      // Jest uses test/mocks/unistyles.ts instead, so the native component rewrite is skipped there.
      ...(isTest ? [] : [['react-native-unistyles/plugin', { root: 'src' }]]),
    ],
  };
};
