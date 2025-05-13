"use strict";

var _ = _interopRequireWildcard(require("./"));
var next = _;
var _eventSourcePolyfill = _interopRequireDefault(require("./dev/event-source-polyfill"));
var _onDemandEntriesClient = _interopRequireDefault(require("./dev/on-demand-entries-client"));
var _webpackHotMiddlewareClient = _interopRequireDefault(require("./dev/webpack-hot-middleware-client"));
var _devBuildWatcher = _interopRequireDefault(require("./dev/dev-build-watcher"));
var _prerenderIndicator = _interopRequireDefault(require("./dev/prerender-indicator"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
// Temporary workaround for the issue described here:
// https://github.com/zeit/next.js/issues/3775#issuecomment-407438123
// The runtimeChunk doesn't have dynamic import handling code when there hasn't been a dynamic import
// The runtimeChunk can't hot reload itself currently to correct it when adding pages using on-demand-entries
import('./dev/noop');

// Support EventSource on Internet Explorer 11
if (!window.EventSource) {
  window.EventSource = _eventSourcePolyfill.default;
}
const {
  __NEXT_DATA__: {
    assetPrefix
  }
} = window;
const prefix = assetPrefix || '';
const webpackHMR = (0, _webpackHotMiddlewareClient.default)({
  assetPrefix: prefix
});
window.next = next;
(0, _.default)({
  webpackHMR
}).then(emitter => {
  (0, _onDemandEntriesClient.default)({
    assetPrefix: prefix
  });
  if (process.env.__NEXT_BUILD_INDICATOR) (0, _devBuildWatcher.default)();
  if (process.env.__NEXT_PRERENDER_INDICATOR &&
  // disable by default in electron
  !(typeof process !== 'undefined' && 'electron' in process.versions)) {
    (0, _prerenderIndicator.default)();
  }

  // This is the fallback helper that removes Next.js' no-FOUC styles when
  // CSS mode is enabled. This only really activates if you haven't created
  // _any_ styles in your application yet.
  ;
  (window.requestAnimationFrame || setTimeout)(function () {
    for (var x = document.querySelectorAll('[data-next-hide-fouc]'), i = x.length; i--;) {
      x[i].parentNode.removeChild(x[i]);
    }
  });
  let lastScroll;
  emitter.on('before-reactdom-render', ({
    Component,
    ErrorComponent
  }) => {
    // Remember scroll when ErrorComponent is being rendered to later restore it
    if (!lastScroll && Component === ErrorComponent) {
      const {
        pageXOffset,
        pageYOffset
      } = window;
      lastScroll = {
        x: pageXOffset,
        y: pageYOffset
      };
    }
  });
  emitter.on('after-reactdom-render', ({
    Component,
    ErrorComponent
  }) => {
    if (lastScroll && Component !== ErrorComponent) {
      // Restore scroll after ErrorComponent was replaced with a page component by HMR
      const {
        x,
        y
      } = lastScroll;
      window.scroll(x, y);
      lastScroll = null;
    }
  });
}).catch(err => {
  console.error('Error was not caught', err);
});