#!/usr/bin/env node

// 导入路径解析和拼接模块
import { resolve } from 'path'
// 导入 arg 模块，用于解析命令行参数
import arg from 'next/dist/compiled/arg/index.js'
// 导入文件系统模块的 existsSync 方法，用于检查目录是否存在
import { existsSync } from 'fs'
// 导入启动服务器的函数
import startServer from '../server/lib/start-server'
// 导入打印并退出进程的工具函数
import { printAndExit } from '../server/lib/utils'
// 导入开发服务器启动通知函数
import { startedDevelopmentServer } from '../build/output'
// 导入 Next.js CLI 命令接口
import { cliCommand } from '../bin/next'

/**
 * Next.js 开发模式命令的实现
 * @param {string[]} argv 命令行参数数组
 */
const nextDev = argv => {
  // 解析命令行参数
  const args = arg(
    {
      // 定义参数类型
      '--help': Boolean,
      '--port': Number,
      '--hostname': String,
      // 参数别名
      '-h': '--help',
      '-p': '--port',
      '-H': '--hostname',
    },
    { argv }
  )

  // 如果提供了 --help 或 -h 参数，打印帮助信息并退出
  if (args['--help']) {
    console.log(`
      描述
        以开发模式启动应用（支持热代码重载、错误报告等）

      使用方法
        $ next dev <dir> -p <port number>

      <dir> 表示编译文件夹的输出路径。
      如果未提供目录，将在当前目录下创建文件夹。
      您可以在配置文件中设置自定义文件夹，详见：https://github.com/zeit/next.js#custom-configuration。

      选项
        --port, -p      指定应用启动的端口号
        --hostname, -H  指定应用启动的主机名
        --help, -h      显示此帮助信息
    `)
    process.exit(0)
  }

  // 解析项目根目录，默认为当前目录
  const dir = resolve(args._[0] || '.')

  // 检查提供的目录是否存在
  if (!existsSync(dir)) {
    printAndExit(`> 项目根目录不存在：${dir}`)
  }

  // 获取端口号，默认为 3000
  const port = args['--port'] || 3000
  // 构造应用 URL
  const appUrl = `http://${args['--hostname'] || 'localhost'}:${port}`

  // 通知开发服务器启动
  startedDevelopmentServer(appUrl)

  // 启动开发服务器
  startServer({ dir, dev: true }, port, args['--hostname'])
    .then(async app => {
      // 准备服务器
      await app.prepare()
    })
    .catch(err => {
      if (err.code === 'EADDRINUSE') {
        // 处理端口被占用错误
        let errorMessage = `端口 ${port} 已被占用。`
        // 查找 package.json 文件
        const pkgAppPath = require('find-up').sync('package.json', {
          cwd: dir,
        })
        const appPackage = require(pkgAppPath)
        if (appPackage.scripts) {
          // 查找 package.json 中的 next 脚本
          const nextScript = Object.entries(appPackage.scripts).find(
            scriptLine => scriptLine[1] === 'next'
          )
          if (nextScript) {
            errorMessage += `\n请使用 \`npm run ${nextScript[0]} -- -p <其他端口号>\`。`
          }
        }
        console.error(errorMessage)
      } else {
        // 打印其他错误
        console.error(err)
      }
      // 延迟退出进程
      process.nextTick(() => process.exit(1))
    })
}

// 导出 nextDev 函数
export { nextDev }


/*
代码功能说明
作用：该文件实现了 next dev 命令，负责以开发模式启动 Next.js 应用，支持热代码重载和错误报告。

参数解析：
使用 arg 模块解析命令行参数，支持：
--help 或 -h：显示帮助信息。

--port 或 -p：指定端口号，默认为 3000。

--hostname 或 -H：指定主机名，默认为 localhost。

支持指定项目目录（dir），默认使用当前目录（.）。

目录检查：通过 existsSync 检查指定目录是否存在，若不存在则打印错误并退出。

服务器启动：
调用 startedDevelopmentServer 通知开发服务器启动，显示访问 URL。

调用 startServer 函数启动开发模式服务器，传入目录、端口号和主机名。


/**** */