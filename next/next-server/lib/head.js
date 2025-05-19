import React from 'react'
import withSideEffect from './side-effect'

import { HeadManagerContext } from './head-manager-context'

export function defaultHead(inAmpMode = false) {
  const head = [<meta key="charSet" charSet="utf-8" />]
  if (!inAmpMode) {
    head.push(
      <meta
        key="viewport"
        name="viewport"
        content="width=device-width,minimum-scale=1,initial-scale=1"
      />
    )
  }
  return head
}

function onlyReactElement(list, child) {
  if (typeof child === 'string' || typeof child === 'number') {
    return list
  }

  if (child.type === React.Fragment) {
    return list.concat(
      React.Children.toArray(child.props.children).reduce((fragmentList, fragmentChild) => {
        if (typeof fragmentChild === 'string' || typeof fragmentChild === 'number') {
          return fragmentList
        }
        return fragmentList.concat(fragmentChild)
      }, [])
    )
  }

  return list.concat(child)
}

const METATYPES = ['name', 'httpEquiv', 'charSet', 'itemProp']

function unique() {
  const keys = new Set()
  const tags = new Set()
  const metaTypes = new Set()
  const metaCategories = {}

  return (h) => {
    if (h.key && typeof h.key !== 'number' && h.key.indexOf('.$') === 0) {
      if (keys.has(h.key)) return false
      keys.add(h.key)
      return true
    }

    switch (h.type) {
      case 'title':
      case 'base':
        if (tags.has(h.type)) return false
        tags.add(h.type)
        break
      case 'meta':
        for (let i = 0, len = METATYPES.length; i < len; i++) {
          const metatype = METATYPES[i]
          if (!Object.prototype.hasOwnProperty.call(h.props, metatype)) continue

          if (metatype === 'charSet') {
            if (metaTypes.has(metatype)) return false
            metaTypes.add(metatype)
          } else {
            const category = h.props[metatype]
            const categories = metaCategories[metatype] || new Set()
            if (categories.has(category)) return false
            categories.add(category)
            metaCategories[metatype] = categories
          }
        }
        break
    }

    return true
  }
}

function reduceComponents(headElements, props) {
  return headElements
    .reduce((list, headElement) => {
      const headElementChildren = React.Children.toArray(headElement.props.children)
      return list.concat(headElementChildren)
    }, [])
    .reduce(onlyReactElement, [])
    .reverse()
    .concat(defaultHead())
    .filter(unique())
    .reverse()
    .map((c, i) => {
      const key = c.key || i
      return React.cloneElement(c, { key })
    })
}

const Effect = withSideEffect()

function Head({ children }) {
  return (
    <HeadManagerContext.Consumer>
      {(updateHead) => (
        <Effect
          reduceComponentsToState={reduceComponents}
          handleStateChange={updateHead}
          inAmpMode={false}
        >
          {children}
        </Effect>
      )}
    </HeadManagerContext.Consumer>
  )
}

Head.rewind = Effect.rewind

export default Head
