import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { status, year, month } = req.query;
  let query = `
    SELECT m.*, r.name as resident_name, r.flat_number
    FROM maintenance m
    JOIN residents r ON m.resident_id = r.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];
  if (status) { query += ' AND m.status = ?'; params.push(status as string); }
  if (year) { query += ' AND m.year = ?'; params.push(Number(year)); }
  if (month) { query += ' AND m.month = ?'; params.push(Number(month)); }
  query += ' ORDER BY m.year DESC, m.month DESC, r.flat_number';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req: Request, res: Response) => {
  const { resident_id, amount, month, year, status, paid_date } = req.body as {
    resident_id: number; amount: number; month: number; year: number;
    status?: string; paid_date?: string | null;
  };
  if (!resident_id || !amount || !month || !year) {
    res.status(400).json({ error: 'resident_id, amount, month, year are required' });
    return;
  }
  try {
    const result = db.prepare(`
      INSERT INTO maintenance (resident_id, amount, month, year, status, paid_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(resident_id, amount, month, year, status || 'pending', paid_date || null);
    const record = db.prepare(`
      SELECT m.*, r.name as resident_name, r.flat_number
      FROM maintenance m JOIN residents r ON m.resident_id = r.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(record);
  } catch {
    res.status(500).json({ error: 'Failed to create maintenance record' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { resident_id, amount, month, year, status, paid_date } = req.body as {
    resident_id: number; amount: number; month: number; year: number;
    status: string; paid_date?: string | null;
  };
  const existing = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  db.prepare(`
    UPDATE maintenance SET resident_id=?, amount=?, month=?, year=?, status=?, paid_date=?
    WHERE id=?
  `).run(resident_id, amount, month, year, status, paid_date || null, req.params.id);
  const record = db.prepare(`
    SELECT m.*, r.name as resident_name, r.flat_number
    FROM maintenance m JOIN residents r ON m.resident_id = r.id
    WHERE m.id = ?
  `).get(req.params.id);
  res.json(record);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  db.prepare('DELETE FROM maintenance WHERE id = ?').run(req.params.id);
  res.json({ message: 'Record deleted successfully' });
});

export default router;
