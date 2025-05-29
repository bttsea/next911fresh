import chalk from 'chalk';
import { copyFile as copyFileOrig, existsSync, readFileSync } from 'fs';
import Worker from 'jest-worker';
import mkdirpModule from 'mkdirp';
import { cpus } from 'os';
import { dirname, join, resolve } from 'path';
import { promisify } from 'util';

 
import createSpinner from '../build/spinner';
import { API_ROUTE } from '../lib/constants';
import { recursiveCopy } from '../lib/recursive-copy';
import { recursiveDelete } from '../lib/recursive-delete';
import {
  BUILD_ID_FILE,
  CLIENT_PUBLIC_FILES_PATH,
  CLIENT_STATIC_FILES_PATH,
  CONFIG_FILE,
  PAGES_MANIFEST,
  PHASE_EXPORT,
  PRERENDER_MANIFEST,
  SERVER_DIRECTORY,
  SERVERLESS_DIRECTORY,
} from '../next-server/lib/constants';
import { loadConfig } from '../next-server/server/config';
 

// 将 mkdirp 和 copyFile 转换为 Promise 形式
const mkdirp = promisify(mkdirpModule);
const copyFile = promisify(copyFileOrig);

/**
 * 创建进度条，用于显示导出进度
 * @param {number} total - 总任务数
 * @param {string} [label='Exporting'] - 进度条标签
 * @returns {Function} - 更新进度的函数
 */
const createProgress = (total, label = 'Exporting') => {
  let curProgress = 0;
  let progressSpinner = createSpinner(`${label} (${curProgress}/${total})`, {
    spinner: {
      frames: [
        '[    ]',
        '[=   ]',
        '[==  ]',
        '[=== ]',
        '[ ===]',
        '[  ==]',
        '[   =]',
        '[    ]',
        '[   =]',
        '[  ==]',
        '[ ===]',
        '[====]',
        '[=== ]',
        '[==  ]',
        '[=   ]',
      ],
      interval: 80,
    },
  });

  return () => {
    curProgress++;
    const newText = `${label} (${curProgress}/${total})`;
    if (progressSpinner) {
      progressSpinner.text = newText;
    } else {
      console.log(newText);
    }

    if (curProgress === total && progressSpinner) {
      progressSpinner.stop();
      console.log(newText);
    }
  };
};

/**
 * 执行 Next.js 静态导出
 * @param {string} dir - 项目根目录
 * @param {Object} options - 导出选项
 * @param {Object} [configuration] - Next.js 配置对象
 * @returns {Promise<void>} - 导出完成
 */
export default async function (dir, options, configuration) {
  /**
   * 记录日志（可通过 silent 选项禁用）
   * @param {string} message - 日志消息
   */
  function log(message) {
    if (options.silent) {
      return;
    }
    console.log(message);
  }

  // 解析项目根目录为绝对路径
  dir = resolve(dir);
  // 加载 Next.js 配置（默认使用 PHASE_EXPORT 阶段）
  const nextConfig = configuration || loadConfig(PHASE_EXPORT, dir);
  // 设置工作线程数（基于 CPU 核心数，最小为 1）
  const threads = options.threads || Math.max(cpus().length - 1, 1);
  // 构建目录（如 .next）
  const distDir = join(dir, nextConfig.distDir);

 
  // 是否启用导出路径末尾斜杠
  const subFolders = nextConfig.exportTrailingSlash;
 
 

  log(`> 使用构建目录：${distDir}`);

  // 检查构建目录是否存在
  if (!existsSync(distDir)) {
    throw new Error(
      `构建目录 ${distDir} 不存在。请先运行 "next build"。`
    );
  }

  // 读取构建 ID
  const buildId = readFileSync(join(distDir, BUILD_ID_FILE), 'utf8');
  // 加载页面清单（如果未指定 pages）
  const pagesManifest =
    !options.pages && require(join(distDir, SERVER_DIRECTORY, PAGES_MANIFEST));

  // 尝试加载预渲染清单
  let prerenderManifest;
  try {
    prerenderManifest = require(join(distDir, PRERENDER_MANIFEST));
  } catch (_) {}

  // 确定页面目录路径
  const distPagesDir = join(
    distDir,  join(SERVER_DIRECTORY, 'static', buildId),
    'pages'
  );

  // 获取页面列表
  const pages = options.pages || Object.keys(pagesManifest);
  const defaultPathMap = {};

  // 构建默认路径映射，排除特殊页面
  for (const page of pages) {
    if (
      page === '/_document' ||
      page === '/_app' ||
      page === '/_error' ||
      page.match(API_ROUTE)
    ) {
      continue;
    }
    defaultPathMap[page] = { page };
  }

  // 初始化输出目录
  const outDir = options.outdir;

  // 禁止输出到 public 目录
  if (outDir === join(dir, 'public')) {
    throw new Error(
      'Next.js 保留 public 目录，不能作为导出输出目录。请参阅 https://err.sh/zeit/next.js/can-not-output-to-public'
    );
  }

  // 清空输出目录并创建 _next 目录
  await recursiveDelete(join(outDir));
  await mkdirp(join(outDir, '_next', buildId));

  // 复制 static 目录
  if (!options.buildExport && existsSync(join(dir, 'static'))) {
    log('  正在复制 "static" 目录');
    await recursiveCopy(join(dir, 'static'), join(outDir, 'static'));
  }

  // 复制 .next/static 目录
  if (existsSync(join(distDir, CLIENT_STATIC_FILES_PATH))) {
    log('  正在复制 "static build" 目录');
    await recursiveCopy(
      join(distDir, CLIENT_STATIC_FILES_PATH),
      join(outDir, '_next', CLIENT_STATIC_FILES_PATH)
    );
  }

  // 确保 exportPathMap 是函数
  if (typeof nextConfig.exportPathMap !== 'function') {
    console.log(
      `> 未在 "${CONFIG_FILE}" 中找到 "exportPathMap"。从 "./pages" 生成映射`
    );
    nextConfig.exportPathMap = async (defaultMap) => {
      return defaultMap;
    };
  }

  // 配置渲染选项
  const renderOpts = {
    dir,
    buildId,
    nextExport: true,
    assetPrefix: nextConfig.assetPrefix.replace(/\/$/, ''),
    distDir,
    dev: false,
    staticMarkup: false,
    hotReloader: null,
    canonicalBase:  '',
    isModern: nextConfig.experimental.modern,
  };

  const { serverRuntimeConfig, publicRuntimeConfig } = nextConfig;

  // 添加运行时配置
  if (Object.keys(publicRuntimeConfig).length > 0) {
    renderOpts.runtimeConfig = publicRuntimeConfig;
  }

  // 设置全局 __NEXT_DATA__，支持 Link 组件
  global.__NEXT_DATA__ = {
    nextExport: true,
  };

  log(`  启动 ${threads} 个工作线程`);
  // 获取路径映射
  const exportPathMap = await nextConfig.exportPathMap(defaultPathMap, {
    dev: false,
    dir,
    outDir,
    distDir,
    buildId,
  });
  // 确保 404 页面存在
  if (!exportPathMap['/404']) {
    exportPathMap['/404.html'] = exportPathMap['/404.html'] || {
      page: '/_error',
    };
  }
  const exportPaths = Object.keys(exportPathMap);
  // 过滤掉 API 路由
  const filteredPaths = exportPaths.filter(
    (route) => !exportPathMap[route].page.match(API_ROUTE)
  );
  const hasApiRoutes = exportPaths.length !== filteredPaths.length;

  // 警告 API 路由不支持导出
  if (hasApiRoutes) {
    log(
      chalk.yellow(
        '  API 页面不支持 next export。请参阅 https://err.sh/zeit/next.js/api-routes-static-export'
      )
    );
  }

  // 创建进度条（非静默模式）
  const progress = !options.silent && createProgress(filteredPaths.length);
  // 设置数据目录
  const sprDataDir = options.buildExport ? outDir : join(outDir, '_next/data');

  const ampValidations = {};
  let hadValidationError = false;

  // 复制 public 目录
  const publicDir = join(dir, CLIENT_PUBLIC_FILES_PATH);
  if (!options.buildExport && existsSync(publicDir)) {
    log('  正在复制 "public" 目录');
    await recursiveCopy(publicDir, outDir, {
      filter(path) {
        return !exportPathMap[path];
      },
    });
  }

  // 初始化工作线程
  const worker = new Worker(require.resolve('./worker'), {
    maxRetries: 0,
    numWorkers: threads,
    enableWorkerThreads: true,
    exposedMethods: ['default'],
  });

  // 管道输出工作线程日志
  worker.getStdout().pipe(process.stdout);
  worker.getStderr().pipe(process.stderr);

  let renderError = false;

  // 并行渲染所有页面
  await Promise.all(
    filteredPaths.map(async (path) => {
      const result = await worker.default({
        path,
        pathMap: exportPathMap[path],
        distDir,
        buildId,
        outDir,
        sprDataDir,
        renderOpts,
        serverRuntimeConfig,
        subFolders,
        buildExport: options.buildExport,
        serverless: false,
      });

      // // 处理 AMP 验证结果
      // for (const validation of result.ampValidations || []) {
      //   const { page, result } = validation;
      //   ampValidations[page] = result;
      //   hadValidationError =
      //     hadValidationError ||
      //     (Array.isArray(result && result.errors) && result.errors.length > 0);
      // }
      renderError = renderError || !!result.error;

      // 记录页面预验证数据（用于构建导出）
      if (
        options.buildExport &&
        typeof result.fromBuildExportRevalidate !== 'undefined'
      ) {
        configuration.initialPageRevalidationMap[path] =
          result.fromBuildExportRevalidate;
      }
      if (progress) progress();
    })
  );

  // 关闭工作线程
  worker.end();

  // 复制预渲染路由
  if (!options.buildExport && prerenderManifest) {
    await Promise.all(
      Object.keys(prerenderManifest.routes).map(async (route) => {
        route = route === '/' ? '/index' : route;
        const orig = join(distPagesDir, route);
        const htmlDest = join(outDir, `${route}.html`);
        const jsonDest = join(sprDataDir, `${route}.json`);

        await mkdirp(dirname(htmlDest));
        await mkdirp(dirname(jsonDest));
        await copyFile(`${orig}.html`, htmlDest);
        await copyFile(`${orig}.json`, jsonDest);
      })
    );
  }

 
  // 检查渲染错误
  if (renderError) {
    throw new Error('导出过程中遇到错误');
  }
  // 添加空行以提高控制台可读性
  log('');
}


/*
export/index.ts 的用途
在 Next.js 9.1.1 中，next/export/index.js 是 next export 命令的核心模块，
负责将 Next.js 应用静态导出为 HTML 和 JSON 文件，用于静态站点生成（SSG）。
它基于 next build 的输出，生成可部署的静态文件。
它基于 next build 的输出，生成可部署的静态文件。
它基于 next build 的输出，生成可部署的静态文件。
它基于 next build 的输出，生成可部署的静态文件。
它基于 next build 的输出，生成可部署的静态文件。
它基于 next build 的输出，生成可部署的静态文件。



主要功能包括：
路径映射：
从 next.config.js 的 exportPathMap 或页面目录生成路径映射（ExportPathMap）。


排除特殊页面（如 _document, _app, _error, API 路由）。

文件复制：
复制 static、public 和 .next/static 目录到输出目录（如 out）。

复制预渲染页面的 HTML 和 JSON 文件（从 .next 目录）。

多线程渲染：
使用 jest-worker 创建工作线程，渲染页面为静态 HTML 和数据文件。

支持配置线程数（options.threads 或 CPU 核心数）。


错误处理：
验证构建目录（.next）存在，确保已运行 next build。


警告 API 路由不支持导出。

进度显示：
使用 createSpinner 显示渲染进度（非静默模式）。

集成：
由 next CLI 调用（next export），与 next build 和 next.config.js 配合。



/**** */