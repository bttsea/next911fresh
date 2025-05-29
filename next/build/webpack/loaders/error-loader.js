// 导入 loader-utils 模块
import loaderUtils from 'loader-utils';

/**
 * Webpack Loader：抛出错误信息
 * @param {string} content - 输入文件的内容（未使用）
 */
function ErrorLoader() {
  // 获取 Loader 的配置参数，默认为空对象
  const options = loaderUtils.getOptions(this) || {};

  // 从配置中提取错误原因，默认为 'An unknown error has occurred'
  const { reason = 'An unknown error has occurred' } = options;

  // 创建错误对象
  const err = new Error(reason);

  // 抛出错误
  this.emitError(err);
}

// 导出 Loader 函数
export default ErrorLoader;


/*
代码功能说明
作用：
这是一个 Webpack Loader，用于在构建过程中抛出错误信息，通常用于调试或阻止构建继续。

它从配置中读取错误原因（options.reason），并通过 this.emitError 抛出错误。

主要功能：
获取配置：
使用 loaderUtils.getOptions(this) 获取 Loader 配置，默认为空对象。

提取错误原因：
从 options 中解构 reason，提供默认值 'An unknown error has occurred'。

抛出错误：
创建 Error 对象，包含指定的 reason。

使用 this.emitError 抛出错误，通知 Webpack 构建过程。

/***** */