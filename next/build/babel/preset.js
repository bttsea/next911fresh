// 允许使用 ES 模块语法
import { PluginItem } from '@babel/core' // 此 import 可保留用于类型提示（不会被编译执行）

// 读取当前环境变量
const env = process.env.NODE_ENV
const isProduction = env === 'production'
const isDevelopment = env === 'development'
const isTest = env === 'test'

/**
 * 将 styled-jsx 插件名称解析为绝对路径
 * @param {object|undefined} options - styled-jsx 的配置对象
 * @returns {object} 返回处理后的配置对象
 */
function styledJsxOptions(options) {
  if (!options) {
    return {}
  }

  if (!Array.isArray(options.plugins)) {
    return options
  }

  options.plugins = options.plugins.map((plugin) => {
    if (Array.isArray(plugin)) {
      const [name, opts] = plugin
      return [require.resolve(name), opts]
    }
    return require.resolve(plugin)
  })

  return options
}


















/**
 * 判断调用方是否支持静态 ES 模块
 * @param {object} caller
 * @returns {boolean}
 */
function supportsStaticESM(caller) {
  return !!(caller && caller.supportsStaticESM)
}

// 导出模块
module.exports = function (api, options = {}) {
  const supportsESM = api.caller(supportsStaticESM)

  const isServer = api.caller((caller) => !!caller && caller.isServer)
  const isModern = api.caller((caller) => !!caller && caller.isModern)

  const isLaxModern =
    isModern ||
    (options['preset-env'] &&
      options['preset-env'].targets &&
      options['preset-env'].targets.esmodules === true)

  // 构建 @babel/preset-env 的配置
  const presetEnvConfig = {
    // 'auto' 让 Babel 根据环境自动设置 modules，生产环境禁用模块转换以支持 Tree-shaking
    modules: 'auto',
    exclude: ['transform-typeof-symbol'],
    ...options['preset-env'],
  }

  // 如果是 server 或 test，未指定 target 则设置为当前 Node 版本
  if (
    (isServer || isTest) &&
    (!presetEnvConfig.targets ||
      !(typeof presetEnvConfig.targets === 'object' && 'node' in presetEnvConfig.targets))
  ) {
    presetEnvConfig.targets = {
      node: 'current',
    }
  }

  // 判断是否启用自定义的现代浏览器 preset
  const customModernPreset = isLaxModern && options['experimental-modern-preset']

  return {
    sourceType: 'unambiguous', // 自动识别 sourceType 类型



    presets: [
      // 使用自定义 preset 或默认的 @babel/preset-env
      customModernPreset || [
        require('@babel/preset-env').default,
        presetEnvConfig,
      ],
      [
        require('@babel/preset-react'),
        {
          // 开发和测试模式下启用调试插件
          development: isDevelopment || isTest,
          pragma: '__jsx', // 指定 JSX 函数名
          ...options['preset-react'],
        },
      ],
      require('@babel/preset-typescript'), // 支持 TypeScript
    ],








    plugins: [
      [
        require('./plugins/jsx-pragma'),
        {
          module: 'react',
          importAs: 'React',
          pragma: '__jsx',
          property: 'createElement',
        },
      ],
      [
        require('./plugins/optimize-hook-destructuring'),
        {
          lib: true, // 优化从 React 或 Preact 中导入的 hook
        },
      ],
      require('@babel/plugin-syntax-dynamic-import'), // 支持动态导入语法
      require('./plugins/react-loadable-plugin'), // Next.js 自定义插件
      [
        require('@babel/plugin-proposal-class-properties'),
        options['class-properties'] || {},
      ],
      [
        require('@babel/plugin-proposal-object-rest-spread'),
        {
          useBuiltIns: true, // 使用 polyfill 来处理展开运算符
        },
      ],
      [
        require('@babel/plugin-transform-runtime'),
        {
          corejs: 2,
          helpers: true,
          regenerator: true,
          useESModules: supportsESM && presetEnvConfig.modules !== 'commonjs',
          absoluteRuntime: process.versions.pnp ? __dirname : undefined,
          ...options['transform-runtime'],
        },
      ],
      [
        isTest &&
        options['styled-jsx'] &&
        options['styled-jsx']['babel-test']
          ? require('styled-jsx/babel-test')
          : require('styled-jsx/babel'),
        styledJsxOptions(options['styled-jsx']),
      ],
      

      // 在生产环境移除 React 的 prop-types
      isProduction && [
        require('babel-plugin-transform-react-remove-prop-types'),
        {
          removeImport: true,
        },
      ],
    ].filter(Boolean), // 过滤掉无效项（比如 false）
  }
}



/*
代码功能说明
作用：该文件定义了一个 Babel 预设，用于 Next.js 的代码转换，支持 JSX、TypeScript、styled-jsx、AMP 等功能。

主要功能：
根据环境（production, development, test）配置 Babel 预设和插件。

支持 ESM（模块化）、服务器端渲染、和现代浏览器目标。

配置 preset-env, preset-react, 和 preset-typescript。

添加插件，如 jsx-pragma, optimize-hook-destructuring, react-loadable-plugin, styled-jsx, 和 amp-attributes。

在生产环境移除 React 属性类型。

逻辑：
使用 supportsStaticESM 检查是否支持静态 ESM。

根据 isServer, isModern, 和 isLaxModern 配置模块化和目标。

处理 styled-jsx 插件路径，确保正确解析。

为服务器和测试环境设置当前 Node 版本为目标。

输出：返回一个包含 presets, plugins, 和 sourceType 的 Babel 配置对象


/**** */