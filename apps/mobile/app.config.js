const { validateBuildEnvironment } = require('./scripts/build-environment.cjs')

module.exports = ({ config }) => {
  validateBuildEnvironment(process.env)
  const development = !['preview', 'production'].includes(process.env.APP_ENV)
  return {
    ...config,
    name: development ? 'SABHA Dev' : 'SABHA',
    scheme: development ? 'sabha-dev' : 'sabha',
    ios: {
      ...config.ios,
      bundleIdentifier: development ? 'com.sabha.app.dev' : 'com.sabha.app',
      appleTeamId: 'H4JB3X394X',
      infoPlist: { ...config.ios?.infoPlist, ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      ...config.android,
      package: development ? 'com.sabha.app.dev' : 'com.sabha.app',
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
    },
  }
}
