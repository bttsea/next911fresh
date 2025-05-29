// 导入 unistore 状态管理库
import createStore from './unistore'
// 导入 ANSI 字符剥离库
import stripAnsi from 'strip-ansi'

// 导入日志输出模块
import * as Log from './log'

// 创建状态存储
export const store = createStore({ appUrl: null, bootstrap: true })

// 存储上一次的状态
let lastStore = {}

/**
 * 检查状态是否发生变化
 * @param {Object} nextStore 新的状态
 * @returns {boolean} 是否发生变化
 */
function hasStoreChanged(nextStore) {
  // 比较所有键的值是否相同
  if (
    [...new Set([...Object.keys(lastStore), ...Object.keys(nextStore)])].every(
      key => Object.is(lastStore[key], nextStore[key])
    )
  ) {
    return false
  }

  // 更新最后状态
  lastStore = nextStore
  return true
}

// 订阅状态变化
store.subscribe(state => {
  // 如果状态未变化，直接返回
  if (!hasStoreChanged(state)) {
    return
  }

  // 处理启动状态
  if (state.bootstrap) {
    Log.wait('正在启动开发服务器 ...')
    if (state.appUrl) {
      Log.info(`正在等待 ${state.appUrl} ...`)
    }
    return
  }

  // 处理加载状态
  if (state.loading) {
    Log.wait('正在编译 ...')
    return
  }

  // 处理错误状态
  if (state.errors) {
    Log.error(state.errors[0])

    // 清理 ANSI 颜色代码
    const cleanError = stripAnsi(state.errors[0])
    if (cleanError.includes('SyntaxError')) {
      const matches = cleanError.match(/\[.*\]=/)
      if (matches) {
        for (const match of matches) {
          const prop = (match.split(']').shift() || '').substr(1)
          console.log(
            `AMP bind 语法 [${prop}]='' 在 JSX 中不支持，请使用 'data-amp-bind-${prop}' 替代。详情见：https://err.sh/zeit/next.js/amp-bind-jsx-alt`
          )
        }
        return
      }
    }

    return
  }

  // 处理警告状态
  if (state.warnings) {
    Log.warn(state.warnings.join('\n\n'))
    if (state.appUrl) {
      Log.info(`已就绪，可访问 ${state.appUrl}`)
    }
    return
  }

  // 处理类型检查状态
  if (state.typeChecking) {
    Log.info('打包成功，等待类型检查结果 ...')
    return
  }

  // 处理编译成功状态
  Log.ready(
    '编译成功' + (state.appUrl ? ` - 已就绪，可访问 ${state.appUrl}` : '')
  )
})



/*
代码功能说明
作用：该文件提供了一个状态管理模块，使用 unistore 管理 Next.js 开发服务器的输出状态，并在状态变化时通过 Log 模块输出格式化的日志。

主要功能：
创建一个状态存储（store），初始状态为 { appUrl: null, bootstrap: true }。

定义 hasStoreChanged 函数，比较当前状态和上次状态，检测变化。

订阅状态变化，根据状态类型输出不同日志：
bootstrap：启动开发服务器。

loading：正在编译。

errors：输出错误信息，处理 AMP bind 语法错误。

warnings：输出警告并显示应用 URL。

typeChecking：等待类型检查结果。

其他：编译成功并显示应用 URL。

逻辑：
使用 stripAnsi 清理错误消息中的 ANSI 颜色代码，便于分析。

处理 AMP bind 语法问题，输出特定错误提示。

通过 Log 模块（0old_log.js）输出带前缀的日志。
 

/***** */