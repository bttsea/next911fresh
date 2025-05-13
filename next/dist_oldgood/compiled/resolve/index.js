var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/resolve/lib/core.json
var require_core = __commonJS({
  "node_modules/resolve/lib/core.json"(exports2, module2) {
    module2.exports = {
      assert: true,
      async_hooks: ">= 8",
      buffer_ieee754: "< 0.9.7",
      buffer: true,
      child_process: true,
      cluster: true,
      console: true,
      constants: true,
      crypto: true,
      _debugger: "< 8",
      dgram: true,
      dns: true,
      domain: true,
      events: true,
      freelist: "< 6",
      fs: true,
      "fs/promises": ">= 10 && < 10.1",
      _http_agent: ">= 0.11.1",
      _http_client: ">= 0.11.1",
      _http_common: ">= 0.11.1",
      _http_incoming: ">= 0.11.1",
      _http_outgoing: ">= 0.11.1",
      _http_server: ">= 0.11.1",
      http: true,
      http2: ">= 8.8",
      https: true,
      inspector: ">= 8.0.0",
      _linklist: "< 8",
      module: true,
      net: true,
      "node-inspect/lib/_inspect": ">= 7.6.0 && < 12",
      "node-inspect/lib/internal/inspect_client": ">= 7.6.0 && < 12",
      "node-inspect/lib/internal/inspect_repl": ">= 7.6.0 && < 12",
      os: true,
      path: true,
      perf_hooks: ">= 8.5",
      process: ">= 1",
      punycode: true,
      querystring: true,
      readline: true,
      repl: true,
      smalloc: ">= 0.11.5 && < 3",
      _stream_duplex: ">= 0.9.4",
      _stream_transform: ">= 0.9.4",
      _stream_wrap: ">= 1.4.1",
      _stream_passthrough: ">= 0.9.4",
      _stream_readable: ">= 0.9.4",
      _stream_writable: ">= 0.9.4",
      stream: true,
      string_decoder: true,
      sys: true,
      timers: true,
      _tls_common: ">= 0.11.13",
      _tls_legacy: ">= 0.11.3 && < 10",
      _tls_wrap: ">= 0.11.3",
      tls: true,
      trace_events: ">= 10",
      tty: true,
      url: true,
      util: true,
      "v8/tools/arguments": ">= 10 && < 12",
      "v8/tools/codemap": [">= 4.4.0 && < 5", ">= 5.2.0 && < 12"],
      "v8/tools/consarray": [">= 4.4.0 && < 5", ">= 5.2.0 && < 12"],
      "v8/tools/csvparser": [">= 4.4.0 && < 5", ">= 5.2.0 && < 12"],
      "v8/tools/logreader": [">= 4.4.0 && < 5", ">= 5.2.0 && < 12"],
      "v8/tools/profile_view": [">= 4.4.0 && < 5", ">= 5.2.0 && < 12"],
      "v8/tools/splaytree": [">= 4.4.0 && < 5", ">= 5.2.0 && < 12"],
      v8: ">= 1",
      vm: true,
      worker_threads: ">= 11.7",
      zlib: true
    };
  }
});

// node_modules/resolve/lib/core.js
var require_core2 = __commonJS({
  "node_modules/resolve/lib/core.js"(exports2, module2) {
    var current = process.versions && process.versions.node && process.versions.node.split(".") || [];
    function specifierIncluded(specifier) {
      var parts = specifier.split(" ");
      var op = parts.length > 1 ? parts[0] : "=";
      var versionParts = (parts.length > 1 ? parts[1] : parts[0]).split(".");
      for (var i = 0; i < 3; ++i) {
        var cur = Number(current[i] || 0);
        var ver = Number(versionParts[i] || 0);
        if (cur === ver) {
          continue;
        }
        if (op === "<") {
          return cur < ver;
        } else if (op === ">=") {
          return cur >= ver;
        } else {
          return false;
        }
      }
      return op === ">=";
    }
    function matchesRange(range) {
      var specifiers = range.split(/ ?&& ?/);
      if (specifiers.length === 0) {
        return false;
      }
      for (var i = 0; i < specifiers.length; ++i) {
        if (!specifierIncluded(specifiers[i])) {
          return false;
        }
      }
      return true;
    }
    function versionIncluded(specifierValue) {
      if (typeof specifierValue === "boolean") {
        return specifierValue;
      }
      if (specifierValue && typeof specifierValue === "object") {
        for (var i = 0; i < specifierValue.length; ++i) {
          if (matchesRange(specifierValue[i])) {
            return true;
          }
        }
        return false;
      }
      return matchesRange(specifierValue);
    }
    var data = require_core();
    var core2 = {};
    for (mod in data) {
      if (Object.prototype.hasOwnProperty.call(data, mod)) {
        core2[mod] = versionIncluded(data[mod]);
      }
    }
    var mod;
    module2.exports = core2;
  }
});

// node_modules/resolve/lib/caller.js
var require_caller = __commonJS({
  "node_modules/resolve/lib/caller.js"(exports2, module2) {
    module2.exports = function() {
      var origPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = function(_, stack2) {
        return stack2;
      };
      var stack = new Error().stack;
      Error.prepareStackTrace = origPrepareStackTrace;
      return stack[2].getFileName();
    };
  }
});

// node_modules/path-parse/index.js
var require_path_parse = __commonJS({
  "node_modules/path-parse/index.js"(exports2, module2) {
    "use strict";
    var isWindows = process.platform === "win32";
    var splitWindowsRe = /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;
    var win32 = {};
    function win32SplitPath(filename) {
      return splitWindowsRe.exec(filename).slice(1);
    }
    win32.parse = function(pathString) {
      if (typeof pathString !== "string") {
        throw new TypeError(
          "Parameter 'pathString' must be a string, not " + typeof pathString
        );
      }
      var allParts = win32SplitPath(pathString);
      if (!allParts || allParts.length !== 5) {
        throw new TypeError("Invalid path '" + pathString + "'");
      }
      return {
        root: allParts[1],
        dir: allParts[0] === allParts[1] ? allParts[0] : allParts[0].slice(0, -1),
        base: allParts[2],
        ext: allParts[4],
        name: allParts[3]
      };
    };
    var splitPathRe = /^((\/?)(?:[^\/]*\/)*)((\.{1,2}|[^\/]+?|)(\.[^.\/]*|))[\/]*$/;
    var posix = {};
    function posixSplitPath(filename) {
      return splitPathRe.exec(filename).slice(1);
    }
    posix.parse = function(pathString) {
      if (typeof pathString !== "string") {
        throw new TypeError(
          "Parameter 'pathString' must be a string, not " + typeof pathString
        );
      }
      var allParts = posixSplitPath(pathString);
      if (!allParts || allParts.length !== 5) {
        throw new TypeError("Invalid path '" + pathString + "'");
      }
      return {
        root: allParts[1],
        dir: allParts[0].slice(0, -1),
        base: allParts[2],
        ext: allParts[4],
        name: allParts[3]
      };
    };
    if (isWindows)
      module2.exports = win32.parse;
    else
      module2.exports = posix.parse;
    module2.exports.posix = posix.parse;
    module2.exports.win32 = win32.parse;
  }
});

// node_modules/resolve/lib/node-modules-paths.js
var require_node_modules_paths = __commonJS({
  "node_modules/resolve/lib/node-modules-paths.js"(exports2, module2) {
    var path = require("path");
    var parse = path.parse || require_path_parse();
    var getNodeModulesDirs = function getNodeModulesDirs2(absoluteStart, modules) {
      var prefix = "/";
      if (/^([A-Za-z]:)/.test(absoluteStart)) {
        prefix = "";
      } else if (/^\\\\/.test(absoluteStart)) {
        prefix = "\\\\";
      }
      var paths = [absoluteStart];
      var parsed = parse(absoluteStart);
      while (parsed.dir !== paths[paths.length - 1]) {
        paths.push(parsed.dir);
        parsed = parse(parsed.dir);
      }
      return paths.reduce(function(dirs, aPath) {
        return dirs.concat(modules.map(function(moduleDir) {
          return path.join(prefix, aPath, moduleDir);
        }));
      }, []);
    };
    module2.exports = function nodeModulesPaths(start, opts, request) {
      var modules = opts && opts.moduleDirectory ? [].concat(opts.moduleDirectory) : ["node_modules"];
      if (opts && typeof opts.paths === "function") {
        return opts.paths(
          request,
          start,
          function() {
            return getNodeModulesDirs(start, modules);
          },
          opts
        );
      }
      var dirs = getNodeModulesDirs(start, modules);
      return opts && opts.paths ? dirs.concat(opts.paths) : dirs;
    };
  }
});

// node_modules/resolve/lib/normalize-options.js
var require_normalize_options = __commonJS({
  "node_modules/resolve/lib/normalize-options.js"(exports2, module2) {
    module2.exports = function(x, opts) {
      return opts || {};
    };
  }
});

// node_modules/resolve/lib/async.js
var require_async = __commonJS({
  "node_modules/resolve/lib/async.js"(exports2, module2) {
    var core2 = require_core2();
    var fs = require("fs");
    var path = require("path");
    var caller = require_caller();
    var nodeModulesPaths = require_node_modules_paths();
    var normalizeOptions = require_normalize_options();
    var defaultIsFile = function isFile(file, cb) {
      fs.stat(file, function(err, stat) {
        if (!err) {
          return cb(null, stat.isFile() || stat.isFIFO());
        }
        if (err.code === "ENOENT" || err.code === "ENOTDIR")
          return cb(null, false);
        return cb(err);
      });
    };
    var defaultIsDir = function isDirectory(dir, cb) {
      fs.stat(dir, function(err, stat) {
        if (!err) {
          return cb(null, stat.isDirectory());
        }
        if (err.code === "ENOENT" || err.code === "ENOTDIR")
          return cb(null, false);
        return cb(err);
      });
    };
    module2.exports = function resolve(x, options, callback) {
      var cb = callback;
      var opts = options;
      if (typeof options === "function") {
        cb = opts;
        opts = {};
      }
      if (typeof x !== "string") {
        var err = new TypeError("Path must be a string.");
        return process.nextTick(function() {
          cb(err);
        });
      }
      opts = normalizeOptions(x, opts);
      var isFile = opts.isFile || defaultIsFile;
      var isDirectory = opts.isDirectory || defaultIsDir;
      var readFile = opts.readFile || fs.readFile;
      var extensions = opts.extensions || [".js"];
      var basedir = opts.basedir || path.dirname(caller());
      var parent = opts.filename || basedir;
      opts.paths = opts.paths || [];
      var absoluteStart = path.resolve(basedir);
      if (opts.preserveSymlinks === false) {
        fs.realpath(absoluteStart, function(realPathErr, realStart) {
          if (realPathErr && realPathErr.code !== "ENOENT")
            cb(err);
          else
            init(realPathErr ? absoluteStart : realStart);
        });
      } else {
        init(absoluteStart);
      }
      var res;
      function init(basedir2) {
        if (/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[/\\])/.test(x)) {
          res = path.resolve(basedir2, x);
          if (x === ".." || x.slice(-1) === "/")
            res += "/";
          if (/\/$/.test(x) && res === basedir2) {
            loadAsDirectory(res, opts.package, onfile);
          } else
            loadAsFile(res, opts.package, onfile);
        } else
          loadNodeModules(x, basedir2, function(err2, n, pkg) {
            if (err2)
              cb(err2);
            else if (n)
              cb(null, n, pkg);
            else if (core2[x])
              return cb(null, x);
            else {
              var moduleError = new Error("Cannot find module '" + x + "' from '" + parent + "'");
              moduleError.code = "MODULE_NOT_FOUND";
              cb(moduleError);
            }
          });
      }
      function onfile(err2, m, pkg) {
        if (err2)
          cb(err2);
        else if (m)
          cb(null, m, pkg);
        else
          loadAsDirectory(res, function(err3, d, pkg2) {
            if (err3)
              cb(err3);
            else if (d)
              cb(null, d, pkg2);
            else {
              var moduleError = new Error("Cannot find module '" + x + "' from '" + parent + "'");
              moduleError.code = "MODULE_NOT_FOUND";
              cb(moduleError);
            }
          });
      }
      function loadAsFile(x2, thePackage, callback2) {
        var loadAsFilePackage = thePackage;
        var cb2 = callback2;
        if (typeof loadAsFilePackage === "function") {
          cb2 = loadAsFilePackage;
          loadAsFilePackage = void 0;
        }
        var exts = [""].concat(extensions);
        load(exts, x2, loadAsFilePackage);
        function load(exts2, x3, loadPackage) {
          if (exts2.length === 0)
            return cb2(null, void 0, loadPackage);
          var file = x3 + exts2[0];
          var pkg = loadPackage;
          if (pkg)
            onpkg(null, pkg);
          else
            loadpkg(path.dirname(file), onpkg);
          function onpkg(err2, pkg_, dir) {
            pkg = pkg_;
            if (err2)
              return cb2(err2);
            if (dir && pkg && opts.pathFilter) {
              var rfile = path.relative(dir, file);
              var rel = rfile.slice(0, rfile.length - exts2[0].length);
              var r = opts.pathFilter(pkg, x3, rel);
              if (r)
                return load(
                  [""].concat(extensions.slice()),
                  path.resolve(dir, r),
                  pkg
                );
            }
            isFile(file, onex);
          }
          function onex(err2, ex) {
            if (err2)
              return cb2(err2);
            if (ex)
              return cb2(null, file, pkg);
            load(exts2.slice(1), x3, pkg);
          }
        }
      }
      function loadpkg(dir, cb2) {
        if (dir === "" || dir === "/")
          return cb2(null);
        if (process.platform === "win32" && /^\w:[/\\]*$/.test(dir)) {
          return cb2(null);
        }
        if (/[/\\]node_modules[/\\]*$/.test(dir))
          return cb2(null);
        var pkgfile = path.join(dir, "package.json");
        isFile(pkgfile, function(err2, ex) {
          if (!ex)
            return loadpkg(path.dirname(dir), cb2);
          readFile(pkgfile, function(err3, body) {
            if (err3)
              cb2(err3);
            try {
              var pkg = JSON.parse(body);
            } catch (jsonErr) {
            }
            if (pkg && opts.packageFilter) {
              pkg = opts.packageFilter(pkg, pkgfile);
            }
            cb2(null, pkg, dir);
          });
        });
      }
      function loadAsDirectory(x2, loadAsDirectoryPackage, callback2) {
        var cb2 = callback2;
        var fpkg = loadAsDirectoryPackage;
        if (typeof fpkg === "function") {
          cb2 = fpkg;
          fpkg = opts.package;
        }
        var pkgfile = path.join(x2, "package.json");
        isFile(pkgfile, function(err2, ex) {
          if (err2)
            return cb2(err2);
          if (!ex)
            return loadAsFile(path.join(x2, "index"), fpkg, cb2);
          readFile(pkgfile, function(err3, body) {
            if (err3)
              return cb2(err3);
            try {
              var pkg = JSON.parse(body);
            } catch (jsonErr) {
            }
            if (opts.packageFilter) {
              pkg = opts.packageFilter(pkg, pkgfile);
            }
            if (pkg.main) {
              if (typeof pkg.main !== "string") {
                var mainError = new TypeError("package \u201C" + pkg.name + "\u201D `main` must be a string");
                mainError.code = "INVALID_PACKAGE_MAIN";
                return cb2(mainError);
              }
              if (pkg.main === "." || pkg.main === "./") {
                pkg.main = "index";
              }
              loadAsFile(path.resolve(x2, pkg.main), pkg, function(err4, m, pkg2) {
                if (err4)
                  return cb2(err4);
                if (m)
                  return cb2(null, m, pkg2);
                if (!pkg2)
                  return loadAsFile(path.join(x2, "index"), pkg2, cb2);
                var dir = path.resolve(x2, pkg2.main);
                loadAsDirectory(dir, pkg2, function(err5, n, pkg3) {
                  if (err5)
                    return cb2(err5);
                  if (n)
                    return cb2(null, n, pkg3);
                  loadAsFile(path.join(x2, "index"), pkg3, cb2);
                });
              });
              return;
            }
            loadAsFile(path.join(x2, "/index"), pkg, cb2);
          });
        });
      }
      function processDirs(cb2, dirs) {
        if (dirs.length === 0)
          return cb2(null, void 0);
        var dir = dirs[0];
        isDirectory(dir, isdir);
        function isdir(err2, isdir2) {
          if (err2)
            return cb2(err2);
          if (!isdir2)
            return processDirs(cb2, dirs.slice(1));
          var file = path.join(dir, x);
          loadAsFile(file, opts.package, onfile2);
        }
        function onfile2(err2, m, pkg) {
          if (err2)
            return cb2(err2);
          if (m)
            return cb2(null, m, pkg);
          loadAsDirectory(path.join(dir, x), opts.package, ondir);
        }
        function ondir(err2, n, pkg) {
          if (err2)
            return cb2(err2);
          if (n)
            return cb2(null, n, pkg);
          processDirs(cb2, dirs.slice(1));
        }
      }
      function loadNodeModules(x2, start, cb2) {
        processDirs(cb2, nodeModulesPaths(start, opts, x2));
      }
    };
  }
});

// node_modules/resolve/lib/sync.js
var require_sync = __commonJS({
  "node_modules/resolve/lib/sync.js"(exports2, module2) {
    var core2 = require_core2();
    var fs = require("fs");
    var path = require("path");
    var caller = require_caller();
    var nodeModulesPaths = require_node_modules_paths();
    var normalizeOptions = require_normalize_options();
    var defaultIsFile = function isFile(file) {
      try {
        var stat = fs.statSync(file);
      } catch (e) {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR"))
          return false;
        throw e;
      }
      return stat.isFile() || stat.isFIFO();
    };
    var defaultIsDir = function isDirectory(dir) {
      try {
        var stat = fs.statSync(dir);
      } catch (e) {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR"))
          return false;
        throw e;
      }
      return stat.isDirectory();
    };
    module2.exports = function(x, options) {
      if (typeof x !== "string") {
        throw new TypeError("Path must be a string.");
      }
      var opts = normalizeOptions(x, options);
      var isFile = opts.isFile || defaultIsFile;
      var readFileSync = opts.readFileSync || fs.readFileSync;
      var isDirectory = opts.isDirectory || defaultIsDir;
      var extensions = opts.extensions || [".js"];
      var basedir = opts.basedir || path.dirname(caller());
      var parent = opts.filename || basedir;
      opts.paths = opts.paths || [];
      var absoluteStart = path.resolve(basedir);
      if (opts.preserveSymlinks === false) {
        try {
          absoluteStart = fs.realpathSync(absoluteStart);
        } catch (realPathErr) {
          if (realPathErr.code !== "ENOENT") {
            throw realPathErr;
          }
        }
      }
      if (/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[/\\])/.test(x)) {
        var res = path.resolve(absoluteStart, x);
        if (x === ".." || x.slice(-1) === "/")
          res += "/";
        var m = loadAsFileSync(res) || loadAsDirectorySync(res);
        if (m)
          return m;
      } else {
        var n = loadNodeModulesSync(x, absoluteStart);
        if (n)
          return n;
      }
      if (core2[x])
        return x;
      var err = new Error("Cannot find module '" + x + "' from '" + parent + "'");
      err.code = "MODULE_NOT_FOUND";
      throw err;
      function loadAsFileSync(x2) {
        var pkg = loadpkg(path.dirname(x2));
        if (pkg && pkg.dir && pkg.pkg && opts.pathFilter) {
          var rfile = path.relative(pkg.dir, x2);
          var r = opts.pathFilter(pkg.pkg, x2, rfile);
          if (r) {
            x2 = path.resolve(pkg.dir, r);
          }
        }
        if (isFile(x2)) {
          return x2;
        }
        for (var i = 0; i < extensions.length; i++) {
          var file = x2 + extensions[i];
          if (isFile(file)) {
            return file;
          }
        }
      }
      function loadpkg(dir) {
        if (dir === "" || dir === "/")
          return;
        if (process.platform === "win32" && /^\w:[/\\]*$/.test(dir)) {
          return;
        }
        if (/[/\\]node_modules[/\\]*$/.test(dir))
          return;
        var pkgfile = path.join(dir, "package.json");
        if (!isFile(pkgfile)) {
          return loadpkg(path.dirname(dir));
        }
        var body = readFileSync(pkgfile);
        try {
          var pkg = JSON.parse(body);
        } catch (jsonErr) {
        }
        if (pkg && opts.packageFilter) {
          pkg = opts.packageFilter(pkg, dir);
        }
        return { pkg, dir };
      }
      function loadAsDirectorySync(x2) {
        var pkgfile = path.join(x2, "/package.json");
        if (isFile(pkgfile)) {
          try {
            var body = readFileSync(pkgfile, "UTF8");
            var pkg = JSON.parse(body);
          } catch (e) {
          }
          if (opts.packageFilter) {
            pkg = opts.packageFilter(pkg, x2);
          }
          if (pkg.main) {
            if (typeof pkg.main !== "string") {
              var mainError = new TypeError("package \u201C" + pkg.name + "\u201D `main` must be a string");
              mainError.code = "INVALID_PACKAGE_MAIN";
              throw mainError;
            }
            if (pkg.main === "." || pkg.main === "./") {
              pkg.main = "index";
            }
            try {
              var m2 = loadAsFileSync(path.resolve(x2, pkg.main));
              if (m2)
                return m2;
              var n2 = loadAsDirectorySync(path.resolve(x2, pkg.main));
              if (n2)
                return n2;
            } catch (e) {
            }
          }
        }
        return loadAsFileSync(path.join(x2, "/index"));
      }
      function loadNodeModulesSync(x2, start) {
        var dirs = nodeModulesPaths(start, opts, x2);
        for (var i = 0; i < dirs.length; i++) {
          var dir = dirs[i];
          if (isDirectory(dir)) {
            var m2 = loadAsFileSync(path.join(dir, "/", x2));
            if (m2)
              return m2;
            var n2 = loadAsDirectorySync(path.join(dir, "/", x2));
            if (n2)
              return n2;
          }
        }
      }
    };
  }
});

// node_modules/resolve/index.js
var core = require_core2();
var async = require_async();
async.core = core;
async.isCore = function isCore(x) {
  return core[x];
};
async.sync = require_sync();
exports = async;
module.exports = async;
