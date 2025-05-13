"use strict";

exports.__esModule = true;
exports.route = exports.default = void 0;
var _pathMatch = _interopRequireDefault(require("./lib/path-match"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const route = exports.route = (0, _pathMatch.default)();
class Router {
  constructor(routes = []) {
    this.routes = void 0;
    this.routes = routes;
  }
  add(route) {
    this.routes.unshift(route);
  }
  match(req, res, parsedUrl) {
    const {
      pathname
    } = parsedUrl;
    for (const route of this.routes) {
      const params = route.match(pathname);
      if (params) {
        return () => route.fn(req, res, params, parsedUrl);
      }
    }
  }
}
exports.default = Router;