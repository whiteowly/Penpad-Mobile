module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            '@': './',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      'react-native-worklets/plugin',
      // Strip console logs in production for smaller build size & safer exposure
      ...(process.env.NODE_ENV === 'production' ? ['transform-remove-console'] : []),
    ],
  };
};
