import { db } from '../../lib/db';

console.log('[posts.js] API route loaded');

export default function handler(req, res) {
   console.log('[posts.js] API /api/posts called, method:', req.method, 'body:', req.body);
   //// res.status(200).json({ message: 'Test response' });// ❌ 错误：这里又发一次响应（比如 res.end() 或 res.json()）



   if (req.method === 'GET') {
      db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
         if (err) {
            console.error('Error fetching posts:', err);
            res.status(500).json({ error: 'Database error' });
         } else {
            res.status(200).json(docs);
         }
      });
   } else if (req.method === 'POST') {
      console.log('>>> /api/posts POST received');
      console.log('API /api/posts -------------------------------POST', req.method, 'body:', req.body);


      const { title, content } = req.body;
      if (!title || !content) {
         res.status(400).json({ error: 'Title and content are required' });
         return;
      }
      db.insert({ title, content, createdAt: new Date() }, (err, doc) => {
         if (err) {
            console.error('Error creating post:', err);
            res.status(500).json({ error: 'Database error' });
         } else {
            res.status(201).json(doc);
         }
      });
   } else {
      res.status(405).json({ message: 'Method not allowed' });
   }
}