// 导入 React
import React from 'react';
// 导入 PropTypes 用于类型检查
import PropTypes from 'prop-types';
 
 
/**
 * withRouter 高阶组件，用于将路由对象注入到被包装的组件中
 * @param {React.ComponentType} ComposedComponent - 需要包装的组件
 * @returns {React.ComponentClass} - 包装后的组件类
 */
export default function withRouter(ComposedComponent) {
  class WithRouteWrapper extends React.Component {
    // 定义上下文类型
    static contextTypes = {
      router: PropTypes.object,
    };

    /**
     * 渲染包装组件，将路由对象和 props 传递给原始组件
     * @returns {JSX.Element} - 包装后的 JSX 结构
     */
    render() {
      return <ComposedComponent router={this.context.router} {...this.props} />;
    }
  }

  // 继承原始组件的 getInitialProps 方法
  WithRouteWrapper.getInitialProps = ComposedComponent.getInitialProps;
  // 保留原始的 origGetInitialProps，以便在 _app 中检查
  WithRouteWrapper.origGetInitialProps = ComposedComponent.origGetInitialProps;

  // 在开发环境中，设置 displayName 以便调试
  if (process.env.NODE_ENV !== 'production') {
    const name = ComposedComponent.displayName || ComposedComponent.name || 'Unknown';
    WithRouteWrapper.displayName = `withRouter(${name})`;
  }

  return WithRouteWrapper;
}


///=== withRouter 是 Next.js 9.1.1 的常见模式，但在现代版本中，推荐使用 useRouter（适用于函数组件）
// 从 Next.js 10 开始，官方引入了 useRouter 钩子（来自 next/router），为函数组件提供了更简洁的路由访问方式。
// Next.js 13（2022 年）引入了 App Router（app/ 目录结构），完全改变了路由管理方式，useRouter 钩子和新的 API（如 usePathname、useSearchParams）成为首选。
// withRouter 未被明确标记为“废弃”（deprecated），但在官方文档和现代实践中已极少提及，社区也几乎不再使用它，因为：
// 函数组件和 Hooks 已成为 React 的主流，类组件使用减少。
// useRouter 更简单，且与现代 React 生态兼容

/*
示例：使用 withRouter
javascript

// pages/index.jsx
import React from 'react';
import PropTypes from 'prop-types';
import withRouter from 'next/router'; // 假设 with-router.jsx 已集成到 next/router

class Home extends React.Component {
  static contextTypes = {
    router: PropTypes.object,
  };

  handleNavigate = () => {
    this.props.router.push('/about'); // 使用 router.push 进行导航
  };

  render() {
    const { router } = this.props;
    return (
      <div>
        <h1>当前路径：{router.pathname}</h1>
        <button onClick={this.handleNavigate}>跳转到关于页面</button>
      </div>
    );
  }
}

export default withRouter(Home);

/**** */
