#!/usr/bin/env node

// 导入路径解析和拼接模块
import { resolve, join } from 'path'
// 导入文件系统模块的 existsSync 方法，用于检查目录是否存在
import { existsSync } from 'fs'
// 导入 arg 模块，用于解析命令行参数
///=== import arg from 'next/dist/compiled/arg/index.js'
import arg from '../lib/arg'
// 导入应用导出函数
import exportApp from '../export'
// 导入打印并退出进程的工具函数
import { printAndExit } from '../server/lib/utils'
// 导入 Next.js CLI 命令接口
import { cliCommand } from '../bin/next'

/**
 * Next.js 导出命令的实现
 * @param {string[]} argv 命令行参数数组
 */
const nextExport = argv => {
  // 解析命令行参数
  const args = arg(
    {
      // 定义参数类型
      '--help': Boolean,
      '--silent': Boolean,
      '--outdir': String,
      '--threads': Number,
      '--concurrency': Number,
      // 参数别名
      '-h': '--help',
      '-s': '--silent',
      '-o': '--outdir',
    },
    { argv }
  )

  // 如果提供了 --help 或 -h 参数，打印帮助信息并退出
  if (args['--help']) {
    console.log(`
      描述
        将应用导出为生产环境的静态文件

      使用方法
        $ next export [options] <dir>

      <dir> 表示包含编译后 dist 文件夹的目录。
      如果未提供目录，将在当前目录下创建 'out' 文件夹。

      选项
        -h - 显示此帮助信息
        -o - 设置输出目录（默认为 'out'）
        -s - 不打印任何消息到控制台
    `)
    process.exit(0)
  }

  // 解析项目根目录，默认为当前目录
  const dir = resolve(args._[0] || '.')

  // 检查提供的目录是否存在
  if (!existsSync(dir)) {
    printAndExit(`> 项目根目录不存在：${dir}`)
  }

  // 配置导出选项
  const options = {
    silent: args['--silent'] || false, // 是否静默模式
    threads: args['--threads'], // 线程数
    concurrency: args['--concurrency'], // 并发数
    outdir: args['--outdir'] ? resolve(args['--outdir']) : join(dir, 'out'), // 输出目录
  }

  // 执行导出过程
  exportApp(dir, options)
    .then(() => {
      printAndExit('导出成功', 0) // 导出成功后打印消息并退出
    })
    .catch(err => {
      printAndExit(err) // 打印错误并退出
    })
}

// 导出 nextExport 函数
export { nextExport }