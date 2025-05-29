// 导入 path 模块的 join, resolve, relative, dirname 函数
import { join, resolve, relative, dirname } from 'path';
// 导入 Webpack 的 Compiler
import { Compiler } from 'webpack';

/**
 * Webpack 插件：修改 Webpack 的 require-ensure 代码以支持 Next.js 服务端渲染（SSR）
 */
export default class NextJsSsrImportPlugin {
  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 compilation 钩子
    compiler.hooks.compilation.tap('NextJsSSRImport', (compilation) => {
      // 监听 mainTemplate 的 requireEnsure 钩子
      compilation.mainTemplate.hooks.requireEnsure.tap(
        'NextJsSSRImport',
        (code, chunk) => {
          // 配置输出路径为根目录
          const outputPath = resolve('/');
          // 获取页面路径（基于块名称的目录）
          const pagePath = join('/', dirname(chunk.name));
          // 计算页面路径相对于根目录的相对路径
          const relativePathToBaseDir = relative(pagePath, outputPath);
          // 规范化路径分隔符为 Unix 风格
          const relativePathToBaseDirNormalized = relativePathToBaseDir.replace(
            /\\/g,
            '/'
          );

          // 修改 require-ensure 代码，调整加载路径
          return code
            .replace(
              'require("./"',
              `require("${relativePathToBaseDirNormalized}/")`
            )
            .replace(
              'readFile(join(__dirname',
              `readFile(join(__dirname, "${relativePathToBaseDirNormalized}"`
            );
        }
      );
    });
  }
}
/*代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，修改 Webpack 生成的 require-ensure 代码以支持服务端渲染（SSR）。
它调整动态加载块的路径，确保 SSR 环境中正确加载自定义块目录中的文件。

主要功能：
路径计算：
使用 resolve('/') 设置根目录作为输出路径。
从块名称（chunk.name）提取页面目录（dirname），生成页面路径。
计算页面路径相对于根目录的相对路径（relative）。
规范化路径分隔符（replace(/\\/g, '/')），确保跨平台兼容。

代码修改：
修改 require-ensure 代码中的 require("./")，替换为 require("${relativePathToBaseDirNormalized}/")。
修改 readFile(join(__dirname, ...))，添加相对路径前缀。

钩子注册：
通过 compiler.hooks.compilation.tap 监听编译过程。
通过 compilation.mainTemplate.hooks.requireEnsure.tap 修改 require-ensure 输出。

逻辑：
在编译阶段，动态调整 require-ensure 代码的加载路径。

确保 SSR 环境中，Node.js 能正确解析块文件路径。

支持 Windows 和 Unix 环境，通过路径规范化保证一致性。

用途：
在 Next.js 9.1.1 的 SSR 构建中，确保动态加载的块（如 pages/api/, SSR 页面）在服务端正确解析。
优化服务端渲染的模块加载，适用于 API 路由和 SSR 页面。

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new NextJsSsrImportPlugin(),
]
/***** */
