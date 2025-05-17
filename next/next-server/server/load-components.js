// 引入 Node.js 内置模块和项目内部模块
const { join } = require('path');
const {
  BUILD_MANIFEST,
  CLIENT_STATIC_FILES_PATH,
  REACT_LOADABLE_MANIFEST,
  SERVER_DIRECTORY,
} = require('../lib/constants');
const { requirePage } = require('./requirepage');

/**
 * 兼容模块的默认导出
 * @param {any} mod - 加载的模块
 * @returns {any} 模块的默认导出或模块本身
 */
function interopDefault(mod) {
  return mod.default || mod;
}




/**
 * 异步加载页面相关组件和配置
 * @param {string} distDir - 构建输出目录（例如 '.next'）
 * @param {string} buildId - 构建 ID
 * @param {string} pathname - 页面路径（例如 '/about'）
 * @param {boolean} serverless - 是否为无服务器模式
 * @returns {Promise<Object>} 包含组件、配置和清单的对象
 */
async function loadComponents(distDir, buildId, pathname, serverless) {
 










  // 服务器模式：加载页面、文档、应用和清单
  // 构造 _document 和 _app 的文件路径
  const documentPath = join(
    distDir,
    SERVER_DIRECTORY,
    CLIENT_STATIC_FILES_PATH,
    buildId,
    'pages',
    '_document'
  );
  const appPath = join(
    distDir,
    SERVER_DIRECTORY,
    CLIENT_STATIC_FILES_PATH,
    buildId,
    'pages',
    '_app'
  );

  // 加载 _document 模块
  const DocumentMod = require(documentPath);
  const { middleware: DocumentMiddleware } = DocumentMod;

  // 加载页面模块
  const ComponentMod = requirePage(pathname, distDir, serverless);

  // 并行加载清单、组件和应用
  const [
    buildManifest,
    reactLoadableManifest,
    Component,
    Document,
    App,
  ] = await Promise.all([
    require(join(distDir, BUILD_MANIFEST)),
    require(join(distDir, REACT_LOADABLE_MANIFEST)),
    Promise.resolve(interopDefault(ComponentMod)),
    Promise.resolve(interopDefault(DocumentMod)),
    Promise.resolve(interopDefault(require(appPath))),
  ]);

  // 返回加载结果
  return {
    App,
    Document,
    Component,
    buildManifest,
    DocumentMiddleware,
    reactLoadableManifest,
    pageConfig: ComponentMod.config || {},
    unstable_getStaticProps: ComponentMod.unstable_getStaticProps,
  };
}

// 导出函数，支持 CommonJS 和 ES Module
module.exports = { interopDefault, loadComponents };