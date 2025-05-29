// 导入 loader-utils 模块
import loaderUtils from 'loader-utils';

/**
 * Webpack Loader：处理文件内容并输出到指定名称的文件
 * @param {string} content - 输入文件的内容
 * @param {Object} sourceMap - 源映射（可选）
 */
export default function (content, sourceMap) {
  // 启用缓存
  this.cacheable();

  // 获取异步回调函数
  const callback = this.async();

  // 获取当前文件的路径
  const resourcePath = this.resourcePath;

  // 获取 Loader 的配置参数
  const query = loaderUtils.getOptions(this);

  // 如果配置了 validateFileName，验证文件名
  if (query.validateFileName) {
    try {
      query.validateFileName(resourcePath);
    } catch (err) {
      callback(err);
      return;
    }
  }

  // 设置输出文件名，默认为 '[hash].[ext]'
  const name = query.name || '[hash].[ext]';

  // 设置上下文路径，优先级：query.context > rootContext > options.context
  const context = query.context || this.rootContext || this.options.context;

  // 获取正则表达式（可选）
  const regExp = query.regExp;

  // 构建 interpolateName 参数
  const opts = { context, content, regExp };

  // 使用自定义 interpolateName 函数（默认直接返回名称）
  const interpolateName = query.interpolateName || ((name) => name);

  // 生成最终文件名
  const interpolatedName = interpolateName(
    loaderUtils.interpolateName(this, name, opts),
    { name, opts }
  );

  /**
   * 输出文件并调用回调
   * @param {string} code - 输出内容
   * @param {Object} map - 源映射
   */
  function emit(code, map) {
    // 输出文件到指定名称
    this.emitFile(interpolatedName, code, map);
    // 调用回调，传递结果
    callback(null, code, map);
  }

  // 如果配置了 transform 函数，处理内容
  if (query.transform) {
    const transformed = query.transform({
      content,
      sourceMap,
      interpolatedName,
    });
    return emit(transformed.content, transformed.sourceMap);
  }

  // 默认直接输出原始内容
  return emit(content, sourceMap);
};


/*
代码功能说明
作用：
这是一个 Webpack Loader，用于处理文件内容并将其输出到指定名称的文件，常用于 Next.js 的构建流程。

它支持自定义文件名、内容转换和文件名验证，适合处理动态资源（如 JavaScript、CSS 或图片）。

主要功能：
文件名验证：
如果配置了 query.validateFileName，验证输入文件的路径（如 .js 或 .jsx）。
捕获错误并通过 callback 抛出。

文件名生成：
使用 loaderUtils.interpolateName 生成文件名，基于 query.name（默认 [hash].[ext]）。

支持 query.context 和 query.regExp 自定义路径和规则。

可通过 query.interpolateName 进一步自定义文件名。

内容转换：
如果配置了 query.transform，对内容和源映射进行转换，返回 { content, sourceMap }。
否则直接使用原始 content 和 sourceMap。

文件输出：
使用 this.emitFile 输出文件到生成的文件名。
通过 callback 异步返回处理结果。



/***** */


/*

import loaderUtils from 'loader-utils'

module.exports = function (content, sourceMap) {
  this.cacheable()
  const callback = this.async()
  const resourcePath = this.resourcePath

  const query = loaderUtils.getOptions(this)

  // Allows you to do checks on the file name. For example it's used to check if there's both a .js and .jsx file.
  if (query.validateFileName) {
    try {
      query.validateFileName(resourcePath)
    } catch (err) {
      callback(err)
      return
    }
  }

  const name = query.name || '[hash].[ext]'
  const context = query.context || this.rootContext || this.options.context
  const regExp = query.regExp
  const opts = { context, content, regExp }
  const interpolateName = query.interpolateName || (name => name)
  const interpolatedName = interpolateName(
    loaderUtils.interpolateName(this, name, opts),
    { name, opts }
  )
  const emit = (code, map) => {
    this.emitFile(interpolatedName, code, map)
    callback(null, code, map)
  }

  if (query.transform) {
    const transformed = query.transform({
      content,
      sourceMap,
      interpolatedName
    })
    return emit(transformed.content, transformed.sourceMap)
  }

  return emit(content, sourceMap)
}
/***** */