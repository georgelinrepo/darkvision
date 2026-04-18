/**
 * Config plugin: excludes legacy com.android.support libraries from all
 * Gradle configurations. Fixes duplicate class conflict between
 * @react-native-voice/voice (pulls in support-compat 28) and AndroidX.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const EXCLUSIONS = `
// Exclude legacy Android support libraries — use AndroidX equivalents only
configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'versionedparcelable'
}
`;

module.exports = function withAndroidSupportExclusions(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes('com.android.support')) {
      mod.modResults.contents += EXCLUSIONS;
    }
    return mod;
  });
};
