// 导入路径处理模块 
import path from 'path'
// 导入目录创建模块
import mkdirp from 'mkdirp'
// 导入文件系统模块
import fs from 'fs'

// 尝试加载 Node.js 的 inspector 模块
let inspector
try {
  inspector = require('inspector')
} catch (e) {
  console.log('Node 8.0 以下版本无法进行 CPU 性能分析')
}

/**
 * 性能分析器类
 */
class Profiler {
  /**
   * 构造函数
   * @param {Object} inspector Node.js inspector 模块
   */
  constructor(inspector) {
    this.session = undefined
    this.inspector = inspector
  }

  /**
   * 检查是否存在会话
   * @returns {boolean} 是否存在会话
   */
  hasSession() {
    return this.session !== undefined
  }

  /**
   * 开始性能分析
   * @returns {Promise} 异步操作结果
   */
  startProfiling() {
    if (this.inspector === undefined) {
      return Promise.resolve()
    }

    try {
      this.session = new this.inspector.Session()
      this.session.connect()
    } catch (_) {
      this.session = undefined
      return Promise.resolve()
    }

    return Promise.all([
      this.sendCommand('Profiler.setSamplingInterval', { interval: 100 }),
      this.sendCommand('Profiler.enable'),
      this.sendCommand('Profiler.start'),
    ])
  }

  /**
   * 发送命令到 inspector 会话
   * @param {string} method 命令方法
   * @param {Object} params 命令参数
   * @returns {Promise} 命令执行结果
   */
  sendCommand(method, params) {
    if (this.hasSession()) {
      return new Promise((resolve, reject) => {
        return this.session.post(method, params, (err, params) => {
          if (err !== null) {
            reject(err)
          } else {
            resolve(params)
          }
        })
      })
    } else {
      return Promise.resolve()
    }
  }

  /**
   * 销毁会话
   * @returns {Promise} 异步操作结果
   */
  destroy() {
    if (this.hasSession()) {
      this.session.disconnect()
    }
    return Promise.resolve()
  }

  /**
   * 停止性能分析
   * @returns {Promise} 性能分析结果
   */
  stopProfiling() {
    return this.sendCommand('Profiler.stop')
  }
}

// 导入 chrome-trace-event 的 Tracer 类
const { Tracer } = require('chrome-trace-event')

/**
 * 创建跟踪对象，用于记录性能分析和跟踪事件
 * @param {string} outputPath 输出日志文件的路径
 * @returns {Object} 跟踪对象，包含 trace、counter、profiler 和 end 方法
 */
export const createTrace = (outputPath) => {
  // 初始化 Tracer 实例
  const trace = new Tracer({ noStream: true })
  // 初始化 Profiler 实例
  const profiler = new Profiler(inspector)
  // 确保输出目录存在
  if (/\/|\\/.test(outputPath)) {
    const dirPath = path.dirname(outputPath)
    mkdirp.sync(dirPath)
  }
  // 创建文件写入流
  const fsStream = fs.createWriteStream(outputPath)

  let counter = 0

  // 将跟踪事件写入文件流
  trace.pipe(fsStream)
  // 添加关键事件以支持 Chrome DevTools 加载性能分析
  trace.instantEvent({
    name: 'TracingStartedInPage',
    id: ++counter,
    cat: ['disabled-by-default-devtools.timeline'],
    args: {
      data: {
        sessionId: '-1',
        page: '0xfff',
        frames: [{ frame: '0xfff', url: 'webpack', name: '' }],
      },
    },
  })

  trace.instantEvent({
    name: 'TracingStartedInBrowser',
    id: ++counter,
    cat: ['disabled-by-default-devtools.timeline'],
    args: {
      data: { sessionId: '-1' },
    },
  })

  return {
    trace,
    counter,
    profiler,
    /**
     * 结束跟踪并关闭文件流
     * @param {Function} callback 回调函数
     */
    end: (callback) => {
      // 等待文件流写入完成
      fsStream.on('finish', () => {
        callback()
      })
      // 结束跟踪流
      trace.push(null)
    },
  }
}


/*
代码功能说明
作用：该文件提供了一个性能分析工具，用于在 Next.js 构建过程中记录 CPU 性能分析和 Chrome 跟踪事件，输出到指定日志文件。

主要组件：
Profiler 类：
使用 Node.js 的 inspector 模块进行 CPU 性能分析。

方法包括启动/停止分析、发送命令、销毁会话等。

如果 inspector 不可用（Node.js < 8.0），则跳过分析。

createTrace 函数：
创建一个跟踪对象，包含 Tracer（记录 Chrome 跟踪事件）、Profiler（CPU 分析）、和文件写入流。

初始化关键事件（如 TracingStartedInPage），以支持 Chrome DevTools 加载。

提供 end 方法结束跟踪并关闭文件流。


/**** */