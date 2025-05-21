// 导入 React
import React from 'react';
// 导入 Next.js 的 Head 组件，用于设置页面头部
import Head from '../next-server/lib/head';
 

// 定义 HTTP 状态码与错误信息的映射
const statusCodes = {
  400: 'Bad Request',
  404: 'This page could not be found',
  405: 'Method Not Allowed',
  500: 'Internal Server Error',
};

/**
 * Error 组件用于处理页面错误
 */
export default class Error extends React.Component {
  // 设置组件的 displayName，便于调试
  static displayName = 'ErrorPage';

  /**
   * 获取初始 props，用于确定错误状态码
   * @param {Object} param0 - 包含 res 和 err 的上下文对象
   * @returns {Object|Promise<Object>} - 返回包含状态码的 props
   */
  static getInitialProps({ res, err }) {
    // 从 res 或 err 中获取状态码，默认为 404
    const statusCode = res && res.statusCode ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
  }

  /**
   * 渲染错误页面
   * @returns {JSX.Element} - 错误页面的 JSX 结构
   */
  render() {
    const { statusCode, title } = this.props;
    // 确定页面标题：优先使用 props.title，其次使用 statusCodes 映射，最后使用默认错误信息
    const errorTitle =
      title || statusCodes[statusCode] || 'An unexpected error has occurred';

    return (
      <div style={styles.error}>
        <Head>
          <title>
            {statusCode}: {errorTitle}
          </title>
        </Head>
        <div>
          {/* 设置全局样式，移除 body 的 margin */}
          <style dangerouslySetInnerHTML={{ __html: 'body { margin: 0 }' }} />
          {/* 显示状态码（如果存在） */}
          {statusCode ? <h1 style={styles.h1}>{statusCode}</h1> : null}
          <div style={styles.desc}>
            {/* 显示错误标题 */}
            <h2 style={styles.h2}>{errorTitle}.</h2>
          </div>
        </div>
      </div>
    );
  }
}

// 定义错误页面的样式
const styles = {
  error: {
    color: '#000',
    background: '#fff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", "Fira Sans", Avenir, "Helvetica Neue", "Lucida Grande", sans-serif',
    height: '100vh',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  desc: {
    display: 'inline-block',
    textAlign: 'left',
    lineHeight: '49px',
    height: '49px',
    verticalAlign: 'middle',
  },

  h1: {
    display: 'inline-block',
    borderRight: '1px solid rgba(0, 0, 0,.3)',
    margin: 0,
    marginRight: '20px',
    padding: '10px 23px 10px 0',
    fontSize: '24px',
    fontWeight: 500,
    verticalAlign: 'top',
  },

  h2: {
    fontSize: '14px',
    fontWeight: 'normal',
    lineHeight: 'inherit',
    margin: 0,
    padding: 0,
  },
};