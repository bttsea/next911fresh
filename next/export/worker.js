import mkdirpModule from 'mkdirp';
import { promisify } from 'util';
import { extname, join, dirname, sep } from 'path';
import { renderToHTML } from '../next-server/server/render';
import { writeFile, access } from 'fs';
 
import { loadComponents } from '../next-server/server/load-components';
import { isDynamicRoute } from '../next-server/lib/router/utils/is-dynamic';
import { getRouteMatcher } from '../next-server/lib/router/utils/route-matcher';
import { getRouteRegex } from '../next-server/lib/router/utils/route-regex';

const envConfig = require('../next-server/lib/runtime-config');
const writeFileP = promisify(writeFile);
const mkdirp = promisify(mkdirpModule);
const accessP = promisify(access);

// 设置全局 __NEXT_DATA__，支持静态导出
global.__NEXT_DATA__ = {
  nextExport: true,
};

/**
 * 工作线程处理单个页面的静态渲染
 * @param {Object} options - 渲染选项
 * @param {string} options.path - 页面路径
 * @param {Object} options.pathMap - 路径映射
 * @param {string} options.distDir - 构建目录
 * @param {string} options.buildId - 构建 ID
 * @param {string} options.outDir - 输出目录
 * @param {string} options.sprDataDir - 数据文件目录
 * @param {Object} options.renderOpts - 渲染配置
 * @param {boolean} options.buildExport - 是否为构建导出
 * @param {Object} options.serverRuntimeConfig - 服务器运行时配置
 * @param {boolean} options.subFolders - 是否使用子文件夹
 * @param {boolean} options.serverless - 是否为无服务器模式
 * @returns {Object} - 渲染结果，包含 AMP 验证和错误信息
 */
export default async function ({
  path,
  pathMap,
  distDir,
  buildId,
  outDir,
  sprDataDir,
  renderOpts,
  buildExport,
  serverRuntimeConfig,
  subFolders,
  serverless,
}) {
  // 初始化结果对象
  let results = {
    ampValidations: [],
  };

  try {
    // 提取查询参数和页面路径
    let { query = {} } = pathMap;
    const { page } = pathMap;
    const filePath = path === '/' ? '/index' : path;
    const ampPath = `${filePath}.amp`;

    // 检查是否为动态路由
    if (isDynamicRoute(page) && page !== path) {
      const params = getRouteMatcher(getRouteRegex(page))(path);
      if (params) {
        query = {
          ...query,
          ...params,
        };
      } else {
        throw new Error(
          `提供的导出路径 '${path}' 与页面 '${page}' 不匹配。\n详情：https://err.sh/zeit/next.js/export-path-mismatch`
        );
      }
    }

    // 模拟 HTTP 请求和响应头
    const headerMocks = {
      headers: {},
      getHeader: () => ({}),
      setHeader: () => {},
      hasHeader: () => false,
      removeHeader: () => {},
      getHeaderNames: () => [],
    };

    const req = {
      url: path,
      ...headerMocks,
    };
    const res = {
      ...headerMocks,
    };

    // 设置运行时配置
    envConfig.setConfig({
      serverRuntimeConfig,
      publicRuntimeConfig: renderOpts.runtimeConfig,
    });

    // 确定 HTML 文件名
    let htmlFilename = `${filePath}${sep}index.html`;
    if (!subFolders) htmlFilename = `${filePath}.html`;

    const pageExt = extname(page);
    const pathExt = extname(path);
    if (pageExt !== pathExt && pathExt !== '') {
      htmlFilename = path;
    } else if (path === '/') {
      htmlFilename = 'index.html';
    }

    // 确定输出路径
    const baseDir = join(outDir, dirname(htmlFilename));
    const htmlFilepath = join(outDir, htmlFilename);

    // 创建输出目录
    await mkdirp(baseDir);
    let html;
    let curRenderOpts = {};
    let renderMethod = renderToHTML;

    /**
     * 检查是否已在构建时预渲染
     * @param {Function} unstable_getStaticProps - 静态属性函数
     * @returns {boolean} - 是否预渲染
     */
    const renderedDuringBuild = (unstable_getStaticProps) => {
      return !buildExport && unstable_getStaticProps && !isDynamicRoute(path);
    };

 
      // 加载页面组件
      const components = await loadComponents(distDir, buildId, page, serverless);

      // 如果页面已预渲染，直接返回
      if (renderedDuringBuild(components.unstable_getStaticProps)) {
        return results;
      }

      if (typeof components.Component === 'string') {
        html = components.Component;
      } else {
        curRenderOpts = { ...components, ...renderOpts, ampPath };
        html = await renderMethod(req, res, page, query, curRenderOpts);
      } 

 

    // 记录重验证时间
    results.fromBuildExportRevalidate = curRenderOpts.revalidate;

    // 写入 HTML 文件
    await writeFileP(htmlFilepath, html, 'utf8');
    return results;
  } catch (error) {
    console.error(`\n预渲染 ${path} 时发生错误：`, error);
    return { ...results, error: true };
  }
}


/*
export/worker.ts 的用途
在 Next.js 9.1.1 中，next/export/worker.ts 是 next export 命令的工作线程模块，
由 export/index.js 通过 jest-worker 调用，
负责渲染单个页面为静态 HTML 和 JSON 文件。
负责渲染单个页面为静态 HTML 和 JSON 文件。
负责渲染单个页面为静态 HTML 和 JSON 文件。
负责渲染单个页面为静态 HTML 和 JSON 文件。
负责渲染单个页面为静态 HTML 和 JSON 文件。
负责渲染单个页面为静态 HTML 和 JSON 文件。
负责渲染单个页面为静态 HTML 和 JSON 文件。
它是静态站点生成（SSG）的核心组件，运行在独立线程中以提高性能。主要功能包括：
页面渲染：
使用 renderToHTML（或无服务器模式的 renderReqToHTML）渲染页面为 HTML。

支持动态路由，通过 isDynamicRoute 和 getRouteMatcher 处理路径参数。

文件输出：
写入 HTML 文件到输出目录（outDir），支持子文件夹（subFolders）或扁平结构。
错误处理：
捕获渲染错误，返回错误状态（error: true），不中断其他线程。
验证动态路由路径，抛出匹配错误。
集成：
由 export/index.ts 的工作线程池调用，处理 exportPathMap 中的每个路径。

依赖 next-server 模块（render, load-components, router/utils）。


/*** */