"use strict";

exports.__esModule = true;
exports.default = void 0;
var _stringHash = _interopRequireDefault(require("string-hash"));
var _path = require("path");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const nextDataLoader = function (source) {
  const filename = this.resourcePath;
  return `
  import {createHook} from 'next/data'

  export default createHook(undefined, {key: ${JSON.stringify((0, _path.basename)(filename) + '-' + (0, _stringHash.default)(filename))}})
  `;
};
var _default = exports.default = nextDataLoader;