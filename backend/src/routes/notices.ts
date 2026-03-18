import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(db.prepare('SELECT * FROM notices ORDER BY created_at DESC').all());
});

router.post('/', (req: Request, res: Response) => {
  const { title, content, category, created_by } = req.body as {
    title: string; content: string; category?: string; created_by?: string;
  };
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }
  const result = db.prepare(`
    INSERT INTO notices (title, content, category, created_by)
    VALUES (?, ?, ?, ?)
  `).run(title, content, category || 'general', created_by || 'Admin');
  res.status(201).json(db.prepare('SELECT * FROM notices WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, content, category, created_by } = req.body as {
    title: string; content: string; category: string; created_by: string;
  };
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Notice not found' });
    return;
  }
  db.prepare(`
    UPDATE notices SET title=?, content=?, category=?, created_by=? WHERE id=?
  `).run(title, content, category, created_by, req.params.id);
  res.json(db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Notice not found' });
    return;
  }
  db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  res.json({ message: 'Notice deleted successfully' });
});

export default router;
