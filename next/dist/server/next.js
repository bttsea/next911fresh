"use strict";

exports.__esModule = true;
exports.default = void 0;
var _nextServer = _interopRequireDefault(require("../next-server/server/next-server"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// This file is used for when users run `require('next')`
function createServer(options) {
  if (options.dev) {
    const Server = require('./next-dev-server').default;
    return new Server(options);
  }
  return new _nextServer.default(options);
}

// Support commonjs `require('next')`
module.exports = createServer;

// Support `import next from 'next'`
var _default = exports.default = createServer;