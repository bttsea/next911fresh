"use strict";

exports.__esModule = true;
exports.SUPPORTS_PERFORMANCE_USER_TIMING = exports.SUPPORTS_PERFORMANCE = void 0;
exports.execOnce = execOnce;
exports.formatWithValidation = formatWithValidation;
exports.getDisplayName = getDisplayName;
exports.getLocationOrigin = getLocationOrigin;
exports.getURL = getURL;
exports.isResSent = isResSent;
exports.loadGetInitialProps = loadGetInitialProps;
exports.urlObjectKeys = void 0;
var _url = require("url");
/**
 * Types used by both next and next-server
 */

/**
 * `Next` context
 */
// tslint:disable-next-line interface-name

/**
 * Next `API` route request
 */

/**
 * Send body of response
 */

/**
 * Next `API` route response
 */

/**
 * Utils
 */
function execOnce(fn) {
  let used = false;
  return (...args) => {
    if (!used) {
      used = true;
      fn.apply(this, args);
    }
  };
}
function getLocationOrigin() {
  const {
    protocol,
    hostname,
    port
  } = window.location;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}
function getURL() {
  const {
    href
  } = window.location;
  const origin = getLocationOrigin();
  return href.substring(origin.length);
}
function getDisplayName(Component) {
  return typeof Component === 'string' ? Component : Component.displayName || Component.name || 'Unknown';
}
function isResSent(res) {
  return res.finished || res.headersSent;
}
async function loadGetInitialProps(Component, ctx) {
  if (process.env.NODE_ENV !== 'production') {
    if (Component.prototype && Component.prototype.getInitialProps) {
      const message = `"${getDisplayName(Component)}.getInitialProps()" is defined as an instance method - visit https://err.sh/zeit/next.js/get-initial-props-as-an-instance-method for more information.`;
      throw new Error(message);
    }
  }
  // when called from _app `ctx` is nested in `ctx`
  const res = ctx.res || ctx.ctx && ctx.ctx.res;
  if (!Component.getInitialProps) {
    return {};
  }
  const props = await Component.getInitialProps(ctx);
  if (res && isResSent(res)) {
    return props;
  }
  if (!props) {
    const message = `"${getDisplayName(Component)}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
    throw new Error(message);
  }
  if (process.env.NODE_ENV !== 'production') {
    if (Object.keys(props).length === 0 && !ctx.ctx) {
      console.warn(`${getDisplayName(Component)} returned an empty object from \`getInitialProps\`. This de-optimizes and prevents automatic static optimization. https://err.sh/zeit/next.js/empty-object-getInitialProps`);
    }
  }
  return props;
}
const urlObjectKeys = exports.urlObjectKeys = ['auth', 'hash', 'host', 'hostname', 'href', 'path', 'pathname', 'port', 'protocol', 'query', 'search', 'slashes'];
function formatWithValidation(url, options) {
  if (process.env.NODE_ENV === 'development') {
    if (url !== null && typeof url === 'object') {
      Object.keys(url).forEach(key => {
        if (urlObjectKeys.indexOf(key) === -1) {
          console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
        }
      });
    }
  }
  return (0, _url.format)(url, options);
}
const SUPPORTS_PERFORMANCE = exports.SUPPORTS_PERFORMANCE = typeof performance !== 'undefined';
const SUPPORTS_PERFORMANCE_USER_TIMING = exports.SUPPORTS_PERFORMANCE_USER_TIMING = SUPPORTS_PERFORMANCE && typeof performance.mark === 'function' && typeof performance.measure === 'function';