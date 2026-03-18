import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const residents = db.prepare('SELECT * FROM residents ORDER BY flat_number').all();
  res.json(residents);
});

router.get('/:id', (req: Request, res: Response) => {
  const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id);
  if (!resident) {
    res.status(404).json({ error: 'Resident not found' });
    return;
  }
  res.json(resident);
});

router.post('/', (req: Request, res: Response) => {
  const { flat_number, name, email, phone, move_in_date, status } = req.body as {
    flat_number: string; name: string; email: string; phone: string;
    move_in_date: string; status?: string;
  };
  if (!flat_number || !name || !email || !phone || !move_in_date) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  try {
    const result = db.prepare(`
      INSERT INTO residents (flat_number, name, email, phone, move_in_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(flat_number, name, email, phone, move_in_date, status || 'active');
    const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(resident);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Flat number already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create resident' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { flat_number, name, email, phone, move_in_date, status } = req.body as {
    flat_number: string; name: string; email: string; phone: string;
    move_in_date: string; status: string;
  };
  const existing = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Resident not found' });
    return;
  }
  try {
    db.prepare(`
      UPDATE residents SET flat_number=?, name=?, email=?, phone=?, move_in_date=?, status=?
      WHERE id=?
    `).run(flat_number, name, email, phone, move_in_date, status, req.params.id);
    const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id);
    res.json(resident);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Flat number already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update resident' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Resident not found' });
    return;
  }
  db.prepare('DELETE FROM residents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Resident deleted successfully' });
});

export default router;
