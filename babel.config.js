module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'module:@react-native/babel-preset',
      'nativewind/babel'
    ],
    plugins: [
      // zod v4 uses `export * as ns` syntax which RN's babel preset doesn't transform
      '@babel/plugin-transform-export-namespace-from',
      'react-native-reanimated/plugin', // Must be last!
    ],
  };
};
