const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@react-native-async-storage/async-storage']
      }
    },
    argv
  );

  if (config.devServer) {
    config.devServer.proxy = {
      '/api/vehiclelivequeryvehiclejson': {
        target: 'https://www.solofleet.com',
        changeOrigin: true,
        secure: false,
      },
      '/TempProfile': {
        target: 'https://internalwebapp.solofleet.com',
        changeOrigin: true,
        secure: false,
      },
      '/coldstorage': {
        target: 'https://internalwebapp.solofleet.com',
        changeOrigin: true,
        secure: false,
      }
    };
  }

  return config;
};