// 正则表达式，匹配堆栈跟踪中的文件名、行号和列号（如 "(file.js:12:34)"）
const filenameRE = /\(([^)]+\.js):(\d+):(\d+)\)$/;

/**
 * 重写错误对象的堆栈跟踪，将服务器端文件路径替换为客户端路径
 * @param {Error} e - 错误对象
 * @param {string} distDir - 服务器端构建目录（如 ".next"）
 */
export function rewriteStacktrace(e, distDir) {
  // 检查错误对象和堆栈是否有效
  if (!e || typeof e.stack !== 'string') {
    return;
  }

  // 将堆栈按行分割
  const lines = e.stack.split('\n');

  // 处理每一行，重写文件路径
  const result = lines.map((line) => {
    return rewriteTraceLine(line, distDir);
  });

  // 更新错误对象的堆栈
  e.stack = result.join('\n');
}

/**
 * 重写单行堆栈跟踪，替换文件路径
 * @param {string} trace - 单行堆栈跟踪
 * @param {string} distDir - 服务器端构建目录
 * @returns {string} - 重写后的堆栈行
 */
function rewriteTraceLine(trace, distDir) {
  // 匹配文件名、行号和列号
  const m = trace.match(filenameRE);
  if (m == null) {
    return trace;
  }

  // 提取文件名
  const filename = m[1];
  // 将服务器端路径替换为客户端路径（如 ".next" -> "/_next/development"）
  // 统一使用正斜杠（/）替换反斜杠（\）
  const filenameLink = filename
    .replace(distDir, '/_next/development')
    .replace(/\\/g, '/');

  // 替换原始文件名
  trace = trace.replace(filename, filenameLink);
  return trace;
}


/*
使用场景：
在 Next.js 开发环境中，当代码抛出错误时，重写堆栈路径，重写堆栈路径，重写堆栈路径，
使错误覆盖显示的路径可点击，
使错误覆盖显示的路径可点击，
使错误覆盖显示的路径可点击，
使错误覆盖显示的路径可点击，
使错误覆盖显示的路径可点击，
使错误覆盖显示的路径可点击，
使错误覆盖显示的路径可点击，
链接到开发服务器的源映射（source map）。
例如，将 (.next/server/pages/index.js:4:9) 重写为 (/ _next/development/server/pages/index.js:4:9)。




rewrite-stacktrace.js 的用途
在 Next.js 9.1.1 中，client/dev/rewrite-stacktrace.js 是一个开发环境的辅助模块，用于重写 Webpack 或 JavaScript 错误堆栈跟踪中的文件路径。它的主要功能包括：
路径替换：
将服务器端构建目录（如 .next）替换为客户端可访问的路径（如 /_next/development）。
统一使用正斜杠（/）替换反斜杠（\），适配浏览器环境。
错误定位：
确保错误覆盖（error overlay）显示的堆栈跟踪指向正确的源代码位置，方便开发者调试。
例如，将 (.next/server/pages/index.js:12:34) 重写为 (/ _next/development/server/pages/index.js:12:34)。
正则匹配：
使用 filenameRE 匹配堆栈行中的文件名、行号和列号（如 (file.js:12:34)）。
集成：
被 Next.js 的错误覆盖系统调用（例如，通过 error-overlay.js 或 next-dev.js），与 format-webpack-messages.js 配合使用。
主要服务于开发环境的错误显示，生产环境中不使用。


/**** */