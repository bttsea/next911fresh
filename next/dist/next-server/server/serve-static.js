"use strict";

exports.__esModule = true;
exports.serveStatic = serveStatic;
var _send = _interopRequireDefault(require("send"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function serveStatic(req, res, path) {
  return new Promise((resolve, reject) => {
    (0, _send.default)(req, path).on('directory', () => {
      // We don't allow directories to be read.
      const err = new Error('No directory access');
      err.code = 'ENOENT';
      reject(err);
    }).on('error', reject).pipe(res).on('finish', resolve);
  });
}