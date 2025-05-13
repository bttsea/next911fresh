import React from 'react';
import ImageCard from '../../components/ImageCard';
import { db } from '../../lib/db';

const PostPage = ({ post }) => {
  console.log('PostPage rendered, post:', post);
  if (!post) {
    return <div>Post not found</div>;
  }
  return (
    <div>
      <h1>Post Details</h1>
      <ImageCard post={post} />
    </div>
  );
};

PostPage.getInitialProps = async ({ req, query }) => {
  console.log('getInitialProps for post called, query:', query, 'isServer:', !!req);
  const id = query.id; // 使用 query.id 而非 params.id
  if (!id) {
    console.warn('No id provided in query');
    return { post: null };
  }
  try {
    const post = await new Promise((resolve) => {
      if (!db) {
        console.warn('Database not available');
        resolve(null);
        return;
      }
      db.findOne({ _id: id }, (err, doc) => {
        if (err) {
          console.error('Error fetching post:', err);
          resolve(null);
        } else {
          console.log('Fetched post:', doc);
          resolve(doc);
        }
      });
    });

    return { post };
  } catch (error) {
    console.error('Error in getInitialProps:', error);
    return { post: null };
  }
};

export default PostPage;