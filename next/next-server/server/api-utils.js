// 引入 Node.js 内置模块和第三方模块
const { parse: parseContentType } = require('content-type');
const { parse: parseUrl } = require('url');
const getRawBody = require('raw-body');
const Stream = require('stream');

// 引入项目内部模块
const { interopDefault } = require('./load-components');

/**
 * API 请求解析器，处理请求并调用 API 模块
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} params - 路由参数
 * @param {Object} resolverModule - API 模块
 */
async function apiResolver(req, res, params, resolverModule) {
  try {
    let config = {};
    let bodyParser = true;

         console.log('apiResolver !!!   '  );


    // 如果模块不存在，返回 404
    if (!resolverModule) {
      res.statusCode = 404;
      res.end('Not Found');

               console.log('如果模块不存在，返回 404!!!   '  );

      return;
    }

    // 解析模块配置
    if (resolverModule.config) {
      config = resolverModule.config;
      if (config.api && config.api.bodyParser === false) {
        bodyParser = false;
      }
    }

    // 延迟解析 Cookie // Parsing of cookies
    setLazyProp({ req }, 'cookies', getCookieParser(req));
    // 延迟解析查询参数  // Parsing query string
    setLazyProp({ req, params }, 'query', getQueryParser(req));

    // 解析请求体// // Parsing of body
    if (bodyParser) {
      req.body = await parseBody(
        req,
        config.api && config.api.bodyParser && config.api.bodyParser.sizeLimit
          ? config.api.bodyParser.sizeLimit
          : '1mb'
      );
    }

    // 添加响应方法
    res.status = (statusCode) => sendStatusCode(res, statusCode);
    res.send = (data) => sendData(res, data);
    res.json = (data) => sendJson(res, data);

    // 执行 API 模块
    const resolver = interopDefault(resolverModule);
    resolver(req, res);
  } catch (e) {
    if (e instanceof ApiError) {
      sendError(res, e.statusCode, e.message);
    } else {
      console.error(e);
      sendError(res, 500, 'Internal Server Error');
    }
  }
}
/** * 解析请求体，支持 JSON、URL-encoded 或纯文本 Parse incoming message like `json` or `urlencoded`
 * @param {Object} req - HTTP 请求对象
 * @param {string|number} limit - 请求体大小限制（例如 '1mb'）
 * @returns {Promise<any>} 解析后的请求体（对象、字符串等）
 */
async function parseBody(req, limit) {
  // 解析 Content-Type 头部
  const contentType = parseContentType(req.headers['content-type'] || 'text/plain');
  const { type, parameters } = contentType;
  const encoding = parameters.charset || 'utf-8';

  let buffer;
  try {
    // 获取原始请求体
    buffer = await getRawBody(req, { encoding, limit });
  } catch (e) {
    if (e.type === 'entity.too.large') {
      throw new ApiError(413, `Body exceeded ${limit} limit`);
    } else {
      throw new ApiError(400, 'Invalid body');
    }
  }

  const body = buffer.toString();

  // 根据 Content-Type 解析请求体
  if (type === 'application/json' || type === 'application/ld+json') {
    return parseJson(body);
  } else if (type === 'application/x-www-form-urlencoded') {
    const qs = require('querystring');
    return qs.decode(body);
  } else {
    return body;
  }
}

/**
 * 解析 JSON 字符串，处理无效 JSON  Parse `JSON` and handles invalid `JSON` strings
 * @param {string} str - JSON 字符串
 * @returns {Object} 解析后的 JSON 对象
 * @throws {ApiError} 如果 JSON 无效，抛出 400 错误
 */
function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    throw new ApiError(400, 'Invalid JSON');
  }
}

/**
 * 解析 URL 查询参数  Parsing query arguments from request `url` string
 * @param {Object} req - HTTP 请求对象，包含 url 属性
 * @returns {Function} 返回解析函数，生成查询参数对象
 */
function getQueryParser(req) {
  return function parseQuery() {
    const { URL } = require('url');
    // 使用占位符 base URL，仅解析 searchParams
    const params = new URL(req.url, 'https://n').searchParams;

    const query = {};
    for (const [key, value] of params) {
      query[key] = value;
    }

    return query;
  };
}

/**
 * 解析请求头中的 Cookie
 * @param {Object} req - HTTP 请求对象
 * @returns {Function} 返回解析函数，生成 Cookie 对象
 */
function getCookieParser(req) {
  return function parseCookie() {
    const header = req.headers.cookie;

    if (!header) {
      return {};
    }

    const { parse } = require('cookie');
    return parse(Array.isArray(header) ? header.join(';') : header);
  };
}

/**
 * 设置响应状态码
 * @param {Object} res - HTTP 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @returns {Object} 响应对象（支持链式调用）
 */
function sendStatusCode(res, statusCode) {
  res.statusCode = statusCode;
  return res;
}

/**
 * 发送响应数据
 * @param {Object} res - HTTP 响应对象
 * @param {any} body - 响应数据（Buffer、Stream、对象、字符串等）
 */
function sendData(res, body) {
  if (body === null) {
    res.end();
    return;
  }

  const contentType = res.getHeader('Content-Type');

  if (Buffer.isBuffer(body)) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.setHeader('Content-Length', body.length);
    res.end(body);
    return;
  }

  if (body instanceof Stream) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    body.pipe(res);
    return;
  }

  let str = body;

  // 将对象或数字转为 JSON 字符串
  if (typeof body === 'object' || typeof body === 'number') {
    str = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader('Content-Length', Buffer.byteLength(str));
  res.end(str);
}

/**
 * 发送 JSON 响应    Send `JSON` object
 * @param {Object} res - HTTP 响应对象
 * @param {any} jsonBody - JSON 数据
 */
function sendJson(res, jsonBody) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Use send to handle request
  res.send(jsonBody)
}

/** * 自定义 API 错误类，用于表示 HTTP 错误
 * // 测试代码
try {
  throw new ApiError(400, 'Bad Request');
} catch (e) {
  console.log(e instanceof ApiError); // true
  console.log(e instanceof Error); // true
  console.log(e.statusCode); // 400
  console.log(e.message); // Bad Request
}
 */
class ApiError extends Error {
  /**
   * 构造函数
   * @param {number} statusCode - HTTP 状态码（例如 400、500）
   * @param {string} message - 错误信息
   */
  constructor(statusCode, message) {
    // 调用父类 Error 的构造函数
    super(message);
    // 设置错误信息
    this.message = message;
    // 设置 HTTP 状态码
    this.statusCode = statusCode;
  }
}
 
/**
 * 发送错误响应    Sends error in `response`
 * @param {Object} res - HTTP 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 错误信息
 */
function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.statusMessage = message;
  res.end(message);
}




 




/**
 * 延迟设置请求对象的属性，仅在访问时计算
 * @param {Object} opts - 配置对象，包含 req 和可选的 params
 * @param {string} prop - 属性名
 * @param {Function} getter - 获取属性值的函数
 */
function setLazyProp(opts, prop, getter) {
  const { req, params } = opts;
  const optsBase = { configurable: true, enumerable: true };
  const optsReset = { ...optsBase, writable: true };

  Object.defineProperty(req, prop, {
    ...optsBase,
    get: () => {
      let value = getter();
      if (params && typeof params !== 'boolean') {
        value = { ...value, ...params };
      }
      // 设置属性值，避免重复计算
      Object.defineProperty(req, prop, { ...optsReset, value });
      return value;
    },
    set: (value) => {
      Object.defineProperty(req, prop, { ...optsReset, value });
    },
  });
}


// 导出所有函数，支持 CommonJS 和 ES Module
module.exports = {
  apiResolver,
  parseBody,
  parseJson,
  getQueryParser,
  getCookieParser,
  sendStatusCode,
  sendData,
  sendJson,
  ApiError,
  sendError,
  setLazyProp,
};


/*
功能一致性:
apiResolver: 解析 API 请求，处理 Cookie、查询参数、请求体，调用 API 模块，捕获错误（404、500）。
parseBody: 解析 JSON、URL-encoded 或文本请求体，限制大小，抛出 ApiError（400、413）。
parseJson: 解析 JSON，处理无效 JSON（400）。
getQueryParser: 解析 URL 查询参数，返回键值对。
getCookieParser: 解析 Cookie，返回键值对。
sendStatusCode, sendData, sendJson: 设置响应状态码和数据。
ApiError: 自定义错误类，包含 statusCode。
sendError: 发送错误响应。
setLazyProp: 延迟设置 req 属性（如 cookies, query）。




测试 API 解析：
const { apiResolver } = require('./api-utils');
apiResolver(
  { url: '/api/test', headers: { 'content-type': 'application/json' }, body: '{"test": 1}' },
  { end: console.log, setHeader: () => {}, getHeader: () => {} },
  {},
  { default: (req, res) => res.json(req.body) }
); // { test: 1 }



/*** */