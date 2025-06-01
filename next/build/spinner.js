// 导入 ora 模块，用于创建终端加载动画 
import ora from 'ora'

// 定义加载动画的点样式
const dotsSpinner = {
  frames: ['.', '..', '...'], // 动画帧
  interval: 200, // 帧切换间隔（毫秒）
}

/**
 * 创建终端加载动画
 * @param {string|Object} text 动画文本或配置对象（包含 prefixText）
 * @param {Object} [options] ora 的配置选项，默认为空对象
 * @returns {Object|undefined} ora 动画实例或 undefined（非 TTY 环境）
 */
export default function createSpinner(text, options = {}) {
  let spinner
  // 提取 prefixText（如果 text 是对象）
  let prefixText = text && typeof text === 'object' && text.prefixText

  // 检查是否在 TTY 终端环境中
  if (process.stdout.isTTY) {
    // 创建 ora 动画实例
    spinner = ora({
      text: typeof text === 'string' ? text : undefined, // 设置动画文本
      prefixText: typeof prefixText === 'string' ? prefixText : undefined, // 设置前缀文本
      spinner: dotsSpinner, // 使用点样式动画
      stream: process.stdout, // 输出到标准输出
      ...options, // 扩展其他配置选项
    }).start()

    // 保存原始 console 方法
    const origLog = console.log
    const origWarn = console.warn
    const origError = console.error
    const origStop = spinner.stop.bind(spinner)
    const origStopAndPersist = spinner.stopAndPersist.bind(spinner)

    // 定义日志处理函数，暂停动画以输出日志后恢复
    const logHandle = (method, args) => {
      origStop() // 暂停动画
      method(...args) // 调用原始日志方法
      spinner.start() // 恢复动画
    }

    // 重写 console 方法以支持动画
    console.log = (...args) => logHandle(origLog, args)
    console.warn = (...args) => logHandle(origWarn, args)
    console.error = (...args) => logHandle(origError, args)

    // 重置 console 方法的函数
    const resetLog = () => {
      console.log = origLog
    }

    // 重写 spinner 的 stop 方法
    spinner.stop = () => {
      origStop() // 调用原始 stop 方法
      resetLog() // 恢复 console 方法
      return spinner
    }

    // 重写 spinner 的 stopAndPersist 方法
    spinner.stopAndPersist = () => {
      origStopAndPersist() // 调用原始 stopAndPersist 方法
      resetLog() // 恢复 console 方法
      return spinner
    }
  } else if (prefixText || text) {
    // 非 TTY 环境，简单打印文本
    console.log(prefixText ? prefixText + '...' : text)
  }

  return spinner
}

/*
代码功能说明
作用：该文件提供了一个函数，用于创建终端加载动画（spinner），用于在 Next.js 构建或开发过程中显示进度提示。

参数：
text：动画显示的文本（字符串）或配置对象（包含 prefixText）。

options：ora 的配置选项，默认为空对象。

逻辑：
TTY 环境：如果运行在 TTY 终端（交互式终端），使用 ora 创建点样式加载动画，并重写 console.log 等方法以暂停/恢复动画。

非 TTY 环境：如果不是 TTY 环境（如管道或重定向输出），直接打印文本或前缀文本加“...”。

重写 console 方法：在动画运行期间，临时重写 console.log/warn/error，确保日志输出时暂停动画，输出后恢复。

停止动画：重定义 spinner.stop 和 spinner.stopAndPersist，在停止动画时恢复原始 console 方法

/***** */