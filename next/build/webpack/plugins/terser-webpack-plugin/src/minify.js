/* eslint-disable
  arrow-body-style
*/

// 导入 Terser 的 minify 函数
import { minify as terser } from 'terser';

/**
 * 构建 Terser 配置选项
 * @param {Object} options - Terser 配置参数
 * @returns {Object} 格式化的 Terser 配置
 */
const buildTerserOptions = ({
  ecma,
  warnings,
  parse = {},
  compress = {},
  mangle,
  module,
  output,
  toplevel,
  ie8,
  /* eslint-disable camelcase */
  keep_classnames,
  keep_fnames,
  /* eslint-enable camelcase */
  safari10,
} = {}) => ({
  ecma,
  warnings,
  parse: { ...parse },
  compress: typeof compress === 'boolean' ? compress : { ...compress },
  // eslint-disable-next-line no-nested-ternary
  mangle:
    mangle == null
      ? true
      : typeof mangle === 'boolean'
      ? mangle
      : { ...mangle },
  output: {
    shebang: true, // 保留 shebang 脚本头
    comments: false, // 移除注释
    beautify: false, // 不美化代码
    semicolons: true, // 使用分号
    ...output,
  },
  module,
  toplevel,
  ie8,
  keep_classnames,
  keep_fnames,
  safari10,
});

/**
 * 执行代码压缩
 * @param {Object} options - 压缩选项
 * @param {string} options.file - 文件名
 * @param {string} options.input - 输入代码
 * @param {string} [options.inputSourceMap] - 输入源映射（可选）
 * @param {Object} [options.terserOptions] - Terser 配置（可选）
 * @returns {Object} 压缩结果，包括错误、映射、代码和警告
 */
const minify = (options) => {
  const { file, input, inputSourceMap, terserOptions } = options;

  // 复制 Terser 配置
  const formattedTerserOptions = buildTerserOptions(terserOptions);

  // 添加源映射数据
  if (inputSourceMap) {
    formattedTerserOptions.sourceMap = {
      content: inputSourceMap,
    };
  }

  // 执行压缩
  const { error, map, code, warnings } = terser(
    { [file]: input },
    formattedTerserOptions
  );

  return { error, map, code, warnings };
};

// 导出 minify 函数
export default minify;



/*
代码功能说明
作用：
这是 terser-webpack-plugin 的 核心核心核心核心核心 模块，用于在 Webpack 构建中压缩 JavaScript 代码。

在 Next.js 9.1.1 的构建流程中，优化输出文件的体积，提升加载性能。

主要功能：
配置格式化（buildTerserOptions）：
接受 Terser 配置参数（如 ecma, compress, mangle），设置默认值。

合并用户提供的选项，处理布尔值和对象类型。

配置输出选项（output），禁用注释（comments: false）、美化（beautify: false），保留 shebang 和分号。

支持特定选项（如 keep_classnames, safari10），兼容旧浏览器。

代码压缩（minify）：
接受文件名（file）、输入代码（input）、源映射（inputSourceMap）和 Terser 配置（terserOptions）。

添加源映射支持（如果提供）。

调用 Terser 的 minify 方法，压缩代码。

返回压缩结果，包括错误（error）、源映射（map）、压缩代码（code）和警告（warnings）。

逻辑：
格式化 Terser 配置，确保默认值和用户选项正确合并。

处理源映射，保持调试能力。

执行压缩，捕获结果和潜在错误。

支持 Webpack 的资产优化流程。

用途：
在 Next.js 9.1.1 的 Webpack 构建中，压缩 JavaScript 文件（如页面、块、动态模块）。

减少 .next 目录中的文件体积，优化客户端和 SSR 性能。

在 H:\next911fresh\next\build\webpack-config.js 中通过 terser-webpack-plugin 使用：
javascript

const TerserPlugin = require('terser-webpack-plugin');
optimization: {
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        ecma: 5,
        compress: true,
        mangle: true,
      },
    }),
  ],
}


/**** */