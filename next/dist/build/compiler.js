"use strict";

exports.__esModule = true;
exports.runCompiler = runCompiler;
var _webpack = _interopRequireDefault(require("webpack"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function generateStats(result, stat) {
  const {
    errors,
    warnings
  } = stat.toJson({
    all: false,
    warnings: true,
    errors: true
  });
  if (errors.length > 0) {
    result.errors.push(...errors);
  }
  if (warnings.length > 0) {
    result.warnings.push(...warnings);
  }
  return result;
}
function runCompiler(config) {
  return new Promise(async (resolve, reject) => {
    // @ts-ignore webpack allows both a single config or array of configs
    const compiler = (0, _webpack.default)(config);
    compiler.run((err, statsOrMultiStats) => {
      if (err) {
        return reject(err);
      }
      if (statsOrMultiStats.stats) {
        const result = statsOrMultiStats.stats.reduce(generateStats, {
          errors: [],
          warnings: []
        });
        return resolve(result);
      }
      const result = generateStats({
        errors: [],
        warnings: []
      }, statsOrMultiStats);
      return resolve(result);
    });
  });
}