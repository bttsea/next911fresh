var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/nanoid/random.js
var require_random = __commonJS({
  "node_modules/nanoid/random.js"(exports2, module2) {
    var crypto = require("crypto");
    if (crypto.randomFillSync) {
      buffers = {};
      module2.exports = function(bytes) {
        var buffer = buffers[bytes];
        if (!buffer) {
          buffer = Buffer.allocUnsafe(bytes);
          if (bytes <= 255)
            buffers[bytes] = buffer;
        }
        return crypto.randomFillSync(buffer);
      };
    } else {
      module2.exports = crypto.randomBytes;
    }
    var buffers;
  }
});

// node_modules/nanoid/url.js
var require_url = __commonJS({
  "node_modules/nanoid/url.js"(exports2, module2) {
    module2.exports = "ModuleSymbhasOwnPr-0123456789ABCDEFGHIJKLNQRTUVWXYZ_cfgijkpqtvxz";
  }
});

// node_modules/nanoid/index.js
var random = require_random();
var url = require_url();
module.exports = function(size) {
  size = size || 21;
  var bytes = random(size);
  var id = "";
  while (0 < size--) {
    id += url[bytes[size] & 63];
  }
  return id;
};
