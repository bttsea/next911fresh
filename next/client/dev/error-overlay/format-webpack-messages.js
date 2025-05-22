
// 本文件基于 https://github.com/facebook/create-react-app/blob/7b1a32be6ec9f99a6c9a3c66813f3ac09c4736b9/packages/react-dev-utils/formatWebpackMessages.js
// 已移除 chalk 和 CRA 特定逻辑，适配 Next.js 错误覆盖需求

'use strict';

// 语法错误标签
const friendlySyntaxErrorLabel = 'Syntax error:';

/**
 * 检查消息是否可能为语法错误
 * @param {string} message - Webpack 错误或警告消息
 * @returns {boolean} - 是否包含语法错误标签
 */
function isLikelyASyntaxError(message) {
  return message.indexOf(friendlySyntaxErrorLabel) !== -1;
}

/**
 * 格式化 Webpack 错误或警告消息，清理冗余信息
 * @param {string} message - 原始消息
 * @param {boolean} isError - 是否为错误（true）或警告（false）
 * @returns {string} - 格式化后的消息
 */
function formatMessage(message, isError) {
  // 将消息按行分割
  let lines = message.split('\n');

  // 移除 Webpack 添加的模块头信息（如 "Module Error (from ..."）
  lines = lines.filter(line => !/Module [A-z ]+\(from/.test(line));

  // 将 ESLint 解析错误转换为友好的语法错误格式
  lines = lines.map(line => {
    const parsingError = /Line (\d+):(?:(\d+):)?\s*Parsing error: (.+)$/.exec(line);
    if (!parsingError) {
      return line;
    }
    const [, errorLine, errorColumn, errorMessage] = parsingError;
    return `${friendlySyntaxErrorLabel} ${errorMessage} (${errorLine}:${errorColumn})`;
  });

  // 重新组合消息
  message = lines.join('\n');

  // 处理 CSS 常见的 SyntaxError 格式
  message = message.replace(
    /SyntaxError\s+\((\d+):(\d+)\)\s*(.+?)\n/g,
    `${friendlySyntaxErrorLabel} $3 ($1:$2)\n`
  );

  // 移除 ESLint 格式器中的列信息（仅保留行号）
  message = message.replace(/Line (\d+):\d+:/g, 'Line $1:');

  // 清理导出相关错误，转换为更友好的提示
  message = message.replace(
    /^.*export '(.+?)' was not found in '(.+?)'.*$/gm,
    `尝试导入错误：'$1' 未从 '$2' 导出。`
  );
  message = message.replace(
    /^.*export 'default' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm,
    `尝试导入错误：'$2' 未包含默认导出（导入为 '$1'）。`
  );
  message = message.replace(
    /^.*export '(.+?)' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm,
    `尝试导入错误：'$1' 未从 '$3' 导出（导入为 '$2'）。`
  );

  lines = message.split('\n');

  // 移除开头的空行（如果存在）
  if (lines.length > 2 && lines[1].trim() === '') {
    lines.splice(1, 1);
  }

  // 清理文件名中的位置信息（如 "filename x:y-z"）
  lines[0] = lines[0].replace(/^(.*) \d+:\d+-\d+$/, '$1');

  // 处理模块未找到的错误，简化提示
  if (lines[1] && lines[1].indexOf('Module not found: ') === 0) {
    lines = [
      lines[0],
      lines[1]
        .replace('Error: ', '')
        .replace('Module not found: Cannot find file:', '无法找到文件：'),
    ];
  }

  message = lines.join('\n');

  // 移除无关的内部堆栈信息（保留 webpack: 开头的堆栈）
  message = message.replace(
    /^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(\n|$)/gm,
    ''
  );
  message = message.replace(/^\s*at\s<anonymous>(\n|$)/gm, '');

  lines = message.split('\n');

  // 移除重复的空行
  lines = lines.filter(
    (line, index, arr) =>
      index === 0 || line.trim() !== '' || line.trim() !== arr[index - 1].trim()
  );

  // 重新组合并移除首尾空白
  message = lines.join('\n');
  return message.trim();
}

/**
 * 格式化 Webpack 编译输出的错误和警告
 * @param {Object} json - Webpack 编译结果，包含 errors 和 warnings 数组
 * @returns {Object} - 格式化后的结果，包含 errors 和 warnings 数组
 */
function formatWebpackMessages(json) {
  // 格式化错误消息
  const formattedErrors = json.errors.map(function (message) {
    return formatMessage(message, true);
  });

  // 格式化警告消息
  const formattedWarnings = json.warnings.map(function (message) {
    return formatMessage(message, false);
  });

  const result = { errors: formattedErrors, warnings: formattedWarnings };

  // 如果存在语法错误，仅显示语法错误
  if (result.errors.some(isLikelyASyntaxError)) {
    result.errors = result.errors.filter(isLikelyASyntaxError);
  }

  return result;
}

// 导出格式化函数，支持模块化导入
module.exports = formatWebpackMessages;


/*
format-webpack-messages.js 的用途
在 Next.js 9.1.1 中，client/dev/error-overlay/format-webpack-messages.js 是一个开发环境的辅助模块，
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。
用于格式化 Webpack 编译输出的错误和警告消息，使其更易读和用户友好。

它的主要功能包括：
清理冗余信息：
移除 Webpack 添加的模块头信息（如 "Module Error (from ..."）。

清理内部堆栈跟踪（保留 webpack: 开头的用户代码堆栈）。

删除重复空行和匿名堆栈。

转换错误格式：
将 ESLint 解析错误（如 "Parsing error"）转换为友好的语法错误（Syntax error: ...）。

处理 CSS 语法错误，提取行号和消息。

简化模块未找到（Module not found）和导出错误（export ... was not found）的提示。

优先显示语法错误：
如果存在语法错误（包含 Syntax error:），仅显示这些错误，忽略其他错误。

集成：
被 Next.js 的错误覆盖（error overlay）系统调用，用于在开发环境的浏览器中显示格式化后的错误和警告。

基于 Create React App 的 react-dev-utils/formatWebpackMessages.js，但移除 chalk 和 CRA 特定逻辑，适配 Next.js。


/**** */