const ReactNativeEnv = require('react-native/jest/react-native-env');

const DEFAULT_TIME_ZONE = 'UTC';

module.exports = class MacroZoneTestEnvironment extends ReactNativeEnv {
  constructor(config, context) {
    super(config, context);
    process.env.TZ = DEFAULT_TIME_ZONE;
    this.global.__setTestTimeZone = (timeZone) => {
      process.env.TZ = timeZone;
    };
  }

  async teardown() {
    process.env.TZ = DEFAULT_TIME_ZONE;
    await super.teardown();
  }
};
