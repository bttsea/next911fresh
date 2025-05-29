// 导入 Webpack 的 Compiler 和 Plugin
import { Compiler } from 'webpack';
// 导入 path 模块的 extname 函数
import { extname } from 'path';

/**
 * Webpack 插件：移除不需要的客户端页面
 */
export class DropClientPage {
  // 存储 AMP 页面集合
  ampPages = new Set();

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 emit 钩子
    compiler.hooks.emit.tap('DropClientPage', (compilation) => {
      // 遍历所有资源
      Object.keys(compilation.assets).forEach((assetKey) => {
        const asset = compilation.assets[assetKey];

        // 检查资源是否包含 __NEXT_DROP_CLIENT_FILE__
        if (
          asset &&
          asset._value &&
          asset._value.includes('__NEXT_DROP_CLIENT_FILE__')
        ) {
          // 规范化路径分隔符
          const cleanAssetKey = assetKey.replace(/\\/g, '/');
          // 提取页面路径
          const page = '/' + cleanAssetKey.split('pages/')[1];
          // 移除文件扩展名
          const pageNoExt = page.split(extname(page))[0];

          // 删除资源
          delete compilation.assets[assetKey];

          // 避免在子编译器中重复标记 AMP 页面
          if (!pageNoExt.endsWith('.module')) {
            // 将页面添加到 AMP 集合，处理 /index
            this.ampPages.add(pageNoExt.replace(/\/index$/, '') || '/');
          }
        }
      });
    });
  }
}

/*    next-drop-client-page-plugin.ts 插件主要用于移除标记为 __NEXT_DROP_CLIENT_FILE__ 的客户端页面资源


代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，移除不需要的客户端页面资源（如 AMP 页面）。
它检测包含 __NEXT_DROP_CLIENT_FILE__ 标记的资源，删除它们，并记录相关页面为 AMP 页面。

主要功能：
监听资源输出：
通过 compiler.hooks.emit.tap 在 emit 阶段处理 compilation.assets。

检测标记：
检查资源（asset._value）是否包含 __NEXT_DROP_CLIENT_FILE__。
该标记通常由 Next.js 的构建逻辑（如 AMP 优化）注入。

路径处理：
规范化路径分隔符（replace(/\\/g, '/')）。
提取页面路径（从 pages/ 开始），移除扩展名（extname）。
处理 /index 路径，转换为 /。

删除资源：
使用 delete compilation.assets[assetKey] 移除标记的资源。

记录 AMP 页面：
将页面（pageNoExt）添加到 ampPages 集合。
避免在子编译器中重复标记（跳过 .module 文件）。

逻辑：
在构建过程中，移除不需要的客户端页面（如 AMP 页面的非客户端版本）。


/***** */