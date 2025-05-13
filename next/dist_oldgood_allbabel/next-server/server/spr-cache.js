"use strict";

exports.__esModule = true;
exports.calculateRevalidate = void 0;
exports.getSprCache = getSprCache;
exports.initializeSprCache = initializeSprCache;
exports.setSprCache = setSprCache;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _lruCache = _interopRequireDefault(require("lru-cache"));
var _util = require("util");
var _constants = require("../lib/constants");
var _normalizePagePath = require("./normalize-page-path");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const readFile = (0, _util.promisify)(_fs.default.readFile);
const writeFile = (0, _util.promisify)(_fs.default.writeFile);
let cache;
let prerenderManifest;
let sprOptions = {};
const getSeedPath = (pathname, ext) => {
  return _path.default.join(sprOptions.pagesDir, `${pathname}.${ext}`);
};
const calculateRevalidate = pathname => {
  // in development we don't have a prerender-manifest
  // and default to always revalidating to allow easier debugging
  const curTime = new Date().getTime();
  if (!sprOptions.dev) return curTime;
  const {
    initialRevalidateSeconds
  } = prerenderManifest.routes[pathname] || {
    initialRevalidateSeconds: 1
  };
  const revalidateAfter = typeof initialRevalidateSeconds === 'number' ? initialRevalidateSeconds * 1000 + curTime : initialRevalidateSeconds;
  return revalidateAfter;
};

// initialize the SPR cache
exports.calculateRevalidate = calculateRevalidate;
function initializeSprCache({
  max,
  dev,
  distDir,
  pagesDir,
  flushToDisk
}) {
  sprOptions = {
    dev,
    distDir,
    pagesDir,
    flushToDisk: !dev && (typeof flushToDisk !== 'undefined' ? flushToDisk : true)
  };
  try {
    prerenderManifest = dev ? {
      routes: {},
      dynamicRoutes: []
    } : JSON.parse(_fs.default.readFileSync(_path.default.join(distDir, _constants.PRERENDER_MANIFEST), 'utf8'));
  } catch (_) {
    prerenderManifest = {
      version: 1,
      routes: {},
      dynamicRoutes: {}
    };
  }
  cache = new _lruCache.default({
    // default to 50MB limit
    max: max || 50 * 1024 * 1024,
    length(val) {
      // rough estimate of size of cache value
      return val.html.length + JSON.stringify(val.pageData).length;
    }
  });
}

// get data from SPR cache if available
async function getSprCache(pathname) {
  if (sprOptions.dev) return;
  pathname = (0, _normalizePagePath.normalizePagePath)(pathname);
  let data = cache.get(pathname);

  // let's check the disk for seed data
  if (!data) {
    try {
      const html = await readFile(getSeedPath(pathname, 'html'), 'utf8');
      const pageData = JSON.parse(await readFile(getSeedPath(pathname, 'json'), 'utf8'));
      data = {
        html,
        pageData,
        revalidateAfter: calculateRevalidate(pathname)
      };
      cache.set(pathname, data);
    } catch (_) {
      // unable to get data from disk
    }
  }
  if (data && data.revalidateAfter !== false && data.revalidateAfter < new Date().getTime()) {
    data.isStale = true;
  }
  const manifestEntry = prerenderManifest.routes[pathname];
  if (data && manifestEntry) {
    data.curRevalidate = manifestEntry.initialRevalidateSeconds;
  }
  return data;
}

// populate the SPR cache with new data
async function setSprCache(pathname, data, revalidateSeconds) {
  if (sprOptions.dev) return;
  if (typeof revalidateSeconds !== 'undefined') {
    // TODO: This is really bad. We shouldn't be mutating the manifest from the
    // build.
    prerenderManifest.routes[pathname] = {
      dataRoute: _path.default.posix.join('/_next/data', `${pathname === '/' ? '/index' : pathname}.json`),
      srcRoute: null,
      // FIXME: provide actual source route, however, when dynamically appending it doesn't really matter
      initialRevalidateSeconds: revalidateSeconds
    };
  }
  pathname = (0, _normalizePagePath.normalizePagePath)(pathname);
  cache.set(pathname, {
    ...data,
    revalidateAfter: calculateRevalidate(pathname)
  });

  // TODO: This option needs to cease to exist unless it stops mutating the
  // `next build` output's manifest.
  if (sprOptions.flushToDisk) {
    try {
      await writeFile(getSeedPath(pathname, 'html'), data.html, 'utf8');
      await writeFile(getSeedPath(pathname, 'json'), JSON.stringify(data.pageData), 'utf8');
    } catch (error) {
      // failed to flush to disk
      console.warn('Failed to update prerender files for', pathname, error);
    }
  }
}