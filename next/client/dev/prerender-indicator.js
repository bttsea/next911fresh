// 导入 Next.js 路由器模块
import Router from '../router';

/**
 * 初始化预渲染指示器，显示页面是否为预渲染状态
 * 在开发环境中显示一个图标和文本，指示页面是否通过静态优化生成
 */
export default function initializeBuildWatcher() {
  // 创建影子 DOM 宿主元素
  const shadowHost = document.createElement('div');
  shadowHost.id = '__next-prerender-indicator';
  // 设置固定定位和高 zIndex，确保显示在页面顶部
  shadowHost.style.position = 'fixed';
  shadowHost.style.bottom = '20px';
  shadowHost.style.right = '10px';
  shadowHost.style.width = 0;
  shadowHost.style.height = 0;
  shadowHost.style.zIndex = 99998;
  shadowHost.style.transition = 'all 100ms ease';
  document.body.appendChild(shadowHost);

  let shadowRoot;
  let prefix = '';

  // 检查浏览器是否支持 Shadow DOM
  if (shadowHost.attachShadow) {
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  } else {
    // 如果不支持 Shadow DOM，使用宿主元素并添加前缀避免命名冲突
    shadowRoot = shadowHost;
    prefix = '__next-prerender-indicator-';
  }

  // 创建容器元素
  const container = createContainer(prefix);
  shadowRoot.appendChild(container);

  // 创建 CSS 样式
  const css = createCss(prefix);
  shadowRoot.appendChild(css);

  // 获取容器中的交互元素
  const expandEl = container.querySelector('a');
  const closeEl = container.querySelector(`#${prefix}close`);

  // 状态管理
  const dismissKey = '__NEXT_DISMISS_PRERENDER_INDICATOR';
  const dismissUntil = parseInt(window.localStorage.getItem(dismissKey), 10);
  const dismissed = dismissUntil > new Date().getTime();
  let isVisible = !dismissed && window.__NEXT_DATA__.nextExport;

  /**
   * 更新容器元素的类名，控制显示状态
   */
  function updateContainer() {
    if (isVisible) {
      container.classList.add(`${prefix}visible`);
    } else {
      container.classList.remove(`${prefix}visible`);
    }
  }

  const expandedClass = `${prefix}expanded`;
  let toggleTimeout;

  /**
   * 切换展开状态
   * @param {boolean} expand - 是否展开
   */
  const toggleExpand = (expand = true) => {
    clearTimeout(toggleTimeout);
    toggleTimeout = setTimeout(() => {
      if (expand) {
        expandEl.classList.add(expandedClass);
        closeEl.style.display = 'flex';
      } else {
        expandEl.classList.remove(expandedClass);
        closeEl.style.display = 'none';
      }
    }, 50);
  };

  // 添加关闭按钮事件监听
  closeEl.addEventListener('click', () => {
    const oneHourAway = new Date().getTime() + 1 * 60 * 60 * 1000;
    window.localStorage.setItem(dismissKey, oneHourAway + '');
    isVisible = false;
    updateContainer();
  });
  closeEl.addEventListener('mouseenter', () => toggleExpand());
  closeEl.addEventListener('mouseleave', () => toggleExpand(false));
  expandEl.addEventListener('mouseenter', () => toggleExpand());
  expandEl.addEventListener('mouseleave', () => toggleExpand(false));

  // 监听路由变化，更新预渲染状态
  Router.events.on('routeChangeComplete', () => {
    isVisible = window.next.isPrerendered;
    updateContainer();
  });

  // 初始更新容器状态
  updateContainer();
}

/**
 * 创建容器元素，包含预渲染指示器图标和关闭按钮
 * @param {string} prefix - 元素 ID 前缀
 * @returns {HTMLElement} - 容器元素
 */
function createContainer(prefix) {
  const container = document.createElement('div');
  container.id = `${prefix}container`;
  container.innerHTML = `
    <button id="${prefix}close" title="Hide indicator for session">
      <span>×</span>
    </button>
    <a href="https://nextjs.org/docs#automatic-static-optimization-indicator" target="_blank">
      <div id="${prefix}icon-wrapper">
          <svg width="15" height="20" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M36 3L30.74 41H8L36 3Z" fill="black"/>
          <path d="M25 77L30.26 39H53L25 77Z" fill="black"/>
          <path d="M13.5 33.5L53 39L47.5 46.5L7 41.25L13.5 33.5Z" fill="black"/>
          </svg>
          Prerendered Page
      </div>
    </a>
  `;
  return container;
}

/**
 * 创建 CSS 样式，定义容器和图标的动画效果
 * @param {string} prefix - 样式 ID 前缀
 * @returns {HTMLStyleElement} - 样式元素
 */
function createCss(prefix) {
  const css = document.createElement('style');
  css.textContent = `
    #${prefix}container {
      position: absolute;
      display: none;
      bottom: 10px;
      right: 15px;
    }

    #${prefix}close {
      top: -10px;
      right: -10px;
      border: none;
      width: 18px;
      height: 18px;
      color: #333333;
      font-size: 16px;
      cursor: pointer;
      display: none;
      position: absolute;
      background: #ffffff;
      border-radius: 100%;
      align-items: center;
      flex-direction: column;
      justify-content: center;
    }

    #${prefix}container a {
      color: inherit;
      text-decoration: none;
      width: 15px;
      height: 23px;
      overflow: hidden;

      border-radius: 3px;
      background: #fff;
      color: #000;
      font: initial;
      cursor: pointer;
      letter-spacing: initial;
      text-shadow: initial;
      text-transform: initial;
      visibility: initial;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

      padding: 4px 2px;
      align-items: center;
      box-shadow: 0 11px 40px 0 rgba(0, 0, 0, 0.25), 0 2px 10px 0 rgba(0, 0, 0, 0.12);

      display: flex;
      transition: opacity 0.1s ease, bottom 0.1s ease, width 0.3s ease;
      animation: ${prefix}fade-in 0.1s ease-in-out;
    }

    #${prefix}icon-wrapper {
      width: 140px;
      height: 20px;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      position: relative;
    }

    #${prefix}icon-wrapper svg {
      flex-shrink: 0;
      margin-right: 3px;
    }

    #${prefix}container a.${prefix}expanded {
      width: 135px;
    }

    #${prefix}container.${prefix}visible {
      display: flex;
      bottom: 10px;
      opacity: 1;
    }

    @keyframes ${prefix}fade-in {
      from {
        bottom: 0px;
        opacity: 0;
      }
      to {
        bottom: 10px;
        opacity: 1;
      }
    }
  `;

  return css;
}


/*
prerender-indicator.js 的用途
在 Next.js 9.1.1 中，client/prerender-indicator.js 是一个开发环境的辅助模块，用于在浏览器中显示页面是否为预渲染（prerendered）的视觉指示器。它的主要功能包括：
预渲染状态指示：
在页面右下角显示一个图标和文本（“Prerendered Page”），当页面通过静态优化（next export）生成时可见。

当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
当页面通过静态优化（next export）生成时可见
是的，如果你的 Next.js 9.1.1 项目决定不使用 next export（即不生成静态优化的站点），
那么 prerender-indicator.js 提供的预渲染指示器功能（在页面右下角显示“Prerendered Page”图标和文本）通常是不必要的
通常是不必要的
通常是不必要的
通常是不必要的
通常是不必要的






提供链接到 Next.js 文档（https://nextjs.org/docs#automatic-static-optimization-indicator）。

交互功能：
鼠标悬停时展开，显示完整文本。


/**** */