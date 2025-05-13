"use strict";

exports.__esModule = true;
exports.error = error;
exports.event = event;
exports.info = info;
exports.ready = ready;
exports.wait = wait;
exports.warn = warn;
var _chalk = _interopRequireDefault(require("chalk"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const prefixes = {
  wait: (0, _chalk.default)`[ {cyan wait} ] `,
  error: (0, _chalk.default)`[ {red error} ]`,
  warn: (0, _chalk.default)`[ {yellow warn} ] `,
  ready: (0, _chalk.default)`[ {green ready} ]`,
  info: (0, _chalk.default)`[ {cyan {dim info}} ] `,
  event: (0, _chalk.default)`[ {magenta event} ]`
};
function wait(...message) {
  console.log(prefixes.wait, ...message);
}
function error(...message) {
  console.log(prefixes.error, ...message);
}
function warn(...message) {
  console.log(prefixes.warn, ...message);
}
function ready(...message) {
  console.log(prefixes.ready, ...message);
}
function info(...message) {
  console.log(prefixes.info, ...message);
}
function event(...message) {
  console.log(prefixes.event, ...message);
}