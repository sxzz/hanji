// @ts-check

/** @type {import('svgo').Config} */
const config = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        // Keep the favicon's dark-mode media query instead of baking its
        // light-mode declarations into presentation attributes.
        overrides: { inlineStyles: false },
      },
    },
  ],
}

export default config
