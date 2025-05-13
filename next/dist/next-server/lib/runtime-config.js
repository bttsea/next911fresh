"use strict";

exports.__esModule = true;
exports.default = void 0;
exports.setConfig = setConfig;
let runtimeConfig;
var _default = () => {
  return runtimeConfig;
};
exports.default = _default;
function setConfig(configValue) {
  runtimeConfig = configValue;
}