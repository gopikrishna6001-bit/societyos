import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { status, category } = req.query;
  let query = `
    SELECT c.*, r.name as resident_name, r.flat_number
    FROM complaints c
    JOIN residents r ON c.resident_id = r.id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (status) { query += ' AND c.status = ?'; params.push(status as string); }
  if (category) { query += ' AND c.category = ?'; params.push(category as string); }
  query += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req: Request, res: Response) => {
  const { resident_id, title, description, category, status } = req.body as {
    resident_id: number; title: string; description: string;
    category?: string; status?: string;
  };
  if (!resident_id || !title || !description) {
    res.status(400).json({ error: 'resident_id, title, description are required' });
    return;
  }
  const result = db.prepare(`
    INSERT INTO complaints (resident_id, title, description, category, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(resident_id, title, description, category || 'other', status || 'open');
  const record = db.prepare(`
    SELECT c.*, r.name as resident_name, r.flat_number
    FROM complaints c JOIN residents r ON c.resident_id = r.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(record);
});

router.put('/:id', (req: Request, res: Response) => {
  const { resident_id, title, description, category, status } = req.body as {
    resident_id: number; title: string; description: string;
    category: string; status: string;
  };
  const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Complaint not found' });
    return;
  }
  db.prepare(`
    UPDATE complaints SET resident_id=?, title=?, description=?, category=?, status=? WHERE id=?
  `).run(resident_id, title, description, category, status, req.params.id);
  const record = db.prepare(`
    SELECT c.*, r.name as resident_name, r.flat_number
    FROM complaints c JOIN residents r ON c.resident_id = r.id
    WHERE c.id = ?
  `).get(req.params.id);
  res.json(record);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Complaint not found' });
    return;
  }
  db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
  res.json({ message: 'Complaint deleted successfully' });
});

export default router;
