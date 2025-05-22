/* global __NEXT_DATA__ */
import { resolve, parse } from 'url';
import React, { Component, Children } from 'react';
import PropTypes from 'prop-types';
import Router from './router';
import { rewriteUrlForNextExport } from '../next-server/lib/router/rewrite-url-for-export';
import {
  execOnce,
  formatWithValidation,
  getLocationOrigin,
} from '../next-server/lib/utils';

/**
 * 判断链接是否为本地 URL
 * @param {string} href - 要检查的 URL
 * @returns {boolean} - 如果是本地 URL，返回 true
 */
function isLocal(href) {
  const url = parse(href, false, true);
  const origin = parse(getLocationOrigin(), false, true);

  return !url.host || (url.protocol === origin.protocol && url.host === origin.host);
}

/**
 * 缓存格式化 URL 的结果以避免重复计算
 * @param {Function} formatFunc - 格式化 URL 的函数
 * @returns {Function} - 带缓存的格式化函数
 */
function memoizedFormatUrl(formatFunc) {
  let lastHref = null;
  let lastAs = null;
  let lastResult = null;
  return (href, as) => {
    if (lastResult && href === lastHref && as === lastAs) {
      return lastResult;
    }

    const result = formatFunc(href, as);
    lastHref = href;
    lastAs = as;
    lastResult = result;
    return result;
  };
}

/**
 * 格式化 URL，支持字符串或对象
 * @param {string|Object} url - 要格式化的 URL
 * @returns {string} - 格式化后的 URL
 */
function formatUrl(url) {
  return url && typeof url === 'object' ? formatWithValidation(url) : url;
}


// IntersectionObserver 的全局实例和监听器
let observer;
const listeners = new Map();
const IntersectionObserver = typeof window !== 'undefined' ? window.IntersectionObserver : null;

/**
 * 获取或创建 IntersectionObserver 实例
 * @returns {IntersectionObserver|undefined} - Observer 实例或 undefined
 */
function getObserver() {
  if (observer) {
    return observer;
  }

  if (!IntersectionObserver) {
    return undefined;
  }

  return (observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!listeners.has(entry.target)) {
          return;
        }

        const cb = listeners.get(entry.target);
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          observer.unobserve(entry.target);
          listeners.delete(entry.target);
          cb();
        }
      });
    },
    { rootMargin: '200px' }
  ));
}

/**
 * 监听元素是否进入视口，触发回调
 * @param {Element} el - 要监听的 DOM 元素
 * @param {Function} cb - 进入视口时的回调函数
 * @returns {Function} - 清理监听器的函数
 */
const listenToIntersections = (el, cb) => {
  const observer = getObserver();
  if (!observer) {
    return () => {};
  }

  observer.observe(el);
  listeners.set(el, cb);
  return () => {
    try {
      observer.unobserve(el);
    } catch (err) {
      console.error(err);
    }
    listeners.delete(el);
  };
};



/**
 * Link 组件，用于实现客户端导航
 */
class Link extends Component {
  constructor(props) {
    super(props);
    // 在开发环境中，警告 prefetch 属性已废弃
    if (process.env.NODE_ENV !== 'production') {
      if (props.prefetch) {
        console.warn(
          'Next.js 已自动根据视口预取，prefetch 属性不再需要。详见：https://err.sh/zeit/next.js/prefetch-true-deprecated'
        );
      }
    }
    // 设置是否启用预取（默认为 true，除非明确设置为 false）
    this.p = props.prefetch !== false;
  }

  // 初始化清理监听器的函数
  cleanUpListeners = () => {};

  /**
   * 组件卸载时清理 IntersectionObserver 监听器
   */
  componentWillUnmount() {
    this.cleanUpListeners();
  }

  /**
   * 处理 ref，设置 IntersectionObserver 以触发预取
   * @param {Element} ref - DOM 元素引用
   */
  handleRef(ref) {
    if (this.p && IntersectionObserver && ref && ref.tagName) {
      this.cleanUpListeners();
      this.cleanUpListeners = listenToIntersections(ref, () => {
        this.prefetch();
      });
    }
  }

  // 缓存格式化 URL 的函数
  formatUrls = memoizedFormatUrl((href, asHref) => {
    return {
      href: formatUrl(href),
      as: asHref ? formatUrl(asHref) : asHref,
    };
  });

  /**
   * 处理链接点击事件，实现客户端导航
   * @param {React.MouseEvent} e - 点击事件
   */
  linkClicked = (e) => {
    const { nodeName, target } = e.currentTarget;
    // 忽略新窗口/新标签页的点击
    if (
      nodeName === 'A' &&
      ((target && target !== '_self') ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        (e.nativeEvent && e.nativeEvent.which === 2))
    ) {
      return;
    }

    let { href, as } = this.formatUrls(this.props.href, this.props.as);

    // 忽略非本地 URL
    if (!isLocal(href)) {
      return;
    }

    const { pathname } = window.location;
    href = resolve(pathname, href);
    as = as ? resolve(pathname, as) : href;

    e.preventDefault();

    // 根据 scroll 属性决定是否滚动到页面顶部
    let { scroll } = this.props;
    if (scroll == null) {
      scroll = as.indexOf('#') < 0;
    }

    // 使用 Router.push 或 Router.replace 进行导航
    Router[this.props.replace ? 'replace' : 'push'](href, as, {
      shallow: this.props.shallow,
    }).then((success) => {
      if (!success) return;
      if (scroll) {
        window.scrollTo(0, 0);
        document.body.focus();
      }
    });
  };

  /**
   * 预取页面数据（仅在客户端运行）
   */
  prefetch() {
    if (!this.p || typeof window === 'undefined') return;

    const { pathname } = window.location;
    const { href: parsedHref } = this.formatUrls(this.props.href, this.props.as);
    const href = resolve(pathname, parsedHref);
    Router.prefetch(href);
  }

  /**
   * 渲染 Link 组件
   * @returns {JSX.Element} - 渲染的 JSX 结构
   */
  render() {
    let { children } = this.props;
    const { href, as } = this.formatUrls(this.props.href, this.props.as);

    // 兼容旧版：如果 children 是字符串，自动包裹在 <a> 标签中
    if (typeof children === 'string') {
      children = <a>{children}</a>;
    }

    // 确保只有一个子节点
    const child = Children.only(children);
    const props = {
      ref: (el) => {
        this.handleRef(el);
        if (child && typeof child === 'object' && child.ref) {
          if (typeof child.ref === 'function') child.ref(el);
          else if (typeof child.ref === 'object') {
            child.ref.current = el;
          }
        }
      },
      onMouseEnter: (e) => {
        if (child.props && typeof child.props.onMouseEnter === 'function') {
          child.props.onMouseEnter(e);
        }
        this.prefetch();
      },
      onClick: (e) => {
        if (child.props && typeof child.props.onClick === 'function') {
          child.props.onClick(e);
        }
        if (!e.defaultPrevented) {
          this.linkClicked(e);
        }
      },
    };

    // 如果子节点是 <a> 且没有 href 属性，或设置了 passHref，则添加 href
    if (
      this.props.passHref ||
      (child.type === 'a' && !('href' in child.props))
    ) {
      props.href = as || href;
    }

    // 支持 NEXT_EXPORT_TRAILING_SLASH，添加末尾斜杠
    if (
      process.env.__NEXT_EXPORT_TRAILING_SLASH &&
      props.href &&
      typeof __NEXT_DATA__ !== 'undefined' &&
      __NEXT_DATA__.nextExport
    ) {
      props.href = rewriteUrlForNextExport(props.href);
    }

    return React.cloneElement(child, props);
  }
}


// 在开发环境中，设置 PropTypes 验证
if (process.env.NODE_ENV === 'development') {
  const warn = execOnce(console.error);
  const exact = require('prop-types-exact');
  Link.propTypes = exact({
    href: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    as: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    prefetch: PropTypes.bool,
    replace: PropTypes.bool,
    shallow: PropTypes.bool,
    passHref: PropTypes.bool,
    scroll: PropTypes.bool,
    children: PropTypes.oneOfType([
      PropTypes.element,
      (props, propName) => {
        const value = props[propName];
        if (typeof value === 'string') {
          warn(
            `警告：直接在 <Link> 中使用字符串已废弃，请将内容包裹在 <a> 标签中`
          );
        }
        return null;
      },
    ]).isRequired,
  });
}

export default Link;