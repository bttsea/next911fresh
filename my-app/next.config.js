module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = 'source-map';
    }
 
    // 在客户端打包时忽略 fs 模块
    if (!isServer) {
      config.node = {
        fs: 'empty',
        path: 'empty',
      };
    }
    return config;
  },
};



/*
确保构建目标是 server
在你的 next.config.js 中明确设置：
 module.exports = {
  // Next.js 12 起默认已是 server 模式，可以省略，但你可以手动声明
  target: 'server',
}
如果你在使用的是 Next.js 12 或之后版本，可以干脆不写 target，因为 Serverless 模式已经被弃用了（取而代之的是更清晰的 middleware/edge-function 架构）。
/**** */