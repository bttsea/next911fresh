/* eslint-disable */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { htmlEscapeJsonString } from '../server/htmlescape';
import flush from 'styled-jsx/server';

 
/**
 * 中间件函数（占位符，当前为空）
 * @param {Object} param0 - 包含 req 和 res 的上下文对象
 */
export async function middleware({ req, res }) {}

/**
 * 去重函数，移除重复的 bundle 文件
 * @param {Array} bundles - 文件 bundle 数组
 * @returns {Array} - 去重后的 bundle 数组
 */
function dedupe(bundles) {
  const files = new Set();
  const kept = [];

  for (const bundle of bundles) {
    if (files.has(bundle.file)) continue;
    files.add(bundle.file);
    kept.push(bundle);
  }
  return kept;
}

/**
 * 获取现代化脚本路径（支持 module.js 变体）
 * @param {string} path - 原始脚本路径
 * @returns {string} - 根据构建环境返回对应的脚本路径
 */
function getOptionalModernScriptVariant(path) {
  if (process.env.__NEXT_MODERN_BUILD) {
    return path.replace(/\.js$/, '.module.js');
  }
  return path;
}

/**
 * Document 组件用于处理服务器端初始文档标记，仅在服务器端渲染
 * 常用于实现 css-in-js 库的服务器端渲染
 */
export default class Document extends Component {
  static childContextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  };

  /**
   * 获取初始 props，包含页面渲染结果和样式
   * @param {Object} param0 - 包含 renderPage 的上下文对象
   * @returns {Promise<Object>} - 返回包含 html、head、styles 和 dataOnly 的初始 props
   */
  static async getInitialProps({ renderPage }) {
    const { html, head, dataOnly } = await renderPage();
    const styles = flush(); // 获取 styled-jsx 的服务器端样式
    return { html, head, styles, dataOnly };
  }

  /**
   * 提供子组件上下文
   * @returns {Object} - 包含文档 props 和开发环境缓存失效查询字符串
   */
  getChildContext() {
    return {
      _documentProps: this.props,
      // 在开发环境中，通过添加时间戳使缓存失效
      _devOnlyInvalidateCacheQueryString:
        process.env.NODE_ENV !== 'production' ? '?ts=' + Date.now() : '',
    };
  }

  /**
   * 渲染文档结构
   * @returns {JSX.Element} - 文档的 JSX 结构
   */
  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

/**
 * Html 组件，用于渲染 <html> 标签
 */
export class Html extends Component {
  static contextTypes = {
    _documentProps: PropTypes.any,
  };

  static propTypes = {
    children: PropTypes.node.isRequired,
  };

  /**
   * 渲染 html 标签
   * @returns {JSX.Element} - html 标签的 JSX 结构
   */
  render() {
    return <html {...this.props} />;
  }
}

/**
 * Head 组件，用于渲染 <head> 标签及其内容
 */
export class Head extends Component {
  static contextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  };

  static propTypes = {
    nonce: PropTypes.string,
    crossOrigin: PropTypes.string,
  };

  /**
   * 获取 CSS 文件的链接
   * @returns {JSX.Element[]|null} - CSS 文件的 <link> 标签数组
   */
  getCssLinks() {
    const { assetPrefix, files } = this.context._documentProps;
    const cssFiles = files && files.length ? files.filter(f => /\.css$/.test(f)) : [];

    return cssFiles.length === 0
      ? null
      : cssFiles.map(file => (
          <link
            key={file}
            nonce={this.props.nonce}
            rel="stylesheet"
            href={`${assetPrefix}/_next/${encodeURI(file)}`}
            crossOrigin={this.props.crossOrigin || process.crossOrigin}
          />
        ));
  }

  /**
   * 获取动态导入的预加载脚本
   * @returns {JSX.Element[]|null} - 动态导入的 <link rel="preload"> 标签数组
   */
  getPreloadDynamicChunks() {
    const { dynamicImports, assetPrefix } = this.context._documentProps;
    const { _devOnlyInvalidateCacheQueryString } = this.context;

    return dedupe(dynamicImports)
      .map(bundle => {
                  // `dynamicImports` will contain both `.js` and `.module.js` when the
          // feature is enabled. This clause will filter down to the modern
          // variants only.
        if (!bundle.file.endsWith(getOptionalModernScriptVariant('.js'))) {
          return null;
        }
        return (
          <link
            rel="preload"
            key={bundle.file}
            href={`${assetPrefix}/_next/${encodeURI(bundle.file)}${_devOnlyInvalidateCacheQueryString}`}
            as="script"
            nonce={this.props.nonce}
            crossOrigin={this.props.crossOrigin || process.crossOrigin}
          />
        );
      })
      .filter(Boolean); // Filter out nulled scripts
  }

  /**
   * 获取主脚本的预加载链接
   * @returns {JSX.Element[]|null} - 主脚本的 <link rel="preload"> 标签数组
   */
  getPreloadMainLinks() {
    const { assetPrefix, files } = this.context._documentProps;
    if (!files || files.length === 0) {
      return null;
    }
    const { _devOnlyInvalidateCacheQueryString } = this.context;

    return files
      .map(file => {
                // `dynamicImports` will contain both `.js` and `.module.js` when the
        // feature is enabled. This clause will filter down to the modern
        // variants only.
        // This also filters out non-JS assets.
        if (!file.endsWith(getOptionalModernScriptVariant('.js'))) {
          return null;
        }
        return (
          <link
            key={file}
            nonce={this.props.nonce}
            rel="preload"
            href={`${assetPrefix}/_next/${encodeURI(file)}${_devOnlyInvalidateCacheQueryString}`}
            as="script"
            crossOrigin={this.props.crossOrigin || process.crossOrigin}
          />
        );
      })
      .filter(Boolean);
  }

  /**
   * 渲染 head 标签及其内容
   * @returns {JSX.Element} - head 标签的 JSX 结构
   */
  render() {
    const {
      styles,
      ampPath,
      inAmpMode,
      assetPrefix,
      hybridAmp,
      canonicalBase,
      __NEXT_DATA__,
      dangerousAsPath,
    } = this.context._documentProps;
    const { _devOnlyInvalidateCacheQueryString } = this.context;
    const { page, buildId } = __NEXT_DATA__;

    let { head } = this.context._documentProps;
    let children = this.props.children;

    // 在开发环境中，检查是否在 Head 中使用了 <title>
    if (process.env.NODE_ENV !== 'production') {
      children = React.Children.map(children, child => {
        const isReactHelmet = child && child.props && child.props['data-react-helmet'];
        if (child && child.type === 'title' && !isReactHelmet) {
          console.warn(
            "警告：<title> 不应在 _document.js 的 <Head> 中使用。详见：https://err.sh/next.js/no-document-title"
          );
        }
        return child;
      });
      if (this.props.crossOrigin) {
        console.warn(
          '警告：`Head` 属性的 `crossOrigin` 已废弃。详见：https://err.sh/next.js/doc-crossorigin-deprecated'
        );
      }
    }

    const curStyles = Array.isArray(styles) ? styles : [];

    return (
      <head {...this.props}>
        {this.context._documentProps.isDevelopment && this.context._documentProps.hasCssMode && (
          <>
            <style
              data-next-hide-fouc
              dangerouslySetInnerHTML={{ __html: `body{display:none}` }}
            />
            <noscript data-next-hide-fouc>
              <style dangerouslySetInnerHTML={{ __html: `body{display:block}` }} />
            </noscript>
          </>
        )}
        {children}
        {head}
        <meta
          name="next-head-count"
          content={React.Children.count(head || []).toString()}
        />
        {(
          <>
            {page !== '/_error' && (
              <link
                rel="preload"
                href={
                  assetPrefix +
                  getOptionalModernScriptVariant(
                    encodeURI(`/_next/static/${buildId}/pages${getPageFile(page)}`)
                  ) +
                  _devOnlyInvalidateCacheQueryString
                }
                as="script"
                nonce={this.props.nonce}
                crossOrigin={this.props.crossOrigin || process.crossOrigin}
              />
            )}
            <link
              rel="preload"
              href={
                assetPrefix +
                getOptionalModernScriptVariant(
                  encodeURI(`/_next/static/${buildId}/pages/_app.js`)
                ) +
                _devOnlyInvalidateCacheQueryString
              }
              as="script"
              nonce={this.props.nonce}
              crossOrigin={this.props.crossOrigin || process.crossOrigin}
            />
            {this.getPreloadDynamicChunks()}
            {this.getPreloadMainLinks()}
            {this.context._documentProps.isDevelopment && this.context._documentProps.hasCssMode && (
              <noscript id="__next_css__DO_NOT_USE__" />
            )}
            {this.getCssLinks()}
            {styles || null}
          </>
        )}
      </head>
    );
  }
}

/**
 * Main 组件，用于渲染页面内容
 */
export class Main extends Component {
  static contextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  };

  /**
   * 渲染主内容区域
   * @returns {JSX.Element} - 包含页面 HTML 的 div
   */
  render() {
    const { html } = this.context._documentProps;
    return <div id="__next" dangerouslySetInnerHTML={{ __html: html }} />;
  }
}

/**
 * NextScript 组件，用于加载脚本
 */
export class NextScript extends Component {
  static contextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  };

  static propTypes = {
    nonce: PropTypes.string,
    crossOrigin: PropTypes.string,
  };

  // 用于修复 Safari 浏览器的 nomodule 问题
  static safariNomoduleFix =
    '!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();';

  /**
   * 获取动态导入的脚本
   * @returns {JSX.Element[]|null} - 动态导入的 <script> 标签数组
   */
  getDynamicChunks() {
    const { dynamicImports, assetPrefix, files } = this.context._documentProps;
    const { _devOnlyInvalidateCacheQueryString } = this.context;

    return dedupe(dynamicImports).map(bundle => {
      let modernProps = {};
      if (process.env.__NEXT_MODERN_BUILD) {
        modernProps = /\.module\.js$/.test(bundle.file)
          ? { type: 'module' }
          : { noModule: true };
      }

      if (!/\.js$/.test(bundle.file) || files.includes(bundle.file)) return null;

      return (
        <script
          async
          key={bundle.file}
          src={`${assetPrefix}/_next/${encodeURI(bundle.file)}${_devOnlyInvalidateCacheQueryString}`}
          nonce={this.props.nonce}
          crossOrigin={this.props.crossOrigin || process.crossOrigin}
          {...modernProps}
        />
      );
    });
  }

  /**
   * 获取所有脚本
   * @returns {JSX.Element[]|null} - 所有 <script> 标签数组
   */
  getScripts() {
    const { assetPrefix, files } = this.context._documentProps;
    if (!files || files.length === 0) {
      return null;
    }
    const { _devOnlyInvalidateCacheQueryString } = this.context;

    return files.map(file => {
      if (!/\.js$/.test(file)) {
        return null;
      }

      let modernProps = {};
      if (process.env.__NEXT_MODERN_BUILD) {
        modernProps = /\.module\.js$/.test(file)
          ? { type: 'module' }
          : { noModule: true };
      }

      return (
        <script
          key={file}
          src={`${assetPrefix}/_next/${encodeURI(file)}${_devOnlyInvalidateCacheQueryString}`}
          nonce={this.props.nonce}
          async
          crossOrigin={this.props.crossOrigin || process.crossOrigin}
          {...modernProps}
        />
      );
    });
  }

  /**
   * 获取内联脚本的 JSON 数据
   * @param {Object} documentProps - 文档 props
   * @returns {string} - 转义后的 JSON 字符串
   */
  static getInlineScriptSource(documentProps) {
    const { __NEXT_DATA__ } = documentProps;
    try {
      const data = JSON.stringify(__NEXT_DATA__);
      return htmlEscapeJsonString(data);
    } catch (err) {
      if (err.message.indexOf('circular structure')) {
        throw new Error(
          `页面 "${__NEXT_DATA__.page}" 的 "getInitialProps" 结果中存在循环结构。详见：https://err.sh/zeit/next.js/circular-structure`
        );
      }
      throw err;
    }
  }

  /**
   * 渲染脚本标签
   * @returns {JSX.Element} - 包含所有脚本的 JSX 结构
   */
  render() {
    const {
      staticMarkup,
      assetPrefix,
      inAmpMode,
      devFiles,
      __NEXT_DATA__,
    } = this.context._documentProps;
    const { _devOnlyInvalidateCacheQueryString } = this.context;

    const { page, buildId } = __NEXT_DATA__;

    if (process.env.NODE_ENV !== 'production') {
      if (this.props.crossOrigin) {
        console.warn(
          '警告：`NextScript` 属性的 `crossOrigin` 已废弃。详见：https://err.sh/next.js/doc-crossorigin-deprecated'
        );
      }
    }

    const pageScript = [
      <script
        async
        data-next-page={page}
        key={page}
        src={
          assetPrefix +
          encodeURI(`/_next/static/${buildId}/pages${getPageFile(page)}`) +
          _devOnlyInvalidateCacheQueryString
        }
        nonce={this.props.nonce}
        crossOrigin={this.props.crossOrigin || process.crossOrigin}
        {...(process.env.__NEXT_MODERN_BUILD ? { noModule: true } : {})}
      />,
      process.env.__NEXT_MODERN_BUILD && (
        <script
          async
          data-next-page={page}
          key={`${page}-modern`}
          src={
            assetPrefix +
            getOptionalModernScriptVariant(
              encodeURI(`/_next/static/${buildId}/pages${getPageFile(page)}`)
            ) +
            _devOnlyInvalidateCacheQueryString
          }
          nonce={this.props.nonce}
          crossOrigin={this.props.crossOrigin || process.crossOrigin}
          type="module"
        />
      ),
    ];

    const appScript = [
      <script
        async
        data-next-page="/_app"
        src={
          assetPrefix +
          `/_next/static/${buildId}/pages/_app.js` +
          _devOnlyInvalidateCacheQueryString
        }
        key="_app"
        nonce={this.props.nonce}
        crossOrigin={this.props.crossOrigin || process.crossOrigin}
        {...(process.env.__NEXT_MODERN_BUILD ? { noModule: true } : {})}
      />,
      process.env.__NEXT_MODERN_BUILD && (
        <script
          async
          data-next-page="/_app"
          src={
            assetPrefix +
            `/_next/static/${buildId}/pages/_app.module.js` +
            _devOnlyInvalidateCacheQueryString
          }
          key="_app-modern"
          nonce={this.props.nonce}
          crossOrigin={this.props.crossOrigin || process.crossOrigin}
          type="module"
        />
      ),
    ];

    return (
      <>
        {devFiles
          ? devFiles.map(
              file =>
                !file.match(/\.js\.map/) && (
                  <script
                    key={file}
                    src={`${assetPrefix}/_next/${encodeURI(file)}${_devOnlyInvalidateCacheQueryString}`}
                    nonce={this.props.nonce}
                    crossOrigin={this.props.crossOrigin || process.crossOrigin}
                  />
                )
            )
          : null}
        {staticMarkup ? null : (
          <script
            id="__NEXT_DATA__"
            type="application/json"
            nonce={this.props.nonce}
            crossOrigin={this.props.crossOrigin || process.crossOrigin}
            dangerouslySetInnerHTML={{
              __html: NextScript.getInlineScriptSource(this.context._documentProps),
            }}
          />
        )}
        {process.env.__NEXT_MODERN_BUILD ? (
          <script
            nonce={this.props.nonce}
            crossOrigin={this.props.crossOrigin || process.crossOrigin}
            noModule={true}
            dangerouslySetInnerHTML={{
              __html: NextScript.safariNomoduleFix,
            }}
          />
        ) : null}
        {page !== '/_error' && pageScript}
        {appScript}
        {staticMarkup ? null : this.getDynamicChunks()}
        {staticMarkup ? null : this.getScripts()}
      </>
    );
  }
}

/**
 * 获取页面文件路径
 * @param {string} page - 页面路径
 * @param {string} [buildId] - 构建 ID
 * @returns {string} - 页面文件路径
 */
function getPageFile(page, buildId) {
  if (page === '/') {
    return buildId ? `/index.${buildId}.js` : '/index.js';
  }
  return buildId ? `${page}.${buildId}.js` : `${page}.js`;
}