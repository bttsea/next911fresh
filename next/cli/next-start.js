#!/usr/bin/env node

// 导入路径解析模块
import { resolve } from 'path'
// 导入 arg 模块，用于解析命令行参数
import arg from 'next/dist/compiled/arg/index.js'
// 导入启动服务器的函数
import startServer from '../server/lib/start-server'
// 导入 Next.js CLI 命令接口
import { cliCommand } from '../bin/next'

/**
 * Next.js 启动命令的实现
 * @param {string[]} argv 命令行参数数组
 */
const nextStart = argv => {
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
        以生产模式启动应用。
        必须先使用 \`next build\` 编译应用。

      使用方法
        $ next start <dir> -p <port>

      <dir> 是包含编译后 dist 文件夹的目录，
      该文件夹由 \`next build\` 生成。
      如果未提供目录，将使用当前目录。
      您可以在配置文件中设置自定义 dist 文件夹，详见：https://github.com/zeit/next.js#custom-configuration

      选项
        --port, -p      指定应用启动的端口号
        --hostname, -H  指定应用启动的主机名
        --help, -h      显示此帮助信息
    `)
    process.exit(0)
  }

  // 解析项目根目录，默认为当前目录
  const dir = resolve(args._[0] || '.')
  // 获取端口号，默认为 3000
  const port = args['--port'] || 3000
  // 启动服务器
  startServer({ dir }, port, args['--hostname'])
    .then(async app => {
      // 打印服务器启动信息
      console.log(
        `> 应用已在 http://${args['--hostname'] || 'localhost'}:${port} 上启动`
      )
      // 准备服务器
      await app.prepare()
    })
    .catch(err => {
      // 打印错误信息并退出
      console.error(err)
      process.exit(1)
    })
}

// 导出 nextStart 函数
export { nextStart }


/*
服务器启动：
调用 startServer 函数启动生产模式的服务器，传入目录、端口号和主机名。

默认端口为 3000，默认主机名为 localhost。

启动成功后打印访问地址，失败时打印错误并退出。

前置条件：应用必须先通过 next build 编译，生成 .next 或自定义的 dist 文件夹。


/**** */