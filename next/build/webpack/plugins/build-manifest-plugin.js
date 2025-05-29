// 导入 devalue 模块用于序列化对象
import devalue from 'devalue';
// 导入 Next.js 常量
import {
  BUILD_MANIFEST,
  CLIENT_STATIC_FILES_PATH,
  CLIENT_STATIC_FILES_RUNTIME_MAIN,
  IS_BUNDLED_PAGE_REGEX,
  ROUTE_NAME_REGEX,
} from '../../../next-server/lib/constants';
// 导入 Webpack 的 Compiler 和 RawSource
import { Compiler, RawSource } from 'webpack';

/**
 * 生成客户端构建清单
 * @param {Object} assetMap - 资源映射对象
 * @param {boolean} isModern - 是否为现代化模块（支持 ES Modules）
 * @returns {string} 序列化的客户端清单
 */
function generateClientManifest(assetMap, isModern) {
  const clientManifest = {};
  // 获取 _app 页面的依赖
  const appDependencies = new Set(assetMap.pages['/_app']);

  // 遍历页面资源，过滤依赖
  Object.entries(assetMap.pages).forEach(([page, dependencies]) => {
    if (page === '/_app') return;
    // 过滤掉 _app 的依赖，仅保留符合现代化条件的模块
    const filteredDeps = dependencies.filter(
      (dep) => !appDependencies.has(dep) && /\.module\.js$/.test(dep) === isModern
    );

    // 如果有依赖，添加到清单
    if (filteredDeps.length) {
      clientManifest[page] = filteredDeps;
    }
  });

  // 使用 devalue 序列化清单
  return devalue(clientManifest);
}

/**
 * Webpack 插件：生成 build-manifest.json 和客户端清单
 */
export default class BuildManifestPlugin {
  /**
   * 构造函数
   * @param {Object} options - 插件选项
   * @param {string} options.buildId - 构建 ID
   * @param {boolean} options.clientManifest - 是否生成客户端清单
   * @param {boolean} options.modern - 是否支持现代化模块
   */
  constructor(options) {
    this.buildId = options.buildId;
    this.clientManifest = options.clientManifest;
    this.modern = options.modern;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    compiler.hooks.emit.tapAsync('NextJsBuildManifest', (compilation, callback) => {
      const { chunks } = compilation;
      // 初始化资源映射
      const assetMap = { devFiles: [], pages: { '/_app': [] } };

      // 查找主 JavaScript 块
      const mainJsChunk = chunks.find(
        (c) => c.name === CLIENT_STATIC_FILES_RUNTIME_MAIN
      );
      // 获取主 JavaScript 文件
      const mainJsFiles =
        mainJsChunk && mainJsChunk.files.length > 0
          ? mainJsChunk.files.filter((file) => /\.js$/.test(file))
          : [];

      // 遍历所有资源文件
      for (const filePath of Object.keys(compilation.assets)) {
        const path = filePath.replace(/\\/g, '/');
        // 收集开发相关的 DLL 文件
        if (/^static\/development\/dll\//.test(path)) {
          assetMap.devFiles.push(path);
        }
      }

      // 遍历入口点
      for (const [, entrypoint] of compilation.entrypoints.entries()) {
        const result = ROUTE_NAME_REGEX.exec(entrypoint.name);
        if (!result) {
          continue;
        }

        const pagePath = result[1];
        if (!pagePath) {
          continue;
        }

        const filesForEntry = [];
        // 遍历入口点的块
        for (const chunk of entrypoint.chunks) {
          if (!chunk.name || !chunk.files) {
            continue;
          }

          for (const file of chunk.files) {
            // 跳过 .map 和 .hot-update.js 文件
            if (/\.map$/.test(file) || /\.hot-update\.js$/.test(file)) {
              continue;
            }

            // 仅处理 .js 和 .css 文件
            if (!/\.js$/.test(file) && !/\.css$/.test(file)) {
              continue;
            }

            // 跳过页面捆绑文件（由 _document.js 手动处理）
            if (IS_BUNDLED_PAGE_REGEX.exec(file)) {
              continue;
            }

            filesForEntry.push(file.replace(/\\/g, '/'));
          }
        }

        // 注册页面资源
        assetMap.pages[`/${pagePath.replace(/\\/g, '/')}`] = [
          ...filesForEntry,
          ...mainJsFiles,
        ];
      }

      // 将 /index 映射为 /
      if (typeof assetMap.pages['/index'] !== 'undefined') {
        assetMap.pages['/'] = assetMap.pages['/index'];
      }

      // 如果启用客户端清单，为 _app 添加构建清单文件
      if (this.clientManifest) {
        assetMap.pages['/_app'].push(
          `${CLIENT_STATIC_FILES_PATH}/${this.buildId}/_buildManifest.js`
        );
        if (this.modern) {
          assetMap.pages['/_app'].push(
            `${CLIENT_STATIC_FILES_PATH}/${this.buildId}/_buildManifest.module.js`
          );
        }
      }

      // 按页面名称排序
      assetMap.pages = Object.keys(assetMap.pages)
        .sort()
        .reduce((a, c) => {
          a[c] = assetMap.pages[c];
          return a;
        }, {});

      // 输出 build-manifest.json
      compilation.assets[BUILD_MANIFEST] = new RawSource(
        JSON.stringify(assetMap, null, 2)
      );

      // 如果启用客户端清单，生成客户端清单文件
      if (this.clientManifest) {
        const clientManifestPath = `${CLIENT_STATIC_FILES_PATH}/${this.buildId}/_buildManifest.js`;

        compilation.assets[clientManifestPath] = new RawSource(
          `self.__BUILD_MANIFEST = ${generateClientManifest(assetMap, false)};` +
            `self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()`
        );

        if (this.modern) {
          const modernClientManifestPath = `${CLIENT_STATIC_FILES_PATH}/${this.buildId}/_buildManifest.module.js`;

          compilation.assets[modernClientManifestPath] = new RawSource(
            `self.__BUILD_MANIFEST = ${generateClientManifest(assetMap, true)};` +
              `self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()`
          );
        }
      }

      // 完成回调
      callback();
    });
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，生成 build-manifest.json 文件，记录所有资源的映射（入口文件名到实际文件名）。
如果启用 clientManifest，生成客户端清单文件（_buildManifest.js 和现代化版本 _buildManifest.module.js），供客户端路由使用。

主要功能：
资源映射（assetMap）：
收集开发文件（devFiles：如 DLL 文件）。
按页面（pages）组织资源，包括 /_app 和其他页面。
从 compilation.entrypoints 提取页面路径（通过 ROUTE_NAME_REGEX）。
包含主 JavaScript 文件（mainJsFiles，来自 CLIENT_STATIC_FILES_RUNTIME_MAIN）。

页面处理：
过滤 .js 和 .css 文件，排除 .map 和 .hot-update.js。
忽略页面捆绑文件（IS_BUNDLED_PAGE_REGEX），由 _document.js 手动处理。
将 /index 映射为 /。
按页面名称排序。

客户端清单：
如果 clientManifest 为 true，为 /_app 添加 _buildManifest.js（和现代化版本）。
使用 generateClientManifest 生成客户端清单，过滤 _app 的依赖，仅包含现代化模块（.module.js）或普通模块。
使用 devalue 序列化清单，确保安全传输。

输出文件：
build-manifest.json：包含完整 assetMap，格式化为 JSON。
_buildManifest.js：包含客户端清单，赋值给 self.__BUILD_MANIFEST。
_buildManifest.module.js（如果 modern 为 true）：包含现代化清单。

逻辑：
在 compiler.hooks.emit 阶段异步处理资源。
使用 RawSource 生成输出文件，写入 compilation.assets。
支持模块热更新（HMR）通过客户端清单的回调（__BUILD_MANIFEST_CB）。

根据 buildId 和 modern 动态生成文件路径。

用途：
在 Next.js 9.1.1 的构建流程中，生成资源清单，支持客户端路由和动态加载。

build-manifest.json 用于服务端和构建分析。   -服务端- -服务端- -服务端- -服务端- -服务端- -服务端-
_buildManifest.js 用于客户端，确保页面加载正确的资源。  -客户端- -客户端- -客户端- -客户端- -客户端- -客户端-

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new BuildManifestPlugin({
    buildId: 'unique-build-id',
    clientManifest: true,
    modern: false,
  }),
]


/***** */