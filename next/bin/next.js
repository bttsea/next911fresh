#!/usr/bin/env node
import arg from 'next/dist/compiled/arg/index.js';

// 检查必要依赖（react 和 react-dom）
['react', 'react-dom'].forEach((dependency) => {
  try {
    // 验证依赖是否存在
    require.resolve(dependency);
  } catch (err) {
    console.warn(
      `未找到模块 '${dependency}'。Next.js 要求在 'package.json' 的 'dependencies' 中包含它。运行 'npm install --save ${dependency}' 安装。`
    );
  }
});

// 默认命令
const defaultCommand = 'dev';

// 定义可用命令及其加载逻辑
const commands = {
  build: async () => await import('../cli/next-build').then((i) => i.nextBuild),
  start: async () => await import('../cli/next-start').then((i) => i.nextStart),
  export: async () => await import('../cli/next-export').then((i) => i.nextExport),
  dev: async () => await import('../cli/next-dev').then((i) => i.nextDev),
 ///=== telemetry: async () => await import('../cli/next-telemetry').then((i) => i.nextTelemetry),
};

/**
 * 解析命令行参数
 */
const args = arg(
  {
    // 参数类型
    '--version': Boolean,
    '--help': Boolean,
    '--inspect': Boolean,

    // 参数别名
    '-v': '--version',
    '-h': '--help',
  },
  {
    permissive: true, // 允许未知参数
  }
);

// 显示版本号
if (args['--version']) {
  console.log(`Next.js v${process.env.__NEXT_VERSION}`);
  process.exit(0);
}

// 检查是否运行了子命令（如 `next build`）
const foundCommand = Boolean(commands[args._[0]]);

// 显示帮助信息（仅当未指定子命令时）
if (!foundCommand && args['--help']) {
  console.log(`
    使用方法
      $ next <command>

    可用命令
      ${Object.keys(commands).join(', ')}

    选项
      --version, -v   显示版本号
      --inspect       启用 Node.js 调试器
      --help, -h      显示此帮助信息

    运行命令加 --help 旗标获取更多信息
      $ next build --help
  `);
  process.exit(0);
}

// 确定执行的命令（子命令或默认 dev）
const command = foundCommand ? args._[0] : defaultCommand;
// 提取转发参数（子命令后的参数）
const forwardedArgs = foundCommand ? args._.slice(1) : args._;

// 禁止使用 --inspect（推荐使用 NODE_OPTIONS）
if (args['--inspect']) {
  throw new Error(
    `请使用环境变量 NODE_OPTIONS：NODE_OPTIONS="--inspect" next ${command}`
  );
}

// 支持子命令的 --help（如 `next build --help`）
if (args['--help']) {
  forwardedArgs.push('--help');
}

// 设置默认 NODE_ENV（dev 为 development，其他为 production）
const defaultEnv = command === 'dev' ? 'development' : 'production';
process.env.NODE_ENV = process.env.NODE_ENV || defaultEnv;

// 加载 React（在设置 NODE_ENV 后，避免 SSR 问题）
const React = require('react');

// 检查 React 版本是否支持 Suspense
if (typeof React.Suspense === 'undefined') {
  throw new Error(
    `当前 React 版本低于 Next.js 所需的最低版本。请升级 "react" 和 "react-dom"：运行 "npm install --save react react-dom"。详情：https://err.sh/zeit/next.js/invalid-react-version`
  );
}

// 执行命令
commands[command]().then((exec) => exec(forwardedArgs));

// 开发模式下监控 next.config.js
if (command === 'dev') {
  const { CONFIG_FILE } = require('../next-server/lib/constants');
  const { watchFile } = require('fs');
  watchFile(`${process.cwd()}/${CONFIG_FILE}`, (cur, prev) => {
    if (cur.size > 0 || prev.size > 0) {
      console.log(
        `\n> 检测到 ${CONFIG_FILE} 发生更改。请重启服务器以应用更改。`
      );
    }
  });
}


/*
bin/next.ts 的用途
在 Next.js 9.1.1 中，bin/next.ts 是 Next.js CLI 的入口脚本，负责解析命令行参数并执行子命令（如 next dev, next build）。它通过 arg 解析参数，加载子命令模块，并设置运行时环境。主要功能包括：
命令解析：
支持子命令（build, start, export, dev, telemetry）。

默认命令为 dev（当未指定子命令时）。

支持选项（--version, --help, --inspect）及其别名（-v, -h）。

依赖检查：
验证 react 和 react-dom 存在，提示安装缺失依赖。

检查 React 版本是否支持 Suspense（Next.js 必需）。

环境设置：
设置 NODE_ENV（development 或 production）。

禁止 --inspect，推荐使用 NODE_OPTIONS。

命令执行：
动态加载子命令模块（next-build, next-start, etc.）。

转发参数（如 next build --help）。

开发模式监控：
在 dev 模式下监控 next.config.js，提示重启服务器。

集成：
由 npm run next 或 ./node_modules/.bin/next 调用。

依赖 next/cli 模块和 next-server/lib/constants。


/*** */