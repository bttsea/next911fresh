"use strict";

exports.__esModule = true;
exports.cleanAmpPath = cleanAmpPath;
exports.isBlockedPage = isBlockedPage;
exports.isInternalUrl = isInternalUrl;
var _constants = require("../lib/constants");
const internalPrefixes = [/^\/_next\//, /^\/static\//];
function isInternalUrl(url) {
  for (const prefix of internalPrefixes) {
    if (prefix.test(url)) {
      return true;
    }
  }
  return false;
}
function isBlockedPage(pathname) {
  return _constants.BLOCKED_PAGES.indexOf(pathname) !== -1;
}
function cleanAmpPath(pathname) {
  if (pathname.match(/\?amp=(y|yes|true|1)/)) {
    pathname = pathname.replace(/\?amp=(y|yes|true|1)/, '?');
  }
  if (pathname.match(/&amp=(y|yes|true|1)/)) {
    pathname = pathname.replace(/\?amp=(y|yes|true|1)/, '');
  }
  pathname = pathname.replace(/\?$/, '');
  return pathname;
}