// 导入 Webpack 的 Compiler
import { Compiler } from 'webpack'; 

/**
 * Webpack 插件：模拟 Webpack 3 的文件名和块文件名行为
 * 修复 https://github.com/webpack/webpack/issues/6598
 * 基于 https://github.com/researchgate/webpack/commit/2f28947fa0c63ccbb18f39c0098bd791a2c37090
 */
export default class ChunkNamesPlugin {
  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 compilation 钩子
    compiler.hooks.compilation.tap('NextJsChunkNamesPlugin', (compilation) => {
      // 拦截 chunkTemplate 的 renderManifest 钩子
      compilation.chunkTemplate.hooks.renderManifest.intercept({
        /**
         * 注册拦截器
         * @param {Object} tapInfo - 钩子信息
         * @returns {Object} 修改后的钩子信息
         */
        register(tapInfo) {
          // 仅处理 JavascriptModulesPlugin
          if (tapInfo.name === 'JavascriptModulesPlugin') {
            const originalMethod = tapInfo.fn;
            // 重写钩子函数
            tapInfo.fn = (result, options) => {
              let filenameTemplate;
              const chunk = options.chunk;
              const outputOptions = options.outputOptions;

              // 确定文件名模板
              if (chunk.filenameTemplate) {
                // 使用块的自定义文件名模板
                filenameTemplate = chunk.filenameTemplate;
              } else if (chunk.hasEntryModule()) {
                // 如果是入口模块，使用 outputOptions.filename
                filenameTemplate = outputOptions.filename;
              } else {
                // 否则使用 outputOptions.chunkFilename
                filenameTemplate = outputOptions.chunkFilename;
              }

              // 设置文件名模板
              options.chunk.filenameTemplate = filenameTemplate;
              // 调用原始方法
              return originalMethod(result, options);
            };
          }
          return tapInfo;
        },
      });
    });
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，模拟 Webpack 3 的 filename 和 chunkFilename 行为。
修复 Webpack 4 的文件名问题（https://github.com/webpack/webpack/issues/6598），确保块文件名正确生成。
基于 ResearchGate 的 Webpack 补丁（https://github.com/researchgate/webpack/commit/2f28947fa0c63ccbb18f39c0098bd791a2c37090）。

主要功能：
监听编译：通过 compiler.hooks.compilation.tap 监听 compilation 事件。
拦截渲染清单：使用 chunkTemplate.hooks.renderManifest.intercept 拦截 JavascriptModulesPlugin 的渲染逻辑。

设置文件名模板：
如果 chunk.filenameTemplate 存在，使用它。
如果块是入口模块（chunk.hasEntryModule()），使用 outputOptions.filename。
否则，使用 outputOptions.chunkFilename。
将选择的文件名模板赋值给 options.chunk.filenameTemplate。
调用原始方法：执行原始的 JavascriptModulesPlugin 方法，确保其他逻辑不受影响。

逻辑：
动态调整块的文件名模板，解决 Webpack 4 中文件名不一致的问题。
仅影响 JavascriptModulesPlugin，其他插件保持原样。
通过拦截器（intercept）实现非侵入式修改。

用途：
在 Next.js 9.1.1 的构建流程中，确保页面和块的输出文件名正确，符合 Webpack 3 的行为。
解决生产环境中哈希文件名或动态块的问题。
在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new ChunkNamesPlugin(),
]


/***** */