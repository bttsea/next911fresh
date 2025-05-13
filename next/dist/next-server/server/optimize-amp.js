"use strict";

exports.__esModule = true;
exports.default = optimize;
async function optimize(html) {
  let AmpOptimizer;
  try {
    AmpOptimizer = require('@ampproject/toolbox-optimizer');
  } catch (_) {
    return html;
  }
  const optimizer = AmpOptimizer.create();
  return optimizer.transformHtml(html);
}