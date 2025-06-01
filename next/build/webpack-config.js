// 导入颜色高亮库，用于终端输出  
import chalk from 'chalk'
// 导入加密模块，用于生成哈希
import crypto from 'crypto'
// 导入 ForkTsCheckerWebpackPlugin，用于 TypeScript 类型检查
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
// 导入 MiniCssExtractPlugin，用于提取 CSS 文件
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
// 导入路径处理模块
import path from 'path'
// 导入 PnpWebpackPlugin，支持 Yarn PnP
import PnpWebpackPlugin from 'pnp-webpack-plugin'
// 导入 Webpack 核心模块
import webpack from 'webpack'

// 导入常量
import {
  DOT_NEXT_ALIAS,
  NEXT_PROJECT_ROOT,
  NEXT_PROJECT_ROOT_DIST_CLIENT,
  PAGES_DIR_ALIAS,
} from '../lib/constants'
// 导入文件存在性检查工具
import { fileExists } from '../lib/file-exists'
// 导入模块解析工具
import { resolveRequest } from '../lib/resolve-request'
// 导入服务器端常量
import {
  CLIENT_STATIC_FILES_RUNTIME_MAIN,
  CLIENT_STATIC_FILES_RUNTIME_WEBPACK,
  REACT_LOADABLE_MANIFEST,
  SERVER_DIRECTORY, 
} from '../next-server/lib/constants'
// 导入页面文件查找工具
import { findPageFile } from '../server/lib/find-page-file'
// 导入 Webpack 插件
import BuildManifestPlugin from './webpack/plugins/build-manifest-plugin'
import { ChunkGraphPlugin } from './webpack/plugins/chunk-graph-plugin'
import ChunkNamesPlugin from './webpack/plugins/chunk-names-plugin'
import { CssMinimizerPlugin } from './webpack/plugins/css-minimizer-plugin'
import { importAutoDllPlugin } from './webpack/plugins/dll-import'
import { DropClientPage } from './webpack/plugins/next-drop-client-page-plugin'
import NextEsmPlugin from './webpack/plugins/next-esm-plugin'
import NextJsSsrImportPlugin from './webpack/plugins/nextjs-ssr-import'
import NextJsSSRModuleCachePlugin from './webpack/plugins/nextjs-ssr-module-cache'
import PagesManifestPlugin from './webpack/plugins/pages-manifest-plugin'
import { ProfilingPlugin } from './webpack/plugins/profiling-plugin'
import { ReactLoadablePlugin } from './webpack/plugins/react-loadable-plugin'
 
import { TerserPlugin } from './webpack/plugins/terser-webpack-plugin/src/index'

/**
 * 转义路径变量，防止 Webpack 解析错误
 * @param {*} value 输入值
 * @returns {*} 转义后的值
 */
const escapePathVariables = (value) => {
  return typeof value === 'string'
    ? value.replace(/\[(\\*[\w:]+\\*)\]/gi, '[\\$1\\]')
    : value
}

/**
 * 获取基础 Webpack 配置
 * @param {string} dir 项目根目录
 * @param {Object} options 配置选项
 * @returns {Promise<Object>} Webpack 配置对象
 */
export default async function getBaseWebpackConfig(
  dir,
  {
    buildId,
    config,
    dev = false,
    isServer = false,
    pagesDir,
    tracer,
    target = 'server',
    entrypoints,
  }
) {
  // 输出目录
  const distDir = path.join(dir, config.distDir)
  // 默认加载器配置
  const defaultLoaders = {
    babel: {
      loader: 'next-babel-loader',
      options: {
        isServer,
        hasModern: !!config.experimental.modern,
        distDir,
        pagesDir,
        cwd: dir,
        cache: true,
      },
    },
    hotSelfAccept: {
      loader: 'noop-loader',
    },
  }

  // 支持 NODE_PATH 环境变量
  const nodePathList = (process.env.NODE_PATH || '')
    .split(process.platform === 'win32' ? ';' : ':')
    .filter(p => !!p)
 

  // 设置输出目录
  const outputDir =   SERVER_DIRECTORY
  const outputPath = path.join(distDir, isServer ? outputDir : '')
  // 页面总数
  const totalPages = Object.keys(entrypoints).length
  // 客户端入口
  const clientEntries = !isServer
    ? {
        'main.js': [],
        [CLIENT_STATIC_FILES_RUNTIME_MAIN]:
          `.${path.sep}` +
          path.relative(
            dir,
            path.join(
              NEXT_PROJECT_ROOT_DIST_CLIENT,
              dev ? `next-dev.js` : 'next.js'
            )
          ),
      }
    : undefined

  // 检查 TypeScript 配置
  let typeScriptPath
  try {
    typeScriptPath = resolveRequest('typescript', `${dir}/`)
  } catch (_) {}
  const tsConfigPath = path.join(dir, 'tsconfig.json')
  const useTypeScript = Boolean(
    typeScriptPath && (await fileExists(tsConfigPath))
  )

  // 模块解析配置
  const resolveConfig = {
    extensions: isServer
      ? [
          ...(useTypeScript ? ['.tsx', '.ts'] : []),
          '.js',
          '.mjs',
          '.jsx',
          '.json',
          '.wasm',
        ]
      : [
          ...(useTypeScript ? ['.tsx', '.ts'] : []),
          '.mjs',
          '.js',
          '.jsx',
          '.json',
          '.wasm',
        ],
    modules: ['node_modules', ...nodePathList],
    alias: {
      'next/head': 'next/dist/next-server/lib/head.js',
      'next/router': 'next/dist/client/router.js',
      'next/config': 'next/dist/next-server/lib/runtime-config.js',
      'next/dynamic': 'next/dist/next-server/lib/dynamic.js',
      next: NEXT_PROJECT_ROOT,
      [PAGES_DIR_ALIAS]: pagesDir,
      [DOT_NEXT_ALIAS]: distDir,
    },
    mainFields: isServer ? ['main', 'module'] : ['browser', 'module', 'main'],
    plugins: [PnpWebpackPlugin],
  }

  // Webpack 模式
  const webpackMode = dev ? 'development' : 'production'

  // Terser 插件配置
  const terserPluginConfig = {
    parallel: true,
    sourceMap: false,
    cache: true,
    cpus: config.experimental.cpus,
    distDir: distDir,
  }
  const terserOptions = {
    parse: { ecma: 8 },
    compress: {
      ecma: 5,
      warnings: false,
      comparisons: false,
      inline: 2,
    },
    mangle: { safari10: true },
    output: {
      ecma: 5,
      safari10: true,
      comments: false,
      ascii_only: true,
    },
  }

  // 开发工具（Source Map）
  const devtool = dev ? 'cheap-module-source-map' : false

  // 分块配置
  const splitChunksConfigs = {
    dev: {
      cacheGroups: {
        default: false,
        vendors: false,
      },
    },
    prod: {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: totalPages > 2 ? totalPages * 0.5 : 2,
        },
        react: {
          name: 'commons',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
        },
      },
    },
    prodGranular: {
      chunks: 'initial',
      cacheGroups: {
        default: false,
        vendors: false,
        framework: {
          chunks: 'all',
          name: 'framework',
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types)[\\/]/,
          priority: 40,
        },
        lib: {
          test(module) {
            return (
              module.size() > 160000 &&
              /node_modules[/\\]/.test(module.identifier())
            )
          },
          name(module) {
            return crypto
              .createHash('sha1')
              .update(module.libIdent({ context: dir }))
              .digest('hex')
              .substring(0, 8)
          },
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true,
        },
        commons: {
          name: 'commons',
          minChunks: totalPages,
          priority: 20,
        },
        shared: {
          name(module, chunks) {
            return crypto
              .createHash('sha1')
              .update(
                chunks.reduce((acc, chunk) => acc + chunk.name, '')
              )
              .digest('hex')
          },
          priority: 10,
          minChunks: 2,
          reuseExistingChunk: true,
        },
      },
      maxInitialRequests: 20,
    },
  }

  // 选择分块配置
  let splitChunksConfig = dev
    ? splitChunksConfigs.dev
    : config.experimental.granularChunks
    ? splitChunksConfigs.prodGranular
    : splitChunksConfigs.prod

  // 跨域配置
  const crossOrigin =
    !config.crossOrigin && config.experimental.modern
      ? 'anonymous'
      : config.crossOrigin

  // 查找自定义 _app 文件
  let customAppFile = config.experimental.css
    ? await findPageFile(path.join(dir, 'pages'), '/_app', config.pageExtensions)
    : null
  if (customAppFile) {
    customAppFile = path.resolve(path.join(dir, 'pages', customAppFile))
  }















  // Webpack 配置对象
  let webpackConfig = {
    devtool,
    mode: webpackMode,
    name: isServer ? 'server' : 'client',
    target: isServer ? 'node' : 'web',
    externals: !isServer
      ? undefined
      :   [
          (context, request, callback) => {
            const notExternalModules = [
              'next/app',
              'next/document',
              'next/link',
              'next/error',
              'string-hash',
              'next/constants',
            ]
            if (notExternalModules.includes(request)) {
              return callback()
            }
            let res
            try {
              res = resolveRequest(request, `${context}/`)
            } catch (err) {
              if (
                request === 'react-ssr-prepass' &&
                !config.experimental.ampBindInitData &&
                context.replace(/\\/g, '/').includes('next-server/server')
              ) {
                return callback(undefined, `commonjs ${request}`)
              }
              return callback()
            }
            if (!res) return callback()
            let baseRes
            try {
              baseRes = resolveRequest(request, `${dir}/`)
            } catch (err) {}
            if (baseRes !== res) return callback()
            if (
              !res.match(/next[/\\]dist[/\\]next-server[/\\]/) &&
              (res.match(/next[/\\]dist[/\\]/) ||
                res.match(/node_modules[/\\]@babel[/\\]runtime[/\\]/) ||
                res.match(/node_modules[/\\]@babel[/\\]runtime-corejs2[/\\]/))
            ) {
              return callback()
            }
            if (
              res.match(/node_modules[/\\]webpack/) ||
              res.match(/node_modules[/\\]css-loader/)
            ) {
              return callback()
            }
            if (res.match(/node_modules[/\\].*\.js$/)) {
              return callback(undefined, `commonjs ${request}`)
            }
            callback()
          },
        ]
       ,











































 

    optimization: {
      checkWasmTypes: false,
      nodeEnv: false,
      splitChunks: isServer ? false : splitChunksConfig,
      runtimeChunk: isServer
        ? undefined
        : { name: CLIENT_STATIC_FILES_RUNTIME_WEBPACK },
      minimize: !(dev || isServer),
      minimizer: [
        new TerserPlugin({ ...terserPluginConfig, terserOptions }),
        config.experimental.css &&
          new CssMinimizerPlugin({
            postcssOptions: {
              map: { inline: false, annotation: false },
            },
          }),
      ].filter(Boolean),
    },
    recordsPath: path.join(outputPath, 'records.json'),
    context: dir,
    entry: async () => ({
      ...(clientEntries || {}),
      ...entrypoints,
    }),
    output: {
      path: outputPath,
      filename: ({ chunk }) => {
        if (
          !dev &&
          (chunk.name === CLIENT_STATIC_FILES_RUNTIME_MAIN ||
            chunk.name === CLIENT_STATIC_FILES_RUNTIME_WEBPACK)
        ) {
          return chunk.name.replace(/\.js$/, '-[contenthash].js')
        }
        return '[name]'
      },
      libraryTarget: isServer ? 'commonjs2' : 'var',
      hotUpdateChunkFilename: 'static/webpack/[id].[hash].hot-update.js',
      hotUpdateMainFilename: 'static/webpack/[hash].hot-update.json',
      chunkFilename: isServer
        ? `${dev ? '[name]' : '[name].[contenthash]'}.js`
        : `static/chunks/${dev ? '[name]' : '[name].[contenthash]'}.js`,
      strictModuleExceptionHandling: true,
      crossOriginLoading: crossOrigin,
      futureEmitAssets: !dev,
      webassemblyModuleFilename: 'static/wasm/[modulehash].wasm',
    },
    performance: false,
    resolve: resolveConfig,
    resolveLoader: {
      alias: [
        'emit-file-loader',
        'error-loader',
        'next-babel-loader',
        'next-client-pages-loader',
        'next-data-loader', 
        'noop-loader',
      ].reduce((alias, loader) => {
        alias[loader] = path.join(__dirname, 'webpack', 'loaders', loader)
        return alias
      }, {}),
      modules: ['node_modules', ...nodePathList],
      plugins: [PnpWebpackPlugin],
    },
    module: {
      strictExportPresence: true,
      rules: [
        config.experimental.ampBindInitData &&
          !isServer && {
            test: /\.(tsx|ts|js|mjs|jsx)$/,
            include: [path.join(dir, 'data')],
            use: 'next-data-loader',
          },
        {
          test: /\.(tsx|ts|js|mjs|jsx)$/,
          include: [
            dir,
            /next[\\/]dist[\\/]next-server[\\/]lib/,
            /next[\\/]dist[\\/]client/,
            /next[\\/]dist[\\/]pages/,
            /[\\/](strip-ansi|ansi-regex)[\\/]/,
          ],
          exclude: (path) => {
            if (
              /next[\\/]dist[\\/]next-server[\\/]lib/.test(path) ||
              /next[\\/]dist[\\/]client/.test(path) ||
              /next[\\/]dist[\\/]pages/.test(path) ||
              /[\\/](strip-ansi|ansi-regex)[\\/]/.test(path)
            ) {
              return false
            }
            return /node_modules/.test(path)
          },
          use: defaultLoaders.babel,
        },
        config.experimental.css &&
          {
            oneOf: [
              {
                test: /\.css$/,
                issuer: { include: [customAppFile].filter(Boolean) },
                use: isServer
                  ? require.resolve('ignore-loader')
                  : [
                      dev && {
                        loader: require.resolve('style-loader'),
                        options: {
                          insert: function(element) {
                            var anchorElement = document.querySelector(
                              '#__next_css__DO_NOT_USE__'
                            )
                            var parentNode = anchorElement.parentNode
                            parentNode.insertBefore(element, anchorElement)
                            ;(self.requestAnimationFrame || setTimeout)(function() {
                              for (
                                var x = document.querySelectorAll('[data-next-hide-fouc]'),
                                  i = x.length;
                                i--;
                              ) {
                                x[i].parentNode.removeChild(x[i])
                              }
                            })
                          },
                        },
                      },
                      !dev && {
                        loader: MiniCssExtractPlugin.loader,
                        options: {},
                      },
                      {
                        loader: require.resolve('css-loader'),
                        options: { importLoaders: 1, sourceMap: true },
                      },
                      {
                        loader: require.resolve('postcss-loader'),
                        options: {
                          ident: 'postcss',
                          plugins: () => [
                            require('postcss-flexbugs-fixes'),
                            require('postcss-preset-env')({
                              autoprefixer: { flexbox: 'no-2009' },
                              stage: 3,
                            }),
                          ],
                          sourceMap: true,
                        },
                      },
                    ].filter(Boolean),
                sideEffects: true,
              },
              {
                test: /\.css$/,
                use: isServer
                  ? require.resolve('ignore-loader')
                  : {
                      loader: 'error-loader',
                      options: {
                        reason:
                          `全局 CSS ${chalk.bold('不能')} 从 ${chalk.bold('Custom <App>')} 以外的文件导入。请将所有全局 CSS 导入移至 ${chalk.cyan(
                            customAppFile
                              ? path.relative(dir, customAppFile)
                              : 'pages/_app.js'
                          )}.\n` +
                          `了解更多：https://err.sh/next.js/global-css`,
                      },
                    },
              },
            ],
          },
        config.experimental.css &&
          {
            loader: require.resolve('file-loader'),
            issuer: { test: /\.css$/ },
            exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
            options: { name: 'static/media/[name].[hash].[ext]' },
          },
      ].filter(Boolean),
    },

























































































    plugins: [
      new ChunkNamesPlugin(),
      new webpack.DefinePlugin({
        ...Object.keys(config.env).reduce((acc, key) => {
          if (/^(?:NODE_.+)|^(?:__.+)$/i.test(key)) {
            throw new Error(
              `next.config.js 中 "env" 下的键 "${key}" 不允许。详情见：https://err.sh/zeit/next.js/env-key-not-allowed`
            )
          }
          return { ...acc, [`process.env.${key}`]: JSON.stringify(config.env[key]) }
        }, {}),
        'process.env.NODE_ENV': JSON.stringify(webpackMode),
        'process.crossOrigin': JSON.stringify(crossOrigin),
        'process.browser': JSON.stringify(!isServer),
        'process.env.__NEXT_TEST_MODE': JSON.stringify(process.env.__NEXT_TEST_MODE),
        ...(dev && !isServer
          ? { 'process.env.__NEXT_DIST_DIR': JSON.stringify(distDir) }
          : {}),
        'process.env.__NEXT_EXPORT_TRAILING_SLASH': JSON.stringify(config.exportTrailingSlash),
        'process.env.__NEXT_MODERN_BUILD': JSON.stringify(config.experimental.modern && !dev),
        'process.env.__NEXT_GRANULAR_CHUNKS': JSON.stringify(config.experimental.granularChunks && !dev),
        'process.env.__NEXT_BUILD_INDICATOR': JSON.stringify(config.devIndicators.buildActivity),
        'process.env.__NEXT_PRERENDER_INDICATOR': JSON.stringify(config.devIndicators.autoPrerender),
        ...(isServer ? { 'global.GENTLY': JSON.stringify(false) } : undefined),
      }),
      !isServer && new ReactLoadablePlugin({ filename: REACT_LOADABLE_MANIFEST }),
      !isServer && new DropClientPage(),
      new ChunkGraphPlugin(buildId, { dir, distDir, isServer }),
      config.future.excludeDefaultMomentLocales &&
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      ...(dev
        ? (() => {
            const { NextJsRequireCacheHotReloader } = require('./webpack/plugins/nextjs-require-cache-hot-reloader')
            const { UnlinkRemovedPagesPlugin } = require('./webpack/plugins/unlink-removed-pages-plugin')
            const devPlugins = [
              new UnlinkRemovedPagesPlugin(),
              new webpack.NoEmitOnErrorsPlugin(),
              new NextJsRequireCacheHotReloader(),
            ]
            if (!isServer) {
              const AutoDllPlugin = importAutoDllPlugin({ distDir })
              devPlugins.push(
                new AutoDllPlugin({
                  filename: '[name]_[hash].js',
                  path: './static/development/dll',
                  context: dir,
                  entry: { dll: ['react', 'react-dom'] },
                  config: { devtool, mode: webpackMode, resolve: resolveConfig },
                }),
                new webpack.HotModuleReplacementPlugin()
              )
            }
            return devPlugins
          })()
        : []),
      !dev && new webpack.HashedModuleIdsPlugin(),
      !dev &&
        new webpack.IgnorePlugin({
          checkResource: (resource) => /react-is/.test(resource),
          checkContext: (context) =>
            /next-server[\\/]dist[\\/]/.test(context) || /next[\\/]dist[\\/]/.test(context),
        }),

























































 
      isServer && new PagesManifestPlugin(false),
      target === 'server' && isServer && new NextJsSSRModuleCachePlugin({ outputPath }),
      isServer && new NextJsSsrImportPlugin(),
      !isServer &&
        new BuildManifestPlugin({
          buildId,
          clientManifest: config.experimental.granularChunks,
          modern: config.experimental.modern,
        }),
      config.experimental.css &&
        !isServer &&
        !dev &&
        new MiniCssExtractPlugin({
          filename: 'static/css/[contenthash].css',
          chunkFilename: 'static/css/[contenthash].chunk.css',
        }),
      tracer && new ProfilingPlugin({ tracer }),
      !isServer &&
        useTypeScript &&
        new ForkTsCheckerWebpackPlugin(
          PnpWebpackPlugin.forkTsCheckerOptions({
            typescript: typeScriptPath,
            async: dev,
            useTypescriptIncrementalApi: true,
            checkSyntacticErrors: true,
            tsconfig: tsConfigPath,
            reportFiles: ['**', '!**/__tests__/**', '!**/?(*.)(spec|test).*'],
            compilerOptions: { isolatedModules: true, noEmit: true },
            silent: true,
            formatter: 'codeframe',
          })
        ),
      config.experimental.modern &&
        !isServer &&
        !dev &&
        new NextEsmPlugin({
          filename: (getFileName) => (...args) => {
            const name = typeof getFileName === 'function' ? getFileName(...args) : getFileName
            return name.includes('.js')
              ? name.replace(/\.js$/, '.module.js')
              : escapePathVariables(args[0].chunk.name.replace(/\.js$/, '.module.js'))
          },
          chunkFilename: (inputChunkName) => inputChunkName.replace(/\.js$/, '.module.js'),
        }),
    ].filter(Boolean),
  }

  // 应用用户自定义 Webpack 配置
  if (typeof config.webpack === 'function') {
    webpackConfig = config.webpack(webpackConfig, {
      dir,
      dev,
      isServer,
      buildId,
      config,
      defaultLoaders,
      totalPages,
      webpack,
    })
    if (typeof webpackConfig.then === 'function') {
      console.warn(
        '> next.config.js 中返回了 Promise。详情见：https://err.sh/zeit/next.js/promise-in-next-config'
      )
    }
  }










 
 

  // 检查并移除过时的 @zeit/next-typescript
  if (isServer && webpackConfig.module && Array.isArray(webpackConfig.module.rules)) {
    let foundTsRule = false
    webpackConfig.module.rules = webpackConfig.module.rules.filter((rule) => {
      if (!(rule.test instanceof RegExp)) return true
      if ('noop.ts'.match(rule.test) && !'noop.js'.match(rule.test)) {
        foundTsRule = rule.use === defaultLoaders.babel
        return !foundTsRule
      }
      return true
    })
    if (foundTsRule) {
      console.warn(
        '\n@zeit/next-typescript 已不再需要，因为 Next.js 现已内置 TypeScript 支持。请从 next.config.js 和 .babelrc 中移除它\n'
      )
    }
  }

  // 修补 @zeit/next-sass 和 @zeit/next-less 兼容性
  if (webpackConfig.module && Array.isArray(webpackConfig.module.rules)) {
    webpackConfig.module.rules.forEach((rule) => {
      if (!(rule.test instanceof RegExp && Array.isArray(rule.use))) return
      const isSass = rule.test.source === '\\.scss$' || rule.test.source === '\\.sass$'
      const isLess = rule.test.source === '\\.less$'
      const isCss = rule.test.source === '\\.css$'
      if (!(isSass || isLess || isCss)) return
      rule.use.forEach((use) => {
        if (
          !(
            use &&
            typeof use === 'object' &&
            (use.loader === 'css-loader' || use.loader === 'css-loader/locals') &&
            use.options &&
            typeof use.options === 'object' &&
            Object.prototype.hasOwnProperty.call(use.options, 'minimize')
          )
        ) {
          return
        }
        try {
          const correctNextCss = resolveRequest(
            '@zeit/next-css',
            isCss
              ? `${dir}/`
              : require.resolve(isSass ? '@zeit/next-sass' : isLess ? '@zeit/next-less' : 'next')
          )
          if (correctNextCss) {
            const correctCssLoader = resolveRequest(use.loader, correctNextCss)
            if (correctCssLoader) use.loader = correctCssLoader
          }
        } catch (_) {}
      })
    })
  }

  // 处理 main.js 入口向后兼容
  const originalEntry = webpackConfig.entry
  if (typeof originalEntry !== 'undefined') {
    webpackConfig.entry = async () => {
      const entry = typeof originalEntry === 'function' ? await originalEntry() : originalEntry
      if (clientEntries && entry['main.js'] && entry['main.js'].length > 0) {
        const originalFile = clientEntries[CLIENT_STATIC_FILES_RUNTIME_MAIN]
        entry[CLIENT_STATIC_FILES_RUNTIME_MAIN] = [...entry['main.js'], originalFile]
      }
      delete entry['main.js']
      return entry
    }
  }

  // 非开发模式下立即执行 entry
  if (!dev) {
    webpackConfig.entry = await webpackConfig.entry()
  }

  return webpackConfig
}