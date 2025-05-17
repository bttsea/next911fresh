// 引入 Node.js 内置模块和第三方模块
const chalk = require('chalk');
const findUp = require('find-up');
const os = require('os');
// 引入项目内部模块
const { CONFIG_FILE } = require('../lib/constants');
const { execOnce } = require('../lib/utils');

// 定义支持的目标模式
const targets = ['server', 'serverless', 'experimental-serverless-trace'];

// 默认配置文件
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
    autoPrerender: true,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  amp: {
    canonicalBase: '',
  },
  exportTrailingSlash: false,
  experimental: {
    ampBindInitData: false,
    cpus: Math.max(
      1,
      (Number(process.env.CIRCLE_NODE_TOTAL) ||
        (os.cpus() || { length: 1 }).length) - 1
    ),
    css: false,
    documentMiddleware: false,
    granularChunks: false,
    modern: false,
    profiling: false,
    publicDirectory: false,
    sprFlushToDisk: true,
  },
  future: {
    excludeDefaultMomentLocales: false,
  },
  serverRuntimeConfig: {},
  publicRuntimeConfig: {},
};

// 仅执行一次的实验性功能警告
const experimentalWarning = execOnce(() => {
  console.warn(
    chalk.yellow.bold('Warning: ') +
      chalk.bold('You have enabled experimental feature(s).')
  );
  console.warn(
    `Experimental features are not covered by semver, and may cause unexpected or broken application behavior. ` +
      `Use them at your own risk.`
  );
  console.warn();
});

/**
 * 将用户配置与默认配置合并，优先使用用户配置
 * @param {Object} userConfig - 用户提供的配置文件
 * @returns {Object} 合并后的配置文件
 */
function assignDefaults(userConfig) {
  Object.keys(userConfig).forEach((key) => {
    // 检测实验性功能并发出警告
    if (
      key === 'experimental' &&
      userConfig[key] &&
      userConfig[key] !== defaultConfig[key]
    ) {
      experimentalWarning();
    }

    // 禁止将 distDir 设置为 'public'
    if (key === 'distDir' && userConfig[key] === 'public') {
      throw new Error(
        `The 'public' directory is reserved in Next.js and can not be set as the 'distDir'. https://err.sh/zeit/next.js/can-not-output-to-public`
      );
    }

    // 合并对象类型的配置项
    const maybeObject = userConfig[key];
    if (maybeObject && maybeObject.constructor === Object) {
      userConfig[key] = {
        ...(defaultConfig[key] || {}),
        ...userConfig[key],
      };
    }
  });

  // 合并默认配置和用户配置
  return { ...defaultConfig, ...userConfig };
}

/**
 * 规范化配置文件，确保其为对象
 * @param {string} phase - 当前运行阶段
 * @param {any} config - 用户配置文件（函数或对象）
 * @returns {Object} 规范化后的配置文件
 */
function normalizeConfig(phase, config) {
  // 如果配置是函数，调用它获取配置
  if (typeof config === 'function') {
    config = config(phase, { defaultConfig });

    // 禁止返回 Promise
    if (typeof config.then === 'function') {
      throw new Error(
        '> Promise returned in next config. https://err.sh/zeit/next.js/promise-in-next-config'
      );
    }
  }
  return config;
}

/**
 * 加载 Next.js 配置文件
 * @param {string} phase - 当前运行阶段
 * @param {string} dir - 项目目录
 * @param {Object} [customConfig] - 自定义配置文件（可选）
 * @returns {Object} 最终的配置文件
 */
function loadConfig(phase, dir, customConfig) {
  // 如果提供了自定义配置，直接合并
  if (customConfig) {
    return assignDefaults({ configOrigin: 'server', ...customConfig });
  }

  // 查找配置文件（next.config.js）
  const path = findUp.sync(CONFIG_FILE, { cwd: dir });

  // 如果找到配置文件
  if (path && path.length) {
    const userConfigModule = require(path);
    // 规范化用户配置
    const userConfig = normalizeConfig(
      phase,
      userConfigModule.default || userConfigModule
    );

    // 验证 target 是否有效
    if (userConfig.target && !targets.includes(userConfig.target)) {
      throw new Error(
        `Specified target is invalid. Provided: "${
          userConfig.target
        }" should be one of ${targets.join(', ')}`
      );
    }

 

    // 验证 publicRuntimeConfig 与 serverless 模式的兼容性
    if (
      userConfig.target &&
      userConfig.target !== 'server' &&
      userConfig.publicRuntimeConfig &&
      Object.keys(userConfig.publicRuntimeConfig).length !== 0
    ) {
      throw new Error(
        'Cannot use publicRuntimeConfig with target=serverless https://err.sh/zeit/next.js/serverless-publicRuntimeConfig'
      );
    }

    // 合并用户配置和默认配置
    return assignDefaults({ configOrigin: CONFIG_FILE, ...userConfig });
  }

  // 未找到配置文件，返回默认配置
  return defaultConfig;
}

/**
 * 判断目标模式是否类似于无服务器模式
 * @param {string} target - 目标模式
 * @returns {boolean} 是否为无服务器模式
 */
function isTargetLikeServerless(target) {
  return false;
}

// 导出函数，支持 CommonJS 和 ES Module
module.exports = {
  loadConfig,
  isTargetLikeServerless,
};