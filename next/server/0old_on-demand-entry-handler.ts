import { EventEmitter } from 'events'
import { IncomingMessage, ServerResponse } from 'http'
import { join, posix } from 'path'
import { stringify } from 'querystring'
import { parse } from 'url'
import webpack from 'webpack'
import WebpackDevMiddleware from 'webpack-dev-middleware'
import DynamicEntryPlugin from 'webpack/lib/DynamicEntryPlugin'

import { isWriteable } from '../build/is-writeable'
import * as Log from '../build/output/log'
import { API_ROUTE } from '../lib/constants'
import {
  IS_BUNDLED_PAGE_REGEX,
  ROUTE_NAME_REGEX,
} from '../next-server/lib/constants'
import { normalizePagePath } from '../next-server/server/normalize-page-path'
////////import { pageNotFoundError } from '../next-server/server/require'
import { findPageFile } from './lib/find-page-file'

const ADDED = Symbol('added')
const BUILDING = Symbol('building')
const BUILT = Symbol('built')


/**
 * 创建页面未找到的错误
 * @param {string} page - 页面路径（例如 '/about'）
 * @returns {Error} 包含错误信息的 Error 对象，带有 ENOENT 错误码
 */
function pageNotFoundError(page) {
  const err = new Error(`Cannot find module for page: ${page}`);
  err.code = 'ENOENT';
  return err;
}



// Based on https://github.com/webpack/webpack/blob/master/lib/DynamicEntryPlugin.js#L29-L37
function addEntry(
  compilation: webpack.compilation.Compilation,
  context: string,
  name: string,
  entry: string[]
) {
  return new Promise((resolve, reject) => {
    const dep = DynamicEntryPlugin.createDependency(entry, name)
    compilation.addEntry(context, dep, name, (err: Error) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export default function onDemandEntryHandler(
  devMiddleware: WebpackDevMiddleware.WebpackDevMiddleware,
  multiCompiler: webpack.MultiCompiler,
  {
    buildId,
    pagesDir,
    reload,
    pageExtensions,
    maxInactiveAge,
    pagesBufferLength,
  }: {
    buildId: string
    pagesDir: string
    reload: any
    pageExtensions: string[]
    maxInactiveAge: number
    pagesBufferLength: number
  }
) {
  const { compilers } = multiCompiler
  const invalidator = new Invalidator(devMiddleware, multiCompiler)
  let entries: any = {}
  let lastAccessPages = ['']
  let doneCallbacks: EventEmitter | null = new EventEmitter()
  let reloading = false
  let stopped = false
  let reloadCallbacks: EventEmitter | null = new EventEmitter()
  let lastEntry: string | null = null

  for (const compiler of compilers) {
    compiler.hooks.make.tapPromise(
      'NextJsOnDemandEntries',
      (compilation: webpack.compilation.Compilation) => {
        invalidator.startBuilding()

        const allEntries = Object.keys(entries).map(async page => {
          if (compiler.name === 'client' && page.match(API_ROUTE)) {
            return
          }
          const { name, absolutePagePath } = entries[page]
          const pageExists = await isWriteable(absolutePagePath)
          if (!pageExists) {
            Log.event('page was removed', page)
            delete entries[page]
            return
          }

          entries[page].status = BUILDING
          return addEntry(compilation, compiler.context, name, [
            compiler.name === 'client'
              ? `next-client-pages-loader?${stringify({
                  page,
                  absolutePagePath,
                })}!`
              : absolutePagePath,
          ])
        })

        return Promise.all(allEntries).catch(err => console.error(err))
      }
    )
  }

  function findHardFailedPages(errors: any[]) {
    return errors
      .filter(e => {
        // Make sure to only pick errors which marked with missing modules
        const hasNoModuleFoundError =
          /ENOENT/.test(e.message) || /Module not found/.test(e.message)
        if (!hasNoModuleFoundError) return false

        // The page itself is missing. So this is a failed page.
        if (IS_BUNDLED_PAGE_REGEX.test(e.module.name)) return true

        // No dependencies means this is a top level page.
        // So this is a failed page.
        return e.module.dependencies.length === 0
      })
      .map(e => e.module.chunks)
      .reduce((a, b) => [...a, ...b], [])
      .map((c: any) => {
        const pageName = ROUTE_NAME_REGEX.exec(c.name)![1]
        return normalizePage(`/${pageName}`)
      })
  }

  function getPagePathsFromEntrypoints(entrypoints: any) {
    const pagePaths = []
    for (const [, entrypoint] of entrypoints.entries()) {
      const result = ROUTE_NAME_REGEX.exec(entrypoint.name)
      if (!result) {
        continue
      }

      const pagePath = result[1]

      if (!pagePath) {
        continue
      }

      pagePaths.push(pagePath)
    }

    return pagePaths
  }

  multiCompiler.hooks.done.tap('NextJsOnDemandEntries', multiStats => {
    const [clientStats, serverStats] = multiStats.stats
    const hardFailedPages = [
      ...new Set([
        ...findHardFailedPages(clientStats.compilation.errors),
        ...findHardFailedPages(serverStats.compilation.errors),
      ]),
    ]
    const pagePaths = new Set([
      ...getPagePathsFromEntrypoints(clientStats.compilation.entrypoints),
      ...getPagePathsFromEntrypoints(serverStats.compilation.entrypoints),
    ])

    // compilation.entrypoints is a Map object, so iterating over it 0 is the key and 1 is the value
    for (const pagePath of pagePaths) {
      const page = normalizePage('/' + pagePath)

      const entry = entries[page]
      if (!entry) {
        continue
      }

      if (entry.status !== BUILDING) {
        continue
      }

      entry.status = BUILT
      entry.lastActiveTime = Date.now()
      doneCallbacks!.emit(page)
    }

    invalidator.doneBuilding()

    if (hardFailedPages.length > 0 && !reloading) {
      console.log(
        `> Reloading webpack due to inconsistant state of pages(s): ${hardFailedPages.join(
          ', '
        )}`
      )
      reloading = true
      reload()
        .then(() => {
          console.log('> Webpack reloaded.')
          reloadCallbacks!.emit('done')
          stop()
        })
        .catch((err: Error) => {
          console.error(`> Webpack reloading failed: ${err.message}`)
          console.error(err.stack)
          process.exit(1)
        })
    }
  })

  const disposeHandler = setInterval(function() {
    if (stopped) return
    disposeInactiveEntries(
      devMiddleware,
      entries,
      lastAccessPages,
      maxInactiveAge
    )
  }, 5000)

  disposeHandler.unref()

  function stop() {
    clearInterval(disposeHandler)
    stopped = true
    doneCallbacks = null
    reloadCallbacks = null
  }

  function handlePing(pg: string) {
    const page = normalizePage(pg)
    const entryInfo = entries[page]
    let toSend

    // If there's no entry, it may have been invalidated and needs to be re-built.
    if (!entryInfo) {
      if (page !== lastEntry) {
        Log.event(`client pings, but there's no entry for page: ${page}`)
      }
      lastEntry = page
      return { invalid: true }
    }

    // 404 is an on demand entry but when a new page is added we have to refresh the page
    if (page === '/_error') {
      toSend = { invalid: true }
    } else {
      toSend = { success: true }
    }

    // We don't need to maintain active state of anything other than BUILT entries
    if (entryInfo.status !== BUILT) return

    // If there's an entryInfo
    if (!lastAccessPages.includes(page)) {
      lastAccessPages.unshift(page)

      // Maintain the buffer max length
      if (lastAccessPages.length > pagesBufferLength) {
        lastAccessPages.pop()
      }
    }
    entryInfo.lastActiveTime = Date.now()
    return toSend
  }

  return {
    waitUntilReloaded() {
      if (!reloading) return Promise.resolve(true)
      return new Promise(resolve => {
        reloadCallbacks!.once('done', function() {
          resolve()
        })
      })
    },

    async ensurePage(page: string) {
      await this.waitUntilReloaded()
      let normalizedPagePath: string
      try {
        normalizedPagePath = normalizePagePath(page)
      } catch (err) {
        console.error(err)
        throw pageNotFoundError(page)
      }

      let pagePath = await findPageFile(
        pagesDir,
        normalizedPagePath,
        pageExtensions
      )

      // Default the /_error route to the Next.js provided default page
      if (page === '/_error' && pagePath === null) {
        pagePath = 'next/dist/pages/_error'
      }

      if (pagePath === null) {
        throw pageNotFoundError(normalizedPagePath)
      }

      let pageUrl = `/${pagePath
        .replace(new RegExp(`\\.+(?:${pageExtensions.join('|')})$`), '')
        .replace(/\\/g, '/')}`.replace(/\/index$/, '')
      pageUrl = pageUrl === '' ? '/' : pageUrl
      const bundleFile = pageUrl === '/' ? '/index.js' : `${pageUrl}.js`
      const name = join('static', buildId, 'pages', bundleFile)
      const absolutePagePath = pagePath.startsWith('next/dist/pages')
        ? require.resolve(pagePath)
        : join(pagesDir, pagePath)

      page = posix.normalize(pageUrl)

      return new Promise((resolve, reject) => {
        // Makes sure the page that is being kept in on-demand-entries matches the webpack output
        const normalizedPage = normalizePage(page)
        const entryInfo = entries[normalizedPage]

        if (entryInfo) {
          if (entryInfo.status === BUILT) {
            resolve()
            return
          }

          if (entryInfo.status === BUILDING) {
            doneCallbacks!.once(normalizedPage, handleCallback)
            return
          }
        }

        Log.event(`build page: ${normalizedPage}`)

        entries[normalizedPage] = { name, absolutePagePath, status: ADDED }
        doneCallbacks!.once(normalizedPage, handleCallback)

        invalidator.invalidate()

        function handleCallback(err: Error) {
          if (err) return reject(err)
          resolve()
        }
      })
    },

    middleware() {
      return (req: IncomingMessage, res: ServerResponse, next: Function) => {
        if (stopped) {
          // If this handler is stopped, we need to reload the user's browser.
          // So the user could connect to the actually running handler.
          res.statusCode = 302
          res.setHeader('Location', req.url!)
          res.end('302')
        } else if (reloading) {
          // Webpack config is reloading. So, we need to wait until it's done and
          // reload user's browser.
          // So the user could connect to the new handler and webpack setup.
          this.waitUntilReloaded().then(() => {
            res.statusCode = 302
            res.setHeader('Location', req.url!)
            res.end('302')
          })
        } else {
          if (!/^\/_next\/webpack-hmr/.test(req.url!)) return next()

          const { query } = parse(req.url!, true)
          const page = query.page
          if (!page) return next()

          const runPing = () => {
            const data = handlePing(query.page as string)
            if (!data) return
            res.write('data: ' + JSON.stringify(data) + '\n\n')
          }
          const pingInterval = setInterval(() => runPing(), 5000)

          req.on('close', () => {
            clearInterval(pingInterval)
          })
          // Do initial ping right after EventSource is finished being set up
          setImmediate(() => runPing())
          next()
        }
      }
    },
  }
}

function disposeInactiveEntries(
  devMiddleware: WebpackDevMiddleware.WebpackDevMiddleware,
  entries: any,
  lastAccessPages: any,
  maxInactiveAge: number
) {
  const disposingPages: any = []

  Object.keys(entries).forEach(page => {
    const { lastActiveTime, status } = entries[page]

    // This means this entry is currently building or just added
    // We don't need to dispose those entries.
    if (status !== BUILT) return

    // We should not build the last accessed page even we didn't get any pings
    // Sometimes, it's possible our XHR ping to wait before completing other requests.
    // In that case, we should not dispose the current viewing page
    if (lastAccessPages.includes(page)) return

    if (Date.now() - lastActiveTime > maxInactiveAge) {
      disposingPages.push(page)
    }
  })

  if (disposingPages.length > 0) {
    disposingPages.forEach((page: any) => {
      delete entries[page]
    })
    Log.event(`disposing inactive page(s): ${disposingPages.join(', ')}`)
    devMiddleware.invalidate()
  }
}

// /index and / is the same. So, we need to identify both pages as the same.
// This also applies to sub pages as well.
export function normalizePage(page: string) {
  const unixPagePath = page.replace(/\\/g, '/')
  if (unixPagePath === '/index' || unixPagePath === '/') {
    return '/'
  }
  return unixPagePath.replace(/\/index$/, '')
}

// Make sure only one invalidation happens at a time
// Otherwise, webpack hash gets changed and it'll force the client to reload.
class Invalidator {
  private multiCompiler: webpack.MultiCompiler
  private devMiddleware: WebpackDevMiddleware.WebpackDevMiddleware
  private building: boolean
  private rebuildAgain: boolean

  constructor(
    devMiddleware: WebpackDevMiddleware.WebpackDevMiddleware,
    multiCompiler: webpack.MultiCompiler
  ) {
    this.multiCompiler = multiCompiler
    this.devMiddleware = devMiddleware
    // contains an array of types of compilers currently building
    this.building = false
    this.rebuildAgain = false
  }

  invalidate() {
    // If there's a current build is processing, we won't abort it by invalidating.
    // (If aborted, it'll cause a client side hard reload)
    // But let it to invalidate just after the completion.
    // So, it can re-build the queued pages at once.
    if (this.building) {
      this.rebuildAgain = true
      return
    }

    this.building = true
    // Work around a bug in webpack, calling `invalidate` on Watching.js
    // doesn't trigger the invalid call used to keep track of the `.done` hook on multiCompiler
    for (const compiler of this.multiCompiler.compilers) {
      compiler.hooks.invalid.call()
    }
    this.devMiddleware.invalidate()
  }

  startBuilding() {
    this.building = true
  }

  doneBuilding() {
    this.building = false

    if (this.rebuildAgain) {
      this.rebuildAgain = false
      this.invalidate()
    }
  }
}
