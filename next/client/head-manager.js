// DOM 属性名称映射，用于将 React 属性转换为 HTML 属性
const DOMAttributeNames = {
  acceptCharset: 'accept-charset',
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
};

/**
 * HeadManager 类，用于管理 HTML head 标签的动态更新
 */
export default class HeadManager {
  constructor() {
    // 初始化更新承诺
    this.updatePromise = null;
  }

  /**
   * 更新 head 标签内容
   * @param {Array} head - 包含 head 标签的数组
   */
  updateHead = head => {
    const promise = (this.updatePromise = Promise.resolve().then(() => {
      // 确保仅处理最新的更新请求
      if (promise !== this.updatePromise) return;

      this.updatePromise = null;
      this.doUpdateHead(head);
    }));
  };

  /**
   * 执行 head 标签的实际更新
   * @param {Array} head - 包含 head 标签的数组
   */
  doUpdateHead(head) {
    const tags = {};
    // 按类型组织标签
    head.forEach(h => {
      const components = tags[h.type] || [];
      components.push(h);
      tags[h.type] = components;
    });

    // 更新页面标题
    this.updateTitle(tags.title ? tags.title[0] : null);

    // 更新其他类型的标签
    const types = ['meta', 'base', 'link', 'style', 'script'];
    types.forEach(type => {
      this.updateElements(type, tags[type] || []);
    });
  }

  /**
   * 更新页面标题
   * @param {Object|null} component - 标题组件
   */
  updateTitle(component) {
    let title = '';
    if (component) {
      const { children } = component.props;
      title = typeof children === 'string' ? children : children.join('');
    }
    if (title !== document.title) document.title = title;
  }

  /**
   * 更新指定类型的 head 标签
   * @param {string} type - 标签类型（如 meta、link）
   * @param {Array} components - 标签组件数组
   */
  updateElements(type, components) {
    const headEl = document.getElementsByTagName('head')[0];
    const headCountEl = headEl.querySelector('meta[name=next-head-count]');
    if (process.env.NODE_ENV !== 'production') {
      if (!headCountEl) {
        console.error(
          '警告：缺少 next-head-count 元标签。详见：https://err.sh/next.js/next-head-count-missing'
        );
        return;
      }
    }

    const headCount = Number(headCountEl.content);
    const oldTags = [];

    // 收集旧的同类型标签
    for (
      let i = 0, j = headCountEl.previousElementSibling;
      i < headCount;
      i++, j = j.previousElementSibling
    ) {
      if (j.tagName.toLowerCase() === type) {
        oldTags.push(j);
      }
    }

    // 将 React 元素转换为 DOM 元素并过滤重复标签
    const newTags = components.map(reactElementToDOM).filter(newTag => {
      for (let k = 0, len = oldTags.length; k < len; k++) {
        const oldTag = oldTags[k];
        if (oldTag.isEqualNode(newTag)) {
          oldTags.splice(k, 1);
          return false;
        }
      }
      return true;
    });

    // 移除旧标签
    oldTags.forEach(t => t.parentNode.removeChild(t));
    // 添加新标签
    newTags.forEach(t => headEl.insertBefore(t, headCountEl));
    // 更新 head 标签计数
    headCountEl.content = (headCount - oldTags.length + newTags.length).toString();
  }
}

/**
 * 将 React 元素转换为 DOM 元素
 * @param {Object} param - 包含 type 和 props 的 React 元素
 * @returns {HTMLElement} - 对应的 DOM 元素
 */
function reactElementToDOM({ type, props }) {
  const el = document.createElement(type);
  for (const p in props) {
    if (!props.hasOwnProperty(p)) continue;
    if (p === 'children' || p === 'dangerouslySetInnerHTML') continue;

    const attr = DOMAttributeNames[p] || p.toLowerCase();
    el.setAttribute(attr, props[p]);
  }

  const { children, dangerouslySetInnerHTML } = props;
  if (dangerouslySetInnerHTML) {
    el.innerHTML = dangerouslySetInnerHTML.__html || '';
  } else if (children) {
    el.textContent = typeof children === 'string' ? children : children.join('');
  }
  return el;
}



/*
head-manager.js 的用途
在 Next.js 9.1.1 中，client/head-manager.js 是客户端管理 HTML <head> 标签的核心模块，负责动态更新 <head> 中的元素（如 <title>、<meta>、<link> 等）。其主要功能包括：
标题更新：通过 updateTitle 动态设置页面标题。

标签管理：通过 updateElements 添加、更新或移除 <meta>、<base>、<link>、<style> 和 <script> 标签。

去重优化：比较新旧标签（使用 isEqualNode），避免重复插入。

异步更新：使用 updatePromise 确保更新操作按序执行，避免竞态条件。

错误提示：在开发环境中，检查 next-head-count 元标签是否存在，缺失时发出警告。

/**** */