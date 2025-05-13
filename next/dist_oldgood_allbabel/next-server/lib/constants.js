"use strict";

exports.__esModule = true;
exports.SERVER_DIRECTORY = exports.SERVERLESS_ROUTE_NAME_REGEX = exports.SERVERLESS_DIRECTORY = exports.ROUTE_NAME_REGEX = exports.REACT_LOADABLE_MANIFEST = exports.PRERENDER_MANIFEST = exports.PHASE_PRODUCTION_SERVER = exports.PHASE_PRODUCTION_BUILD = exports.PHASE_EXPORT = exports.PHASE_DEVELOPMENT_SERVER = exports.PAGES_MANIFEST = exports.IS_BUNDLED_PAGE_REGEX = exports.CONFIG_FILE = exports.CLIENT_STATIC_FILES_RUNTIME_WEBPACK = exports.CLIENT_STATIC_FILES_RUNTIME_PATH = exports.CLIENT_STATIC_FILES_RUNTIME_MAIN = exports.CLIENT_STATIC_FILES_RUNTIME_AMP = exports.CLIENT_STATIC_FILES_RUNTIME = exports.CLIENT_STATIC_FILES_PATH = exports.CLIENT_PUBLIC_FILES_PATH = exports.BUILD_MANIFEST = exports.BUILD_ID_FILE = exports.BLOCKED_PAGES = void 0;
const PHASE_EXPORT = exports.PHASE_EXPORT = 'phase-export';
const PHASE_PRODUCTION_BUILD = exports.PHASE_PRODUCTION_BUILD = 'phase-production-build';
const PHASE_PRODUCTION_SERVER = exports.PHASE_PRODUCTION_SERVER = 'phase-production-server';
const PHASE_DEVELOPMENT_SERVER = exports.PHASE_DEVELOPMENT_SERVER = 'phase-development-server';
const PAGES_MANIFEST = exports.PAGES_MANIFEST = 'pages-manifest.json';
const BUILD_MANIFEST = exports.BUILD_MANIFEST = 'build-manifest.json';
const PRERENDER_MANIFEST = exports.PRERENDER_MANIFEST = 'prerender-manifest.json';
const REACT_LOADABLE_MANIFEST = exports.REACT_LOADABLE_MANIFEST = 'react-loadable-manifest.json';
const SERVER_DIRECTORY = exports.SERVER_DIRECTORY = 'server';
const SERVERLESS_DIRECTORY = exports.SERVERLESS_DIRECTORY = 'serverless';
const CONFIG_FILE = exports.CONFIG_FILE = 'next.config.js';
const BUILD_ID_FILE = exports.BUILD_ID_FILE = 'BUILD_ID';
const BLOCKED_PAGES = exports.BLOCKED_PAGES = ['/_document', '/_app'];
const CLIENT_PUBLIC_FILES_PATH = exports.CLIENT_PUBLIC_FILES_PATH = 'public';
const CLIENT_STATIC_FILES_PATH = exports.CLIENT_STATIC_FILES_PATH = 'static';
const CLIENT_STATIC_FILES_RUNTIME = exports.CLIENT_STATIC_FILES_RUNTIME = 'runtime';
const CLIENT_STATIC_FILES_RUNTIME_PATH = exports.CLIENT_STATIC_FILES_RUNTIME_PATH = `${CLIENT_STATIC_FILES_PATH}/${CLIENT_STATIC_FILES_RUNTIME}`;
// static/runtime/main.js
const CLIENT_STATIC_FILES_RUNTIME_MAIN = exports.CLIENT_STATIC_FILES_RUNTIME_MAIN = `${CLIENT_STATIC_FILES_RUNTIME_PATH}/main.js`;
// static/runtime/amp.js
const CLIENT_STATIC_FILES_RUNTIME_AMP = exports.CLIENT_STATIC_FILES_RUNTIME_AMP = `${CLIENT_STATIC_FILES_RUNTIME_PATH}/amp.js`;
// static/runtime/webpack.js
const CLIENT_STATIC_FILES_RUNTIME_WEBPACK = exports.CLIENT_STATIC_FILES_RUNTIME_WEBPACK = `${CLIENT_STATIC_FILES_RUNTIME_PATH}/webpack.js`;
// matches static/<buildid>/pages/<page>.js
const IS_BUNDLED_PAGE_REGEX = exports.IS_BUNDLED_PAGE_REGEX = /^static[/\\][^/\\]+[/\\]pages.*\.js$/;
// matches static/<buildid>/pages/:page*.js
const ROUTE_NAME_REGEX = exports.ROUTE_NAME_REGEX = /^static[/\\][^/\\]+[/\\]pages[/\\](.*)\.js$/;
const SERVERLESS_ROUTE_NAME_REGEX = exports.SERVERLESS_ROUTE_NAME_REGEX = /^pages[/\\](.*)\.js$/;