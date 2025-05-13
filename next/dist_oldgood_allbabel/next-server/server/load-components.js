"use strict";

exports.__esModule = true;
exports.interopDefault = interopDefault;
exports.loadComponents = loadComponents;
var _constants = require("../lib/constants");
var _path = require("path");
var _require = require("./require");
function interopDefault(mod) {
  return mod.default || mod;
}
async function loadComponents(distDir, buildId, pathname, serverless) {
  if (serverless) {
    const Component = await (0, _require.requirePage)(pathname, distDir, serverless);
    return {
      Component,
      pageConfig: Component.config || {},
      unstable_getStaticProps: Component.unstable_getStaticProps
    };
  }
  const documentPath = (0, _path.join)(distDir, _constants.SERVER_DIRECTORY, _constants.CLIENT_STATIC_FILES_PATH, buildId, 'pages', '_document');
  const appPath = (0, _path.join)(distDir, _constants.SERVER_DIRECTORY, _constants.CLIENT_STATIC_FILES_PATH, buildId, 'pages', '_app');
  const DocumentMod = require(documentPath);
  const {
    middleware: DocumentMiddleware
  } = DocumentMod;
  const ComponentMod = (0, _require.requirePage)(pathname, distDir, serverless);
  const [buildManifest, reactLoadableManifest, Component, Document, App] = await Promise.all([require((0, _path.join)(distDir, _constants.BUILD_MANIFEST)), require((0, _path.join)(distDir, _constants.REACT_LOADABLE_MANIFEST)), interopDefault(ComponentMod), interopDefault(DocumentMod), interopDefault(require(appPath))]);
  return {
    App,
    Document,
    Component,
    buildManifest,
    DocumentMiddleware,
    reactLoadableManifest,
    pageConfig: ComponentMod.config || {},
    unstable_getStaticProps: ComponentMod.unstable_getStaticProps
  };
}