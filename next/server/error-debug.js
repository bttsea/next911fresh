// 导入 React，用于 JSX 渲染
const React = require('react');
// 导入 Head 组件，用于服务端渲染的 head 标签管理
const Head = require('../next-server/lib/head');

// 定义错误调试组件，仅在服务端渲染
// 参数：error（错误对象），info（附加信息，如组件栈）
function ErrorDebug({ error, info }) {
  // 返回包含错误信息的调试界面
  return (
    <div style={styles.errorDebug}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <StackTrace error={error} info={info} />
    </div>
  );
}

// 定义堆栈跟踪组件，显示错误名称、消息和堆栈信息
// 参数：error（错误对象，包含 name, message, stack），info（附加信息）
function StackTrace({ error: { name, message, stack }, info }) {
  return (
    <div>
      {/* 显示错误消息或名称 */}
      <div style={styles.heading}>{message || name}</div>
      {/* 显示错误堆栈 */}
      <pre style={styles.stack}>{stack}</pre>
      {/* 如果有附加信息，显示组件栈 */}
      {info && <pre style={styles.stack}>{info.componentStack}</pre>}
    </div>
  );
}

// 定义样式对象，用于错误调试界面的布局和外观
const styles = {
  errorDebug: {
    background: '#ffffff',
    boxSizing: 'border-box',
    overflow: 'auto',
    padding: '24px',
    position: 'fixed',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    color: '#000000',
  },
  stack: {
    fontFamily:
      '"SF Mono", "Roboto Mono", "Fira Mono", consolas, menlo-regular, monospace',
    fontSize: '13px',
    lineHeight: '18px',
    color: '#777',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    marginTop: '16px',
  },
  heading: {
    fontFamily:
      '-apple-system, system-ui, BlinkMacSystemFont, Roboto, "Segoe UI", "Fira Sans", Avenir, "Helvetica Neue", "Lucida Grande", sans-serif',
    fontSize: '20px',
    fontWeight: '400',
    lineHeight: '28px',
    color: '#000000',
    marginBottom: '0px',
    marginTop: '0px',
  },
};

// 调试日志，确认组件导出
console.log('Exporting ErrorDebug component:', ErrorDebug);

// 导出方式，兼容 require 和 import
module.exports = ErrorDebug;
module.exports.ErrorDebug = ErrorDebug;
module.exports.default = ErrorDebug;


/*
错误信息展示：
渲染全屏错误叠加层，显示错误（error）的名称（name）、消息（message）、堆栈跟踪（stack）以及组件堆栈（info.componentStack）。

示例：运行时错误 ReferenceError: x is not defined 显示详细堆栈。




Next.js 9.1.1 默认使用 Babel 处理 JSX（通过 @babel/preset-react），将 JSX 转换为 React.createElement。
示例：<div style={styles.errorDebug}> 转译为 React.createElement('div', { style: styles.errorDebug }, ...).

/***** */
