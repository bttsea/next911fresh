"use strict";

exports.__esModule = true;
exports.default = loadConfig;
exports.isTargetLikeServerless = isTargetLikeServerless;
var _chalk = _interopRequireDefault(require("chalk"));
var _findUp = _interopRequireDefault(require("find-up"));
var _os = _interopRequireDefault(require("os"));
var _constants = require("../lib/constants");
var _utils = require("../lib/utils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const targets = ['server', 'serverless', 'experimental-serverless-trace'];
const defaultConfig = {
  env: [],
  webpack: null,
  webpackDevMiddleware: null,
  distDir: '.next',
  assetPrefix: '',
  configOrigin: 'default',
  useFileSystemPublicRoutes: true,
  generateBuildId: () => null,
  generateEtags: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  target: 'server',
  poweredByHeader: true,
  compress: true,
  devIndicators: {
    buildActivity: true,
    autoPrerender: true
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2
  },
  amp: {
    canonicalBase: ''
  },
  exportTrailingSlash: false,
  experimental: {
    ampBindInitData: false,
    cpus: Math.max(1, (Number(process.env.CIRCLE_NODE_TOTAL) || (_os.default.cpus() || {
      length: 1
    }).length) - 1),
    css: false,
    documentMiddleware: false,
    granularChunks: false,
    modern: false,
    profiling: false,
    publicDirectory: false,
    sprFlushToDisk: true
  },
  future: {
    excludeDefaultMomentLocales: false
  },
  serverRuntimeConfig: {},
  publicRuntimeConfig: {}
};
const experimentalWarning = (0, _utils.execOnce)(() => {
  console.warn(_chalk.default.yellow.bold('Warning: ') + _chalk.default.bold('You have enabled experimental feature(s).'));
  console.warn(`Experimental features are not covered by semver, and may cause unexpected or broken application behavior. ` + `Use them at your own risk.`);
  console.warn();
});
function assignDefaults(userConfig) {
  Object.keys(userConfig).forEach(key => {
    if (key === 'experimental' && userConfig[key] && userConfig[key] !== defaultConfig[key]) {
      experimentalWarning();
    }
    if (key === 'distDir' && userConfig[key] === 'public') {
      throw new Error(`The 'public' directory is reserved in Next.js and can not be set as the 'distDir'. https://err.sh/zeit/next.js/can-not-output-to-public`);
    }
    const maybeObject = userConfig[key];
    if (!!maybeObject && maybeObject.constructor === Object) {
      userConfig[key] = {
        ...(defaultConfig[key] || {}),
        ...userConfig[key]
      };
    }
  });
  return {
    ...defaultConfig,
    ...userConfig
  };
}
function normalizeConfig(phase, config) {
  if (typeof config === 'function') {
    config = config(phase, {
      defaultConfig
    });
    if (typeof config.then === 'function') {
      throw new Error('> Promise returned in next config. https://err.sh/zeit/next.js/promise-in-next-config');
    }
  }
  return config;
}
function loadConfig(phase, dir, customConfig) {
  if (customConfig) {
    return assignDefaults({
      configOrigin: 'server',
      ...customConfig
    });
  }
  const path = _findUp.default.sync(_constants.CONFIG_FILE, {
    cwd: dir
  });

  // If config file was found
  if (path && path.length) {
    const userConfigModule = require(path);
    const userConfig = normalizeConfig(phase, userConfigModule.default || userConfigModule);
    if (userConfig.target && !targets.includes(userConfig.target)) {
      throw new Error(`Specified target is invalid. Provided: "${userConfig.target}" should be one of ${targets.join(', ')}`);
    }
    if (userConfig.amp && userConfig.amp.canonicalBase) {
      const {
        canonicalBase
      } = userConfig.amp || {};
      userConfig.amp = userConfig.amp || {};
      userConfig.amp.canonicalBase = (canonicalBase.endsWith('/') ? canonicalBase.slice(0, -1) : canonicalBase) || '';
    }
    if (userConfig.target && userConfig.target !== 'server' && userConfig.publicRuntimeConfig && Object.keys(userConfig.publicRuntimeConfig).length !== 0) {
      // TODO: change error message tone to "Only compatible with [fat] server mode"
      throw new Error('Cannot use publicRuntimeConfig with target=serverless https://err.sh/zeit/next.js/serverless-publicRuntimeConfig');
    }
    return assignDefaults({
      configOrigin: _constants.CONFIG_FILE,
      ...userConfig
    });
  }
  return defaultConfig;
}
function isTargetLikeServerless(target) {
  const isServerless = target === 'serverless';
  const isServerlessTrace = target === 'experimental-serverless-trace';
  return isServerless || isServerlessTrace;
}