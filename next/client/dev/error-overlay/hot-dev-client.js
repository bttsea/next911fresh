/* eslint-disable camelcase */

// 本文件基于 https://github.com/facebook/create-react-app/blob/v1.1.4/packages/react-dev-utils/webpackHotDevClient.js
// 已修改以依赖 webpack-hot-middleware，并适配 SSR 和 Next.js 需求

'use strict';

import { getEventSourceWrapper } from './eventsource';
import formatWebpackMessages from './format-webpack-messages';
import * as ErrorOverlay from 'react-error-overlay';
import stripAnsi from 'strip-ansi';
import { rewriteStacktrace } from './source-map-support';
import fetch from 'unfetch';

// 跟踪是否发生过运行时错误
let hadRuntimeError = false;
// 自定义 HMR 事件处理函数
let customHmrEventHandler;

/**
 * 初始化 Webpack 热模块替换（HMR）客户端
 * @param {Object} options - 配置选项，包含事件源路径和超时等
 * @returns {Object} - HMR 客户端接口，包含订阅事件和错误报告方法
 */
export default function connect(options) {
  // 配置错误覆盖，点击堆栈跟踪打开编辑器
  ErrorOverlay.setEditorHandler(function editorHandler({ fileName, lineNumber, colNumber }) {
    // 清理 react-error-overlay 的无效路径（如 "webpack://"）
    const resolvedFilename = fileName.replace(/^webpack:\/\//, '');
    // 发起请求，打开编辑器中的文件
    fetch(
      '/_next/development/open-stack-frame-in-editor' +
        `?fileName=${window.encodeURIComponent(resolvedFilename)}` +
        `&lineNumber=${lineNumber || 1}` +
        `&colNumber=${colNumber || 1}`
    );
  });

  // 监听运行时错误，确保状态异常时强制重载
  ErrorOverlay.startReportingRuntimeErrors({
    onError: function () {
      hadRuntimeError = true;
    },
  });

  // 在模块热替换销毁时停止运行时错误报告
  if (module.hot && typeof module.hot.dispose === 'function') {
    module.hot.dispose(function () {
      ErrorOverlay.stopReportingRuntimeErrors();
    });
  }

  // 监听事件源消息，处理 HMR 事件
  getEventSourceWrapper(options).addMessageListener(event => {
    // 忽略心跳事件
    if (event.data === '\uD83D\uDC93') {
      return;
    }
    try {
      processMessage(event);
    } catch (ex) {
      console.warn('无效的 HMR 消息: ' + event.data + '\n' + ex);
    }
  });

  return {
    /**
     * 订阅自定义 HMR 事件
     * @param {Function} handler - 事件处理函数
     */
    subscribeToHmrEvent(handler) {
      customHmrEventHandler = handler;
    },
    /**
     * 报告运行时错误
     * @param {Error} err - 错误对象
     */
    reportRuntimeError(err) {
      ErrorOverlay.reportRuntimeError(err);
    },
    /**
     * 准备错误对象，重写堆栈跟踪
     * @param {Error} err - 原始错误对象
     * @returns {Error} - 处理后的错误对象
     */
    prepareError(err) {
      hadRuntimeError = true;
      const error = new Error(err.message);
      error.name = err.name;
      error.stack = err.stack;
      // 重写堆栈路径，使用环境变量 __NEXT_DIST_DIR
      rewriteStacktrace(error, process.env.__NEXT_DIST_DIR);
      return error;
    },
  };
}

// HMR 相关状态
let isFirstCompilation = true; // 是否首次编译
let mostRecentCompilationHash = null; // 最新编译哈希
let hasCompileErrors = false; // 是否存在编译错误
let deferredBuildError = null; // 延迟的构建错误处理

/**
 * 清理过时的编译错误
 */
function clearOutdatedErrors() {
  // 清除控制台中的旧错误
  if (typeof console !== 'undefined' && typeof console.clear === 'function') {
    if (hasCompileErrors) {
      console.clear();
    }
  }
  deferredBuildError = null;
}

/**
 * 处理成功编译
 */
function handleSuccess() {
  const isHotUpdate = !isFirstCompilation;
  isFirstCompilation = false;
  hasCompileErrors = false;

  // 尝试应用热更新或重载
  if (isHotUpdate) {
    tryApplyUpdates(function onHotUpdateSuccess() {
      if (deferredBuildError) {
        deferredBuildError();
      } else {
        ErrorOverlay.dismissBuildError();
      }
    });
  }
}

/**
 * 处理编译警告（如 ESLint 问题）
 * @param {string[]} warnings - 警告消息数组
 */
function handleWarnings(warnings) {
  clearOutdatedErrors();

  // 格式化警告消息
  const formatted = formatWebpackMessages({
    warnings: warnings,
    errors: [],
  });

  // 输出最多 5 条警告到控制台
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    for (let i = 0; i < formatted.warnings.length; i++) {
      if (i === 5) {
        console.warn(
          '还有更多警告在其他文件中。\n' +
            '请在终端查看完整日志。'
        );
        break;
      }
      console.warn(stripAnsi(formatted.warnings[i]));
    }
  }
}

/**
 * 处理编译错误（如语法错误或模块缺失）
 * @param {string[]} errors - 错误消息数组
 */
function handleErrors(errors) {
  clearOutdatedErrors();

  isFirstCompilation = false;
  hasCompileErrors = true;

  // 格式化错误消息
  const formatted = formatWebpackMessages({
    errors: errors,
    warnings: [],
  });

  // 显示第一个错误到错误覆盖
  ErrorOverlay.reportBuildError(formatted.errors[0]);

  // 输出所有错误到控制台
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    for (let i = 0; i < formatted.errors.length; i++) {
      console.error(stripAnsi(formatted.errors[i]));
    }
  }
}

/**
 * 处理新的编译哈希
 * @param {string} hash - 新编译的哈希值
 */
function handleAvailableHash(hash) {
  mostRecentCompilationHash = hash;
}

/**
 * 处理服务器推送的 HMR 消息
 * @param {Event} e - 事件源消息事件
 */
function processMessage(e) {
  const obj = JSON.parse(e.data);
  switch (obj.action) {
    case 'building': {
      console.log(
        '[HMR] 模块 ' + (obj.name ? "'" + obj.name + "' " : '') + '正在重新编译'
      );
      break;
    }
    case 'built':
    case 'sync': {
      clearOutdatedErrors();

      if (obj.hash) {
        handleAvailableHash(obj.hash);
      }

      const { errors, warnings } = obj;
      const hasErrors = Boolean(errors && errors.length);
      const hasWarnings = Boolean(warnings && warnings.length);

      if (hasErrors) {
        if (obj.action === 'sync') {
          hadRuntimeError = true;
        }
        handleErrors(errors);
        break;
      } else if (hasWarnings) {
        handleWarnings(warnings);
      }

      handleSuccess();
      break;
    }
    case 'typeChecked': {
      const [{ errors, warnings }] = obj.data;
      const hasErrors = Boolean(errors && errors.length);
      const hasWarnings = Boolean(warnings && warnings.length);

      if (hasErrors) {
        if (canApplyUpdates()) {
          handleErrors(errors);
        } else {
          deferredBuildError = () => handleErrors(errors);
        }
      } else if (hasWarnings) {
        handleWarnings(warnings);
      }
      break;
    }
    default: {
      if (customHmrEventHandler) {
        customHmrEventHandler(obj);
        break;
      }
      break;
    }
  }
}

/**
 * 检查是否有新版本的代码可用
 * @returns {boolean} - 是否有新编译版本
 */
function isUpdateAvailable() {
  // __webpack_hash__ 是 Webpack 注入的当前编译哈希
  return mostRecentCompilationHash !== __webpack_hash__;
}

/**
 * 检查是否可以应用热更新
 * @returns {boolean} - 是否处于空闲状态
 */
function canApplyUpdates() {
  return module.hot.status() === 'idle';
}

/**
 * 尝试应用热更新，失败时回退到页面重载
 * @param {Function} onHotUpdateSuccess - 热更新成功的回调
 */
async function tryApplyUpdates(onHotUpdateSuccess) {
  if (!module.hot) {
    console.error('未在 Webpack 配置中启用 HotModuleReplacementPlugin。');
    return;
  }

  if (!isUpdateAvailable() || !canApplyUpdates()) {
    ErrorOverlay.dismissBuildError();
    return;
  }

  /**
   * 处理热更新结果
   * @param {Error|null} err - 更新错误
   * @param {any} updatedModules - 更新模块
   */
  function handleApplyUpdates(err, updatedModules) {
    if (err || hadRuntimeError) {
      if (err) {
        console.warn('应用更新时出错，正在重载页面', err);
      }
      if (hadRuntimeError) {
        console.warn('之前存在运行时错误，正在重载页面');
      }
      window.location.reload();
      return;
    }

    if (typeof onHotUpdateSuccess === 'function') {
      onHotUpdateSuccess();
    }

    if (isUpdateAvailable()) {
      tryApplyUpdates();
    }
  }

  try {
    const updatedModules = await module.hot.check({
      ignoreUnaccepted: true,
    });
    if (updatedModules) {
      handleApplyUpdates(null, updatedModules);
    }
  } catch (err) {
    handleApplyUpdates(err, null);
  }
}


/*
hot-dev-client.js 的用途
在 Next.js 9.1.1 中，client/dev/error-overlay/hot-dev-client.js 是开发环境的核心模块，负责实现 Webpack 热模块替换（HMR）和错误覆盖功能。它基于 Create React App 的 webpackHotDevClient.js，但适配了 webpack-hot-middleware 和 Next.js 的 SSR 需求。主要功能包括：
HMR 事件处理：
通过 getEventSourceWrapper（从 eventsource.js 导入）监听 /_next/webpack-hmr 的事件流。
处理事件如 building（编译中）、built/sync（编译完成）、typeChecked（类型检查）。
错误覆盖：
使用 react-error-overlay 显示编译错误和运行时错误。
通过 formatWebpackMessages 格式化 Webpack 错误/警告，清理冗余信息。
通过 rewriteStacktrace 重写错误堆栈路径，指向客户端可访问的源代码（如 /_next/development）。

运行时错误管理：
跟踪运行时错误（hadRuntimeError），在必要时强制页面重载。
配置错误覆盖点击跳转编辑器（通过 /_next/development/open-stack-frame-in-editor）。

热更新：
检测新编译版本（isUpdateAvailable），调用 module.hot.check 应用热更新。
失败或运行时错误时回退到页面重载。

集成：
由 next-dev.js 或其他开发模块调用（如 webpack-hot-middleware-client.js），与 on-demand-entries-utils.js 等配合。
提供 subscribeToHmrEvent 接口，允许自定义 HMR 事件处理。











依赖模块：
eventsource.js：提供事件源连接，处理 HMR 事件。
format-webpack-messages.js：格式化错误/警告消息。
source-map-support.js：重写堆栈路径（你提供的 source-map-support.ts）。
strip-ansi：移除控制台消息中的 ANSI 颜色代码。
unfetch：发起编辑器打开请求。
react-error-overlay：渲染错误浮层。

HMR 事件：
building：通知编译开始。
built/sync：编译完成，包含错误/警告。
typeChecked：类型检查结果。
心跳（'\uD83D\uDC93'）：保持连接活跃。



/***** */