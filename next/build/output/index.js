


// 导入 unistore 状态管理库
import createStore from './unistore'


// 导入 Webpack 消息格式化工具
import formatWebpackMessages from '../../client/dev/error-overlay/format-webpack-messages'
// 导入输出状态存储
import { store as consoleStore } from './store'
// 导入 TypeScript 检查插件
import forkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
// 导入代码框架格式化工具
import { createCodeframeFormatter } from 'fork-ts-checker-webpack-plugin/lib/formatter/codeframeFormatter'

// 记录上一次的客户端和服务端编译器
let previousClient = null
let previousServer = null

// 创建构建状态存储
const buildStore = createStore()

/**
 * 启动开发服务器
 * @param {string} appUrl 应用 URL
 */
export function startedDevelopmentServer(appUrl) {
  consoleStore.setState({ appUrl })
}

/**
 * 获取 Webpack 状态阶段
 * @param {Object} status Webpack 状态
 * @returns {number} 状态阶段
 */
function getWebpackStatusPhase(status) {
  if (status.loading) {
    return 1 // COMPILING
  }
  if (status.errors) {
    return 2 // COMPILED_WITH_ERRORS
  }
  if (status.typeChecking) {
    return 3 // TYPE_CHECKING
  }
  if (status.warnings) {
    return 4 // COMPILED_WITH_WARNINGS
  }
  return 5 // COMPILED
}

 

// 订阅构建状态变化
buildStore.subscribe((state) => {
  const { amp, client, server } = state

  // 按阶段排序，选择最低阶段状态
  const [{ status }] = [
    { status: client, phase: getWebpackStatusPhase(client) },
    { status: server, phase: getWebpackStatusPhase(server) },
  ].sort((a, b) => a.phase - b.phase)

  const { bootstrap: bootstrapping, appUrl } = consoleStore.getState()
  if (bootstrapping && status.loading) {
    return
  }

  // 更新状态
  let partialState = {
    bootstrap: false,
    appUrl,
  }

  if (status.loading) {
    consoleStore.setState({ ...partialState, loading: true }, true)
  } else {
    let { errors, warnings, typeChecking } = status

    if (errors == null) {
      if (typeChecking) {
        consoleStore.setState(
          { ...partialState, loading: false, typeChecking: true, errors, warnings },
          true
        )
        return
      }

 
    }

    consoleStore.setState(
      { ...partialState, loading: false, typeChecking: false, errors, warnings },
      true
    )
  }
})

 

/**
 * 监听编译器状态
 * @param {Object} client 客户端编译器
 * @param {Object} server 服务端编译器
 * @param {boolean} enableTypeCheckingOnClient 是否启用客户端类型检查
 * @param {Function} onTypeChecked 类型检查完成回调
 */
export function watchCompilers(client, server, enableTypeCheckingOnClient, onTypeChecked) {
  if (previousClient === client && previousServer === server) {
    return
  }

  // 初始化编译状态
  buildStore.setState({
    client: { loading: true },
    server: { loading: true },
    amp: {},
  })

  /**
   * 绑定编译器事件
   * @param {string} key 编译器标识
   * @param {Object} compiler 编译器实例
   * @param {boolean} hasTypeChecking 是否启用类型检查
   * @param {Function} onEvent 状态更新回调
   */
  function tapCompiler(key, compiler, hasTypeChecking, onEvent) {
    let tsMessagesPromise
    let tsMessagesResolver

    // 监听编译失效事件
    compiler.hooks.invalid.tap(`NextJsInvalid-${key}`, () => {
      tsMessagesPromise = undefined
      onEvent({ loading: true })
    })

    if (hasTypeChecking) {
      // 创建 TypeScript 格式化器
      const typescriptFormatter = createCodeframeFormatter({})

      // 在编译前初始化类型检查
      compiler.hooks.beforeCompile.tap(`NextJs-${key}-StartTypeCheck`, () => {
        tsMessagesPromise = new Promise((resolve) => {
          tsMessagesResolver = (msgs) => resolve(msgs)
        })
      })

      // 监听类型检查结果
      forkTsCheckerWebpackPlugin
        .getCompilerHooks(compiler)
        .receive.tap(`NextJs-${key}-afterTypeScriptCheck`, (diagnostics, lints) => {
          const allMsgs = [...diagnostics, ...lints]
          const format = (message) => typescriptFormatter(message, true)

          const errors = allMsgs
            .filter((msg) => msg.severity === 'error')
            .map((d) => ({
              file: (d.file || '').replace(/\\/g, '/'),
              message: format(d),
            }))
          const warnings = allMsgs
            .filter((msg) => msg.severity === 'warning')
            .map((d) => ({
              file: (d.file || '').replace(/\\/g, '/'),
              message: format(d),
            }))

          tsMessagesResolver({
            errors: errors.length ? errors : null,
            warnings: warnings.length ? warnings : null,
          })
        })
    }

    // 监听编译完成事件
    compiler.hooks.done.tap(`NextJsDone-${key}`, (stats) => {
      buildStore.setState({ amp: {} })

      // 格式化 Webpack 错误和警告
      const { errors, warnings } = formatWebpackMessages(
        stats.toJson({ all: false, warnings: true, errors: true })
      )

      const hasErrors = errors && errors.length
      const hasWarnings = warnings && warnings.length

      onEvent({
        loading: false,
        typeChecking: hasTypeChecking,
        errors: hasErrors ? errors : null,
        warnings: hasWarnings ? warnings : null,
      })

      const typePromise = tsMessagesPromise

      if (!hasErrors && typePromise) {
        typePromise.then((typeMessages) => {
          if (typePromise !== tsMessagesPromise) {
            return
          }

          // 过滤相关文件
          const reportFiles = stats.compilation.modules
            .map((m) => (m.resource || '').replace(/\\/g, '/'))
            .filter(Boolean)

          let filteredErrors = typeMessages.errors
            ? typeMessages.errors
                .filter(({ file }) => file && reportFiles.includes(file))
                .map(({ message }) => message)
            : null
          if (filteredErrors && filteredErrors.length < 1) {
            filteredErrors = null
          }
          let filteredWarnings = typeMessages.warnings
            ? typeMessages.warnings
                .filter(({ file }) => file && reportFiles.includes(file))
                .map(({ message }) => message)
            : null
          if (filteredWarnings && filteredWarnings.length < 1) {
            filteredWarnings = null
          }

          // 更新编译器错误和警告
          stats.compilation.errors.push(...(filteredErrors || []))
          stats.compilation.warnings.push(...(filteredWarnings || []))
          onTypeChecked({
            errors: stats.compilation.errors.length ? stats.compilation.errors : null,
            warnings: stats.compilation.warnings.length ? stats.compilation.warnings : null,
          })

          onEvent({
            loading: false,
            typeChecking: false,
            errors: filteredErrors,
            warnings: hasWarnings
              ? [...warnings, ...(filteredWarnings || [])]
              : filteredWarnings,
          })
        })
      }
    })
  }

  // 绑定客户端和服务端编译器事件
  tapCompiler('client', client, enableTypeCheckingOnClient, (status) =>
    buildStore.setState({ client: status })
  )
  tapCompiler('server', server, false, (status) =>
    buildStore.setState({ server: status })
  )

  // 更新缓存
  previousClient = client
  previousServer = server
}


/*
代码功能说明
作用：该文件管理 Next.js 开发服务器的输出状态，处理 Webpack 编译状态、 并通过 consoleStore 输出日志。

主要功能：
startedDevelopmentServer(appUrl)：设置开发服务器的 URL。

getWebpackStatusPhase(status)：确定 Webpack 编译阶段（编译中、错误、类型检查、警告、成功）。

 

 

watchCompilers(client, server, enableTypeCheckingOnClient, onTypeChecked)：监听客户端和服务端编译器，处理编译和类型检查事件。

逻辑：
使用 buildStore 管理构建状态（客户端、服务端、AMP）。

订阅 buildStore 状态变化，根据最低阶段更新 consoleStore。

 输出表格格式的错误和警告。

监听编译器事件（invalid, beforeCompile, done），处理 Webpack 和 TypeScript 错误/警告。

输出：
通过 consoleStore（0old_store.js）输出编译进度、错误、警告等日志。
 

/***** */