"use strict";

exports.__esModule = true;
exports.default = void 0;
var _router = _interopRequireDefault(require("next/router"));
var _onDemandEntriesUtils = require("./on-demand-entries-utils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* global window */
var _default = async ({
  assetPrefix
}) => {
  _router.default.ready(() => {
    _router.default.events.on('routeChangeComplete', _onDemandEntriesUtils.setupPing.bind(void 0, assetPrefix, () => _router.default.pathname));
  });
  (0, _onDemandEntriesUtils.setupPing)(assetPrefix, () => _router.default.pathname, _onDemandEntriesUtils.currentPage);

  // prevent HMR connection from being closed when running tests
  if (!process.env.__NEXT_TEST_MODE) {
    document.addEventListener('visibilitychange', event => {
      const state = document.visibilityState;
      if (state === 'visible') {
        (0, _onDemandEntriesUtils.setupPing)(assetPrefix, () => _router.default.pathname, true);
      } else {
        (0, _onDemandEntriesUtils.closePing)();
      }
    });
  }
};
exports.default = _default;