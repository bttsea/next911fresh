"use strict";

exports.__esModule = true;
exports.getPagePath = getPagePath;
exports.pageNotFoundError = pageNotFoundError;
exports.requirePage = requirePage;
var _fs = _interopRequireDefault(require("fs"));
var _path = require("path");
var _util = require("util");
var _constants = require("../lib/constants");
var _normalizePagePath = require("./normalize-page-path");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const readFile = (0, _util.promisify)(_fs.default.readFile);
function pageNotFoundError(page) {
  const err = new Error(`Cannot find module for page: ${page}`);
  err.code = 'ENOENT';
  return err;
}
function getPagePath(page, distDir, serverless, dev) {
  const serverBuildPath = (0, _path.join)(distDir, serverless && !dev ? _constants.SERVERLESS_DIRECTORY : _constants.SERVER_DIRECTORY);
  const pagesManifest = require((0, _path.join)(serverBuildPath, _constants.PAGES_MANIFEST));
  try {
    page = (0, _normalizePagePath.normalizePagePath)(page);
    page = page === '/' ? '/index' : page;
  } catch (err) {
    // tslint:disable-next-line
    console.error(err);
    throw pageNotFoundError(page);
  }
  if (!pagesManifest[page]) {
    const cleanedPage = page.replace(/\/index$/, '') || '/';
    if (!pagesManifest[cleanedPage]) {
      throw pageNotFoundError(page);
    } else {
      page = cleanedPage;
    }
  }
  return (0, _path.join)(serverBuildPath, pagesManifest[page]);
}
function requirePage(page, distDir, serverless) {
  const pagePath = getPagePath(page, distDir, serverless);
  if (pagePath.endsWith('.html')) {
    return readFile(pagePath, 'utf8');
  }
  return require(pagePath);
}