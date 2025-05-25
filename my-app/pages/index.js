import React, { useState } from 'react';
import Link from 'next/link';
import ImageCard from '../components/ImageCard';
import { db, initializeData } from '../lib/db';


const IndexPage = ({ posts = [], error = null }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('提交表单，标题:', title, '内容:', content);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      console.log('响应状态:', res.status);
      if (res.ok) {
        alert('帖子创建成功');
        window.location.reload(); // 刷新页面以显示新帖子
      } else {
        const errText = await res.text();
        console.error('创建帖子失败:', errText);
        alert('创建帖子失败: ' + errText);
      }
    } catch (error) {
      console.error('网络请求失败:', error.message);
      alert('网络请求失败: ' + error.message);
    }
  };

  const handleNavigate = (postId) => {
    if (postId) {
      window.location.href = `/posts/${postId}`;
    }
  };

  return (
    <div>
      <h1>Next.js with NeDB Demo</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          required
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="内容"
          required
        />
        <button type="submit">创建帖子</button>
      </form>

      {error && (
        <p style={{ color: 'red' }}>加载帖子失败: {error}</p>
      )}

      {posts.length > 0 ? (
        posts
          .filter((post) => post._id)
          .map((post) => {
            const postId = post._id.toString();



            return (




              // <button
              //   key={postId}
              //   onClick={() => handleNavigate(postId)}
              //   style={{
              //     display: 'block',
              //     padding: 0,
              //     margin: '1rem 0',
              //     border: 'none',
              //     background: 'none',
              //     textAlign: 'left',
              //     cursor: 'pointer'
              //   }}
              // >
              //   <ImageCard post={post} />
              // </button>


          <Link key={postId} href={`/posts/${postId}`}>
            <a>
              <ImageCard post={post} />
            </a>
          </Link>











            );
          })
      ) : (
        <p>暂无帖子。</p>
      )}
    </div>
  );
};

// 获取初始数据，支持服务器端和客户端渲染
// 添加详细日志，确保帖子加载可追踪
IndexPage.getInitialProps = async ({ req }) => {
  console.log('执行 getInitialProps, isServer:', !!req);
  try {
    await initializeData();
    console.log('数据库初始化完成');

    const posts = await new Promise((resolve, reject) => {
      if (!db) {
        console.warn('数据库不可用');
        resolve([]);
        return;
      }
      // 简化查询，移除排序以避免字段不匹配
      db.find({}, (err, docs) => {
        if (err) {
          console.error('获取帖子失败:', err);
          reject(err);
        } else {
          console.log('原始帖子数据:', docs);
          resolve(docs || []);
        }
      });
    });

    // 验证帖子数据，转换为字符串 _id
    const validPosts = posts.map((post) => ({
      ...post,
      _id: post._id ? post._id.toString() : null,
    })).filter((post) => post._id);
    console.log('有效帖子:', validPosts);

    if (validPosts.length === 0 && posts.length > 0) {
      console.warn('所有帖子被过滤，可能存在 _id 格式问题');
    }

    return {
      posts: validPosts,
      error: validPosts.length === 0 && posts.length > 0 ? '无有效帖子，可能 _id 格式不正确' : null,
    };
  } catch (error) {
    console.error('getInitialProps 错误:', error.message);
    return {
      posts: [],
      error: `加载帖子失败: ${error.message}`,
    };
  }
};

export default IndexPage;