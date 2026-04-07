const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const isProduction = process.env.NODE_ENV === 'production';

// Strip console/debugger calls in production bundles to reduce JS payload.
if (isProduction) {
  config.transformer.minifierConfig = {
    ...(config.transformer.minifierConfig ?? {}),
    compress: {
      ...(config.transformer.minifierConfig?.compress ?? {}),
      drop_console: true,
      drop_debugger: true,
    },
  };
}

module.exports = config;
