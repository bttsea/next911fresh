"use strict";

exports.__esModule = true;
exports.sendHTML = sendHTML;
var _etag = _interopRequireDefault(require("etag"));
var _fresh = _interopRequireDefault(require("fresh"));
var _utils = require("../lib/utils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function sendHTML(req, res, html, {
  generateEtags,
  poweredByHeader
}) {
  if ((0, _utils.isResSent)(res)) return;
  const etag = generateEtags ? (0, _etag.default)(html) : undefined;
  if (poweredByHeader) {
    res.setHeader('X-Powered-By', 'Next.js');
  }
  if ((0, _fresh.default)(req.headers, {
    etag
  })) {
    res.statusCode = 304;
    res.end();
    return;
  }
  if (etag) {
    res.setHeader('ETag', etag);
  }
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  res.setHeader('Content-Length', Buffer.byteLength(html));
  res.end(req.method === 'HEAD' ? null : html);
}