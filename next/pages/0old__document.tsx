/* eslint-disable */
import PropTypes from 'prop-types'
import React, { Component } from 'react'
 
import {
  DocumentContext,
  DocumentInitialProps,
  DocumentProps,
} from '../next-server/lib/utils'
import { htmlEscapeJsonString } from '../server/htmlescape'
import flush from 'styled-jsx/server'
 

export { DocumentContext, DocumentInitialProps, DocumentProps }

export type OriginProps = {
  nonce?: string
  crossOrigin?: string
}

export type DocumentComponentContext = {
  readonly _documentProps: DocumentProps
  readonly _devOnlyInvalidateCacheQueryString: string
}

export async function middleware({ req, res }: DocumentContext) {}

function dedupe(bundles: any[]): any[] {
  const files = new Set()
  const kept = []

  for (const bundle of bundles) {
    if (files.has(bundle.file)) continue
    files.add(bundle.file)
    kept.push(bundle)
  }
  return kept
}

function getOptionalModernScriptVariant(path: string) {
  if (process.env.__NEXT_MODERN_BUILD) {
    return path.replace(/\.js$/, '.module.js')
  }
  return path
}

/**
 * `Document` component handles the initial `document` markup and renders only on the server side.
 * Commonly used for implementing server side rendering for `css-in-js` libraries.
 */
export default class Document<P = {}> extends Component<DocumentProps & P> {
  static childContextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  }

  /**
   * `getInitialProps` hook returns the context object with the addition of `renderPage`.
   * `renderPage` callback executes `React` rendering logic synchronously to support server-rendering wrappers
   */
  static async getInitialProps({
    renderPage,
  }: DocumentContext): Promise<DocumentInitialProps> {
    const { html, head, dataOnly } = await renderPage()
    const styles = flush()
    return { html, head, styles, dataOnly }
  }

  context!: DocumentComponentContext

  getChildContext(): DocumentComponentContext {
    return {
      _documentProps: this.props,
      // In dev we invalidate the cache by appending a timestamp to the resource URL.
      // This is a workaround to fix https://github.com/zeit/next.js/issues/5860
      // TODO: remove this workaround when https://bugs.webkit.org/show_bug.cgi?id=187726 is fixed.
      _devOnlyInvalidateCacheQueryString:
        process.env.NODE_ENV !== 'production' ? '?ts=' + Date.now() : '',
    }
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export class Html extends Component<
  React.DetailedHTMLProps<
    React.HtmlHTMLAttributes<HTMLHtmlElement>,
    HTMLHtmlElement
  >
> {
  static contextTypes = {
    _documentProps: PropTypes.any,
  }

  static propTypes = {
    children: PropTypes.node.isRequired,
  }

  context!: DocumentComponentContext

  render() {
 
    return (
      <html
        {...this.props} 
      />
    )
  }
}

export class Head extends Component<
  OriginProps &
    React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLHeadElement>,
      HTMLHeadElement
    >
> {
  static contextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  }

  static propTypes = {
    nonce: PropTypes.string,
    crossOrigin: PropTypes.string,
  }

  context!: DocumentComponentContext

  getCssLinks() {
    const { assetPrefix, files } = this.context._documentProps
    const cssFiles =
      files && files.length ? files.filter(f => /\.css$/.test(f)) : []

    return cssFiles.length === 0
      ? null
      : cssFiles.map((file: string) => {
          return (
            <link
              key={file}
              nonce={this.props.nonce}
              rel="stylesheet"
              href={`${assetPrefix}/_next/${encodeURI(file)}`}
              crossOrigin={this.props.crossOrigin || process.crossOrigin}
            />
          )
        })
  }

  getPreloadDynamicChunks() {
    const { dynamicImports, assetPrefix } = this.context._documentProps
    const { _devOnlyInvalidateCacheQueryString } = this.context

    return (
      dedupe(dynamicImports)
        .map((bundle: any) => {
          // `dynamicImports` will contain both `.js` and `.module.js` when the
          // feature is enabled. This clause will filter down to the modern
          // variants only.
          if (!bundle.file.endsWith(getOptionalModernScriptVariant('.js'))) {
            return null
          }

          return (
            <link
              rel="preload"
              key={bundle.file}
              href={`${assetPrefix}/_next/${encodeURI(
                bundle.file
              )}${_devOnlyInvalidateCacheQueryString}`}
              as="script"
              nonce={this.props.nonce}
              crossOrigin={this.props.crossOrigin || process.crossOrigin}
            />
          )
        })
        // Filter out nulled scripts
        .filter(Boolean)
    )
  }

  getPreloadMainLinks() {
    const { assetPrefix, files } = this.context._documentProps
    if (!files || files.length === 0) {
      return null
    }
    const { _devOnlyInvalidateCacheQueryString } = this.context

    return files
      .map((file: string) => {
        // `dynamicImports` will contain both `.js` and `.module.js` when the
        // feature is enabled. This clause will filter down to the modern
        // variants only.
        // This also filters out non-JS assets.
        if (!file.endsWith(getOptionalModernScriptVariant('.js'))) {
          return null
        }

        return (
          <link
            key={file}
            nonce={this.props.nonce}
            rel="preload"
            href={`${assetPrefix}/_next/${encodeURI(
              file
            )}${_devOnlyInvalidateCacheQueryString}`}
            as="script"
            crossOrigin={this.props.crossOrigin || process.crossOrigin}
          />
        )
      })
      .filter(Boolean)
  }

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
    } = this.context._documentProps
    const { _devOnlyInvalidateCacheQueryString } = this.context
    const { page, buildId } = __NEXT_DATA__

    let { head } = this.context._documentProps
    let children = this.props.children
    // show a warning if Head contains <title> (only in development)
    if (process.env.NODE_ENV !== 'production') {
      children = React.Children.map(children, (child: any) => {
        const isReactHelmet =
          child && child.props && child.props['data-react-helmet']
        if (child && child.type === 'title' && !isReactHelmet) {
          console.warn(
            "Warning: <title> should not be used in _document.js's <Head>. https://err.sh/next.js/no-document-title"
          )
        }
        return child
      })
      if (this.props.crossOrigin)
        console.warn(
          'Warning: `Head` attribute `crossOrigin` is deprecated. https://err.sh/next.js/doc-crossorigin-deprecated'
        )
    }

 

    // try to parse styles from fragment for backwards compat
    const curStyles: React.ReactElement[] = Array.isArray(styles)
      ? (styles as React.ReactElement[])
      : []
 

    return (
      <head {...this.props}>
        {this.context._documentProps.isDevelopment &&
          this.context._documentProps.hasCssMode && (
            <>
              <style
                data-next-hide-fouc
                dangerouslySetInnerHTML={{
                  __html: `body{display:none}`,
                }}
              />
              <noscript data-next-hide-fouc>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `body{display:block}`,
                  }}
                />
              </noscript>
            </>
          )}
        {children}
        {head}
        <meta
          name="next-head-count"
          content={React.Children.count(head || []).toString()}
        />
 
        { (
          <>
 
            {page !== '/_error' && (
              <link
                rel="preload"
                href={
                  assetPrefix +
                  getOptionalModernScriptVariant(
                    encodeURI(
                      `/_next/static/${buildId}/pages${getPageFile(page)}`
                    )
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
            {this.context._documentProps.isDevelopment &&
              this.context._documentProps.hasCssMode && (
                // this element is used to mount development styles so the
                // ordering matches production
                // (by default, style-loader injects at the bottom of <head />)
                <noscript id="__next_css__DO_NOT_USE__" />
              )}
            {this.getCssLinks()}
            {styles || null}
          </>
        )}
      </head>
    )
  }
}

export class Main extends Component {
  static contextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  }

  context!: DocumentComponentContext

  render() {
    const {  html } = this.context._documentProps
   
    return <div id="__next" dangerouslySetInnerHTML={{ __html: html }} />
  }
}

export class NextScript extends Component<OriginProps> {
  static contextTypes = {
    _documentProps: PropTypes.any,
    _devOnlyInvalidateCacheQueryString: PropTypes.string,
  }

  static propTypes = {
    nonce: PropTypes.string,
    crossOrigin: PropTypes.string,
  }

  context!: DocumentComponentContext

  // Source: https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc
  static safariNomoduleFix =
    '!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();'

  getDynamicChunks() {
    const { dynamicImports, assetPrefix, files } = this.context._documentProps
    const { _devOnlyInvalidateCacheQueryString } = this.context

    return dedupe(dynamicImports).map((bundle: any) => {
      let modernProps = {}
      if (process.env.__NEXT_MODERN_BUILD) {
        modernProps = /\.module\.js$/.test(bundle.file)
          ? { type: 'module' }
          : { noModule: true }
      }

      if (!/\.js$/.test(bundle.file) || files.includes(bundle.file)) return null

      return (
        <script
          async
          key={bundle.file}
          src={`${assetPrefix}/_next/${encodeURI(
            bundle.file
          )}${_devOnlyInvalidateCacheQueryString}`}
          nonce={this.props.nonce}
          crossOrigin={this.props.crossOrigin || process.crossOrigin}
          {...modernProps}
        />
      )
    })
  }

  getScripts() {
    const { assetPrefix, files } = this.context._documentProps
    if (!files || files.length === 0) {
      return null
    }
    const { _devOnlyInvalidateCacheQueryString } = this.context

    return files.map((file: string) => {
      // Only render .js files here
      if (!/\.js$/.test(file)) {
        return null
      }

      let modernProps = {}
      if (process.env.__NEXT_MODERN_BUILD) {
        modernProps = /\.module\.js$/.test(file)
          ? { type: 'module' }
          : { noModule: true }
      }

      return (
        <script
          key={file}
          src={`${assetPrefix}/_next/${encodeURI(
            file
          )}${_devOnlyInvalidateCacheQueryString}`}
          nonce={this.props.nonce}
          async
          crossOrigin={this.props.crossOrigin || process.crossOrigin}
          {...modernProps}
        />
      )
    })
  }

  static getInlineScriptSource(documentProps: DocumentProps) {
    const { __NEXT_DATA__ } = documentProps
    try {
      const data = JSON.stringify(__NEXT_DATA__)
      return htmlEscapeJsonString(data)
    } catch (err) {
      if (err.message.indexOf('circular structure')) {
        throw new Error(
          `Circular structure in "getInitialProps" result of page "${
            __NEXT_DATA__.page
          }". https://err.sh/zeit/next.js/circular-structure`
        )
      }
      throw err
    }
  }

  render() {
    const {
      staticMarkup,
      assetPrefix,
      inAmpMode,
      devFiles,
      __NEXT_DATA__,
    } = this.context._documentProps
    const { _devOnlyInvalidateCacheQueryString } = this.context

 

    const { page, buildId } = __NEXT_DATA__

    if (process.env.NODE_ENV !== 'production') {
      if (this.props.crossOrigin)
        console.warn(
          'Warning: `NextScript` attribute `crossOrigin` is deprecated. https://err.sh/next.js/doc-crossorigin-deprecated'
        )
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
    ]

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
    ]

    return (
      <>
        {devFiles
          ? devFiles.map(
              (file: string) =>
                !file.match(/\.js\.map/) && (
                  <script
                    key={file}
                    src={`${assetPrefix}/_next/${encodeURI(
                      file
                    )}${_devOnlyInvalidateCacheQueryString}`}
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
              __html: NextScript.getInlineScriptSource(
                this.context._documentProps
              ),
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
    )
  }
}

 
function getPageFile(page: string, buildId?: string) {
  if (page === '/') {
    return buildId ? `/index.${buildId}.js` : '/index.js'
  }

  return buildId ? `${page}.${buildId}.js` : `${page}.js`
}
