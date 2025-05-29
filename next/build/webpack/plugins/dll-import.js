// 导入 path 模块
import path from 'path';

/**
 * 配置并返回 AutoDllPlugin
 * @param {Object} options - 配置选项
 * @param {string} options.distDir - 输出目录
 * @returns {Function} AutoDllPlugin 构造函数
 */
export function importAutoDllPlugin({ distDir }) {
  // 获取 autodll-webpack-plugin 的 paths.js 文件路径
  const autodllPaths = path.join(
    path.dirname(require.resolve('autodll-webpack-plugin')),
    'paths.js'
  );

  // 加载 paths.js
  require(autodllPaths);

  // 定义 AutoDllPlugin 缓存目录
  const autodllCachePath = path.resolve(
    path.join(distDir, 'cache', 'autodll-webpack-plugin')
  );

  // 修改 require.cache，覆盖 paths.js 的导出
  require.cache[autodllPaths] = Object.assign({}, require.cache[autodllPaths], {
    exports: Object.assign({}, require.cache[autodllPaths].exports, {
      cacheDir: autodllCachePath,
      // 定义获取清单文件路径的函数
      getManifestPath: (hash) => (bundleName) =>
        path.resolve(autodllCachePath, hash, `${bundleName}.manifest.json`),
    }),
  });

  // 加载 AutoDllPlugin
  const AutoDllPlugin = require('autodll-webpack-plugin');

  // 返回 AutoDllPlugin 构造函数
  return AutoDllPlugin;
}


/*
代码功能说明
作用：
这是一个模块，用于 Next.js 9.1.1 的构建流程，动态配置并返回 autodll-webpack-plugin。
autodll-webpack-plugin 用于生成 DLL（动态链接库），缓存常用模块（如 react, react-dom），提升构建性能。

主要功能：
获取 paths.js：
使用 require.resolve 定位 autodll-webpack-plugin 的 paths.js 文件。
paths.js 定义了插件的默认路径配置。

配置缓存路径：
定义缓存目录（distDir/cache/autodll-webpack-plugin）。
修改 require.cache，覆盖 paths.js 的导出，设置自定义 cacheDir 和 getManifestPath。

自定义 getManifestPath：
返回一个函数，生成 DLL 清单文件的路径（cacheDir/hash/bundleName.manifest.json）。

返回插件：
加载 autodll-webpack-plugin 并返回其构造函数，供 Webpack 配置使用。

逻辑：
动态修改 autodll-webpack-plugin 的缓存配置，确保 DLL 文件存储在指定目录。
使用 require.cache 覆盖模块导出，避免修改原始文件。
支持可移植的路径处理（通过 path.resolve 和 path.join）。

用途：
在 Next.js 9.1.1 的构建流程中，配置 autodll-webpack-plugin 以生成 DLL，优化开发和生产构建。
在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 使用：
javascript

const { importAutoDllPlugin } = require('./plugins/dll-import');
plugins: [
  importAutoDllPlugin({ distDir: './dist' })({
    filename: '[name].dll.js',
    path: './dist/static/dll',
    entry: { vendor: ['react', 'react-dom'] },
  }),
]


/**** */