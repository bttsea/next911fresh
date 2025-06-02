#!/usr/bin/env node
// 导入文件系统模块的 existsSync 方法，用于检查目录是否存在
import { existsSync } from 'fs'
// 导入 arg 模块，用于解析命令行参数
///=== import arg from 'next/dist/compiled/arg/index.js'
import arg from '../lib/arg'
// 导入路径解析模块
import { resolve } from 'path'

// 导入 Next.js CLI 命令接口
import { cliCommand } from '../bin/next'
// 导入构建函数
import build from '../build'
// 导入打印并退出进程的工具函数
import { printAndExit } from '../server/lib/utils'

/**
 * Next.js 构建命令的实现
 * @param {string[]} argv 命令行参数数组
 */
const nextBuild = argv => {
  // 解析命令行参数
  const args = arg(
    {
      // 定义参数类型
      '--help': Boolean,
      // 参数别名
      '-h': '--help',
    },
    { argv }
  )

  // 如果提供了 --help 或 -h 参数，打印帮助信息并退出
  if (args['--help']) {
    printAndExit(
      `
      描述
        将应用编译为生产环境部署

      使用方法
        $ next build <dir>

      <dir> 表示编译后的 dist 文件夹的输出路径。
      如果未提供目录，dist 文件夹将在当前目录下创建。
      您可以在配置文件中设置自定义文件夹，详见：https://github.com/zeit/next.js#custom-configuration，
      否则将默认在 '.next' 目录中创建。
    `,
      0
    )
  }

  // 解析项目根目录，默认为当前目录
  const dir = resolve(args._[0] || '.')

  // 检查提供的目录是否存在
  if (!existsSync(dir)) {
    printAndExit(`> 项目根目录不存在：${dir}`)
  }

  // 执行构建过程
  build(dir)
    .then(() => process.exit(0)) // 构建成功后退出进程
    .catch(err => {
      console.error('> 构建过程中发生错误')
      printAndExit(err) // 打印错误并退出
    })
}

// 导出 nextBuild 函数
export { nextBuild }


/*
构建执行：调用 build 函数（从 ../build 导入）执行生产环境构建，成功时退出码为 0，失败时打印错误并退出。

帮助信息：当用户输入 --help 或 -h 时，显示命令的使用说明和描述。 

与 Next.js 9.1.1 的关系
该文件是 Next.js 9.1.1 CLI 的入口点之一，专门处理 next build 命令。
/**** */
