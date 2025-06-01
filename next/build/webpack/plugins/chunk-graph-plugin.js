// 导入 Next.js 常量
import { CLIENT_STATIC_FILES_RUNTIME_MAIN } from '../../../next-server/lib/constants';
// 导入 path 模块
import path from 'path';
// 导入 querystring 模块的 parse 函数
import { parse } from 'querystring';
// 导入 Webpack 的 Compiler 和 Plugin
import { Compiler } from 'webpack';

// 初始化清单对象
const manifest = {
  sharedFiles: [], // 共享文件
  pages: {}, // 页面文件
  pageChunks: {}, // 页面块
  chunks: {}, // 其他块
};

// 页面模块映射
const pageModules = {};

/**
 * 获取页面的块信息
 * @param {string} page - 页面名称
 * @returns {Object|undefined} 包含外部和内部模块的集合，或 undefined
 */
export  function getPageChunks(page) {
  // 如果页面不存在于清单或模块中，返回 undefined
  if (!manifest.pages[page] && !pageModules[page]) {
    return;
  }

  const external = new Set(); // 外部模块（来自 node_modules）
  const internal = new Set(); // 内部模块（项目内）

  // 合并页面文件和模块，处理路径
  [...(manifest.pages[page] || []), ...(pageModules[page] || [])].map((mod) => {
    mod = mod.replace(/\\/g, '/');

    // 跳过 Next.js 内部模块
    if (mod.match(/(next-server|next)\//)) {
      return null;
    }

    // 处理外部模块
    if (mod.includes('node_modules/')) {
      // 排除特定模块
      if (
        mod.match(
          /node_modules\/(@babel|core-js|styled-jsx|string-hash|object-assign|process|react|react-dom|scheduler|regenerator-runtime|webpack|node-libs-browser)\//
        )
      ) {
        return null;
      }

      // 提取模块名
      mod = mod.split('node_modules/')[1].split('/')[0];
      if (external.has(mod)) {
        return null;
      }

      external.add(mod);
      return mod;
    }

    // 排除页面本身
    if (mod.includes(`pages${page === '/' ? '/index' : page}`)) {
      return null;
    }

    // 处理内部模块
    if (internal.has(mod)) {
      return null;
    }

    internal.add(mod);
    return mod;
  });

  return {
    external,
    internal,
  };
}

/**
 * 获取模块文件列表
 * @param {string} dir - 项目目录
 * @param {Array} modules - 模块列表
 * @returns {Array} 文件路径列表
 */
function getFiles(dir, modules) {
  if (!(modules && modules.length)) {
    return [];
  }

  /**
   * 根据模块标识获取文件路径
   * @param {string} id - 模块标识
   * @returns {string|null} 文件路径或 null
   */
  function getFileByIdentifier(id) {
    // 跳过外部或多模块标识
    if (id.startsWith('external ') || id.startsWith('multi ')) {
      return null;
    }

    // 处理加载器分隔符
    let n;
    if ((n = id.lastIndexOf('!')) !== -1) {
      id = id.substring(n + 1);
    }

    // 转换为绝对路径
    if (id && !path.isAbsolute(id)) {
      id = path.resolve(dir, id);
    }

    return id;
  }

  // 递归提取文件路径
  return modules
    .reduce((acc, val) => {
      if (val.modules) {
        return acc.concat(getFiles(dir, val.modules));
      }
      acc.push(
        getFileByIdentifier(
          typeof val.identifier === 'function' ? val.identifier() : val.identifier
        )
      );
      return acc;
    }, [])
    .filter(Boolean);
}

/**
 * Webpack 插件：生成块图和清单
 */
export class ChunkGraphPlugin {
  /**
   * 构造函数
   * @param {string} buildId - 构建 ID
   * @param {Object} options - 插件选项
   * @param {string} options.dir - 项目目录
   * @param {string} options.distDir - 输出目录
   * @param {boolean} options.isServer - 是否为服务端
   */
  constructor(buildId, { dir, distDir, isServer }) {
    this.buildId = buildId;
    this.dir = dir;
    this.distDir = distDir;
    this.isServer = isServer;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    const { dir } = this;
    // 监听 emit 钩子
    compiler.hooks.emit.tap('ChunkGraphPlugin', (compilation) => {
      const sharedFiles = []; // 共享文件
      const sharedChunks = []; // 共享块
      const pages = {}; // 页面文件
      const pageChunks = {}; // 页面块

      // 遍历编译块
      compilation.chunks.forEach((chunk) => {
        // 仅处理入口模块
        if (!chunk.hasEntryModule()) {
          return;
        }

        const chunkModules = new Map();
        const queue = new Set(chunk.groupsIterable);
        const chunksProcessed = new Set();

        const involvedChunks = new Set();

        // 遍历块组
        for (const chunkGroup of queue) {
          for (const chunk of chunkGroup.chunks) {
            chunk.files.forEach((file) => involvedChunks.add(file));
            if (!chunksProcessed.has(chunk)) {
              chunksProcessed.add(chunk);
              for (const m of chunk.modulesIterable) {
                chunkModules.set(m.id, m);
              }
            }
          }
          for (const child of chunkGroup.childrenIterable) {
            queue.add(child);
          }
        }

        const modules = [...chunkModules.values()];
        const nodeModules = [];
        // 获取文件列表
        const files = getFiles(dir, modules)
          // 过滤 node_modules 文件
          .filter((val) => {
            const isModule = val.includes('node_modules');
            if (isModule) nodeModules.push(val);
            return !isModule;
          })
          // 排除构建产物
          .filter((val) => path.relative(this.distDir, val).startsWith('..'))
          // 转换为相对路径
          .map((f) => path.relative(dir, f));

        let pageName;
        // 检查入口模块的加载器
        if (chunk.entryModule && chunk.entryModule.loaders) {
          const entryLoader = chunk.entryModule.loaders.find(
            ({ loader, options }) =>
              loader && loader.match(/next-(\w+-)+loader/) && options
          );
          if (entryLoader) {
            const { page } = parse(entryLoader.options);
            if (typeof page === 'string' && page) {
              pageName = page;
            }
          }
        }

        // 处理页面或共享文件
        if (pageName) {
          if (
            pageName === '/_app' ||
            pageName === '/_error' ||
            pageName === '/_document'
          ) {
            sharedFiles.push(...files);
            sharedChunks.push(...involvedChunks);
          } else {
            pages[pageName] = files;
            pageChunks[pageName] = [...involvedChunks];
          
          }
  pageModules[pageName] = nodeModules;

        } else {
          if (chunk.name === CLIENT_STATIC_FILES_RUNTIME_MAIN) {
            sharedFiles.push(...files);
            sharedChunks.push(...involvedChunks);
          } else {
            manifest.chunks[chunk.name] = [
              ...new Set([...(manifest.chunks[chunk.name] || []), ...files]),
            ].sort();
          }
        }
      });

      /**
       * 转换块路径为 Lambda 格式
       * @param {string} name - 块名称
       * @returns {string} 转换后的路径
       */
      const getLambdaName = (name) => {
        return name.includes(this.buildId)
          ? name
              .replace(new RegExp(`${this.buildId}[\\/\\\\]`), 'client/')
              .replace(/[.]js$/, `.${this.buildId}.js`)
          : name;
      };

      // 更新清单
      manifest.sharedFiles = [
        ...new Set([...(manifest.sharedFiles || []), ...sharedFiles]),
      ].sort();

      for (const page in pages) {
        manifest.pages[page] = [
          ...new Set([...(manifest.pages[page] || []), ...pages[page]]),
        ].sort();

        // 仅客户端记录页面块
        if (!this.isServer) {
          manifest.pageChunks[page] = [
            ...new Set([
              ...(manifest.pageChunks[page] || []),
              ...pageChunks[page],
              ...pageChunks[page].map(getLambdaName),
              ...sharedChunks,
              ...sharedChunks.map(getLambdaName),
            ]),
          ].sort();
        }
      }
    });
  }
}

/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，生成块图清单，跟踪共享文件、页面文件、页面块和其他块。

支持客户端和服务端构建，优化模块管理和资源加载。

主要功能：
清单管理（manifest）：
sharedFiles：存储共享文件（如 _app, _error, _document 或主运行时文件）。

pages：存储每个页面的文件列表。

pageChunks：存储每个页面的块文件（仅客户端）。

chunks：存储非页面块的文件。

模块分类（getPageChunks）：
区分外部模块（node_modules）和内部模块（项目内）。

排除 Next.js 内部模块和特定依赖（如 @babel, react）。

忽略页面自身文件（如 pages/index.js）。

文件提取（getFiles）：
从模块中提取文件路径，处理加载器分隔符（!）。

转换为相对路径，排除构建产物和 node_modules。

块处理（apply）：
遍历 compilation.chunks，仅处理入口模块。

收集块文件和模块，跟踪块组关系。

识别页面（通过 next-*-loader 的 page 参数）。

将 _app, _error, _document 和主运行时（CLIENT_STATIC_FILES_RUNTIME_MAIN）归为共享资源。

为普通页面记录文件和块。

Lambda 路径转换：
将块路径转换为 Lambda 格式（如 client/xxx.[buildId].js）。

仅客户端记录页面块，包含共享块。


/**** */