"use strict";

exports.__esModule = true;
exports.isInAmpMode = isInAmpMode;
exports.useAmp = useAmp;
var _react = _interopRequireDefault(require("react"));
var _ampContext = require("./amp-context");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function isInAmpMode({
  ampFirst = false,
  hybrid = false,
  hasQuery = false
} = {}) {
  return ampFirst || hybrid && hasQuery;
}
function useAmp() {
  // Don't assign the context value to a variable to save bytes
  return isInAmpMode(_react.default.useContext(_ampContext.AmpStateContext));
}