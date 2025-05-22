// 导入事件源包装器，用于处理 Webpack HMR 事件
import { getEventSourceWrapper } from './error-overlay/eventsource';

/**
 * 初始化构建监视器，显示 Next.js 构建状态
 * 在开发环境中显示一个图标，指示构建进行中或完成
 */
export default function initializeBuildWatcher() {
  // 创建影子 DOM 宿主元素
  const shadowHost = document.createElement('div');
  shadowHost.id = '__next-build-watcher';
  // 设置固定定位和高 zIndex，确保显示在页面顶部
  shadowHost.style.position = 'fixed';
  shadowHost.style.bottom = '10px';
  shadowHost.style.right = '20px';
  shadowHost.style.width = 0;
  shadowHost.style.height = 0;
  shadowHost.style.zIndex = 99999;
  document.body.appendChild(shadowHost);

  let shadowRoot;
  let prefix = '';

  // 检查浏览器是否支持 Shadow DOM
  if (shadowHost.attachShadow) {
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  } else {
    // 如果不支持 Shadow DOM，使用宿主元素并添加前缀避免命名冲突
    shadowRoot = shadowHost;
    prefix = '__next-build-watcher-';
  }

  // 创建容器元素
  const container = createContainer(prefix);
  shadowRoot.appendChild(container);

  // 创建 CSS 样式
  const css = createCss(prefix);
  shadowRoot.appendChild(css);

  // 状态管理
  let isVisible = false; // 容器是否可见
  let isBuilding = false; // 是否正在构建
  let timeoutId = null; // 延迟隐藏的定时器 ID

  // 初始化事件源，监听 Webpack HMR 事件
  const evtSource = getEventSourceWrapper({ path: '/_next/webpack-hmr' });
  evtSource.addMessageListener(event => {
    // 忽略心跳事件
    if (event.data === '\uD83D\uDC93') {
      return;
    }

    try {
      handleMessage(event);
    } catch {}
  });

  /**
   * 处理 HMR 事件消息
   * @param {Object} event - 事件对象
   */
  function handleMessage(event) {
    const obj = JSON.parse(event.data);

    switch (obj.action) {
      case 'building':
        // 正在构建：显示容器并更新状态
        timeoutId && clearTimeout(timeoutId);
        isVisible = true;
        isBuilding = true;
        updateContainer();
        break;
      case 'built':
        // 构建完成：更新状态并延迟隐藏容器
        isBuilding = false;
        timeoutId = setTimeout(() => {
          isVisible = false;
          updateContainer();
        }, 100);
        updateContainer();
        break;
    }
  }

  /**
   * 更新容器元素的类名，控制显示和动画
   */
  function updateContainer() {
    if (isBuilding) {
      container.classList.add(`${prefix}building`);
    } else {
      container.classList.remove(`${prefix}building`);
    }

    if (isVisible) {
      container.classList.add(`${prefix}visible`);
    } else {
      container.classList.remove(`${prefix}visible`);
    }
  }
}

/**
 * 创建容器元素，包含构建状态图标
 * @param {string} prefix - 元素 ID 前缀
 * @returns {HTMLElement} - 容器元素
 */
function createContainer(prefix) {
  const container = document.createElement('div');
  container.id = `${prefix}container`;
  container.innerHTML = `
    <div id="${prefix}icon-wrapper">
      <svg viewBox="0 0 226 200">
        <defs>
          <linearGradient
            x1="114.720775%"
            y1="181.283245%"
            x2="39.5399306%"
            y2="100%"
            id="${prefix}linear-gradient"
          >
            <stop stop-color="#FFFFFF" offset="0%" />
            <stop stop-color="#000000" offset="100%" />
          </linearGradient>
        </defs>
        <g id="${prefix}icon-group" fill="none" stroke="url(#${prefix}linear-gradient)" stroke-width="18">
          <path d="M113,5.08219117 L4.28393801,197.5 L221.716062,197.5 L113,5.08219117 Z" />
        </g>
      </svg>
    </div>
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
      bottom: 10px;
      right: 30px;

      background: #fff;
      color: #000;
      font: initial;
      cursor: initial;
      letter-spacing: initial;
      text-shadow: initial;
      text-transform: initial;
      visibility: initial;

      padding: 8px 10px;
      align-items: center;
      box-shadow: 0 11px 40px 0 rgba(0, 0, 0, 0.25), 0 2px 10px 0 rgba(0, 0, 0, 0.12);

      display: none;
      opacity: 0;
      transition: opacity 0.1s ease, bottom 0.1s ease;
      animation: ${prefix}fade-in 0.1s ease-in-out;
    }

    #${prefix}container.${prefix}visible {
      display: flex;
    }

    #${prefix}container.${prefix}building {
      bottom: 20px;
      opacity: 1;
    }

    #${prefix}icon-wrapper {
      width: 16px;
      height: 16px;
    }

    #${prefix}icon-wrapper > svg {
      width: 100%;
      height: 100%;
    }

    #${prefix}icon-group {
      animation: ${prefix}strokedash 1s ease-in-out both infinite;
    }

    @keyframes ${prefix}fade-in {
      from {
        bottom: 10px;
        opacity: 0;
      }
      to {
        bottom: 20px;
        opacity: 1;
      }
    }

    @keyframes ${prefix}strokedash {
      0% {
        stroke-dasharray: 0 226;
      }
      80%,
      100% {
        stroke-dasharray: 659 226;
      }
    }
  `;

  return css;
}
/*
dev-build-watcher.js 的用途
在 Next.js 9.1.1 中，client/dev-build-watcher.js 是一个开发环境的辅助模块，用于在浏览器中显示构建状态的视觉指示器。它的主要功能包括：
构建状态指示：
在页面右下角显示一个三角形图标，当 Next.js 正在构建（例如，代码修改触发 Webpack 重新编译）时，图标可见并带有动画效果。

构建完成后，图标淡出隐藏。


/***** */