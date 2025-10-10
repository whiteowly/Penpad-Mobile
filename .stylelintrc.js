module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    // Allow Tailwind's at-rules like @tailwind, @apply, @variants, etc.
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer'
        ]
      }
    ]
  }
};
