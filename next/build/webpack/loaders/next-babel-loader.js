// 导入 string-hash 模块用于生成哈希
import hash from 'string-hash';
// 导入 path 模块的 join 和 basename 函数
import { join, basename } from 'path';
// 导入 babel-loader
import babelLoader from 'babel-loader';

// 导入 Next.js 的 Babel 预设
const nextBabelPreset = require('../../babel/preset');

// 缓存键，用于失效缓存
const cacheKey = 'babel-cache-' + 'd' + '-';

/**
 * 获取现代化（Modern）Babel 配置
 * @param {Object} babelOptions - Babel 配置选项
 * @returns {Object} 现代化的 Babel 配置
 */
function getModernOptions(babelOptions = {}) {
  // 克隆 preset-env 配置
  const presetEnvOptions = Object.assign({}, babelOptions['preset-env']);
  // 克隆 transform-runtime 配置，禁用 regenerator
  const transformRuntimeOptions = Object.assign(
    {},
    babelOptions['transform-runtime'],
    { regenerator: false }
  );

  // 设置现代化目标为支持 ES Modules 的浏览器
  presetEnvOptions.targets = {
    esmodules: true,
  };
  // 排除特定转换，防止意外包含
  presetEnvOptions.exclude = [
    ...(presetEnvOptions.exclude || []),
    'transform-regenerator',
    'transform-async-to-generator',
  ];

  return {
    ...babelOptions,
    'preset-env': presetEnvOptions,
    'transform-runtime': transformRuntimeOptions,
  };
}

/**
 * 创建现代化 Babel 预设
 * @param {Object} presetOptions - 预设选项
 * @returns {Function} 现代化的 Babel 预设函数
 */
function nextBabelPresetModern(presetOptions) {
  return (context) => nextBabelPreset(context, getModernOptions(presetOptions));
}

// 自定义 Babel Loader
export default babelLoader.custom((babel) => {
  // 创建默认 Babel 预设
  const presetItem = babel.createConfigItem(nextBabelPreset, {
    type: 'preset',
  });
  // 创建 CommonJS 插件（自定义）
  const applyCommonJs = babel.createConfigItem(
    require('../../babel/plugins/commonjs'),
    { type: 'plugin' }
  );
  // 创建 CommonJS 转换插件（官方）
  const commonJsItem = babel.createConfigItem(
    require('@babel/plugin-transform-modules-commonjs'),
    { type: 'plugin' }
  );

  // 跟踪外部 Babel 配置文件
  const configs = new Set();

  return {
    /**
     * 自定义 Loader 选项
     * @param {Object} opts - Loader 选项
     * @returns {Object} 分离的 Loader 和自定义选项
     */
    customOptions(opts) {
      // 提取自定义选项
      const custom = {
        isServer: opts.isServer,
        isModern: opts.isModern,
        pagesDir: opts.pagesDir,
        hasModern: opts.hasModern,
      };
      // 创建虚拟文件名用于配置
      const filename = join(opts.cwd, 'noop.js');
      // 构建 Loader 配置
      const loader = Object.assign(
        opts.cache
          ? {
              cacheCompression: false,
              cacheDirectory: join(opts.distDir, 'cache', 'next-babel-loader'),
              cacheIdentifier:
                cacheKey +
                (opts.isServer ? '-server' : '') +
                (opts.isModern ? '-modern' : '') +
                (opts.hasModern ? '-has-modern' : '') +
                JSON.stringify(
                  babel.loadPartialConfig({
                    filename,
                    cwd: opts.cwd,
                    sourceFileName: filename,
                  }).options
                ),
            }
          : {
              cacheDirectory: false,
            },
        opts
      );

      // 删除自定义选项，保留 Loader 配置
      delete loader.isServer;
      delete loader.cache;
      delete loader.distDir;
      delete loader.isModern;
      delete loader.hasModern;
      delete loader.pagesDir;
      return { loader, custom };
    },

    /**
     * 配置 Babel 选项
     * @param {Object} cfg - 当前 Babel 配置
     * @param {Object} param - 包含源代码和自定义选项
     * @returns {Object} 修改后的 Babel 配置
     */
    config(cfg, { source, customOptions: { isServer, isModern, hasModern, pagesDir } }) {
      // 获取当前文件路径
      const filename = this.resourcePath;
      // 克隆当前配置
      const options = Object.assign({}, cfg.options);
      // 检查是否为 pages 目录下的文件
      const isPageFile = filename.startsWith(pagesDir);

      // 处理外部 Babel 配置文件
      if (cfg.hasFilesystemConfig()) {
        for (const file of [cfg.babelrc, cfg.config]) {
          if (file && !isServer && !configs.has(file)) {
            configs.add(file);
            console.log(`> 使用外部 Babel 配置`);
            console.log(`> 位置: "${file}"`);
          }
        }
      } else {
        // 如果没有外部配置，添加默认预设
        options.presets = [...(options.presets || []), presetItem];
      }

      // 设置调用者信息
      options.caller = options.caller || {};
      options.caller.isServer = isServer;
      options.caller.isModern = isModern;

      // 初始化插件列表
      options.plugins = options.plugins || [];

      // 为客户端的页面文件添加 next-page-config 插件
      if (!isServer && isPageFile) {
        const pageConfigPlugin = babel.createConfigItem(
          [require('../../babel/plugins/next-page-config')],
          { type: 'plugin' }
        );
        options.plugins.push(pageConfigPlugin);
      }

      // 为服务端的 next/data 文件添加 next-data 插件
      if (isServer && source.indexOf('next/data') !== -1) {
        const nextDataPlugin = babel.createConfigItem(
          [
            require('../../babel/plugins/next-data'),
            { key: basename(filename) + '-' + hash(filename) },
          ],
          { type: 'plugin' }
        );
        options.plugins.push(nextDataPlugin);
      }

      // 处理现代化配置
      if (isModern) {
        const nextPreset = options.presets.find(
          (preset) => preset && preset.value === nextBabelPreset
        ) || { options: {} };

        const additionalPresets = options.presets.filter(
          (preset) => preset !== nextPreset
        );

        const presetItemModern = babel.createConfigItem(
          nextBabelPresetModern(nextPreset.options),
          { type: 'plugin' }
        );

        options.presets = [...additionalPresets, presetItemModern];
      }

      // 如果包含 module.exports，添加 CommonJS 转换
      if (!hasModern && source.indexOf('module.exports') !== -1) {
        options.plugins.push(applyCommonJs);
      }

      // 添加 transform-define 插件，定义 typeof window
      options.plugins.push([
        require.resolve('babel-plugin-transform-define'),
        { 'typeof window': isServer ? 'undefined' : 'object' },
        'next-js-transform-define-instance',
      ]);

      // 为特定 Next.js 模块添加 CommonJS 转换
      options.overrides = [
        ...(options.overrides || []),
        {
          test: [
            /next[\\/]dist[\\/]next-server[\\/]lib/,
            /next[\\/]dist[\\/]client/,
            /next[\\/]dist[\\/]pages/,
          ],
          plugins: [commonJsItem],
        },
      ];

      return options;
    },
  };
});


/*
代码功能说明
作用：
这是一个自定义 Webpack Babel Loader，用于 Next.js 9.1.1 的构建流程，动态配置 Babel 预设和插件。

它处理客户端和服务端代码，支持现代化（Modern）浏览器目标、SPR（静态页面再生）、动态导入和 CommonJS 模块。

用途：
在 Next.js 9.1.1 的构建流程中，处理所有 JavaScript 文件的 Babel 转译。
与 H:\next911fresh\next\build\webpack-config.js 的 module.rules 配合，应用到 .js 文件。
支持 SPR（unstable_getStaticProps）、动态导入（react-loadable）和现代化优化。












Webpack 5 兼容性：
如果升级到 Webpack 5（见前文讨论），需更新依赖：
json

"loader-utils": "^2.0.4",
"babel-loader": "^8.3.0"

测试 next-babel-loader 的缓存（cacheDirectory）和插件添加逻辑。

更新 H:\next911fresh\next\build\webpack-config.js：
javascript

module.rules: [
  {
    test: /\.js$/,
    use: {
      loader: 'next-babel-loader',
      options: {   },
    },
  },
]







/**** */