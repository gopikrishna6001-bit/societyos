import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const totalResidents = (db.prepare('SELECT COUNT(*) as count FROM residents').get() as { count: number }).count;
  const activeResidents = (db.prepare("SELECT COUNT(*) as count FROM residents WHERE status = 'active'").get() as { count: number }).count;
  const pendingMaintenance = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM maintenance WHERE status IN ('pending', 'overdue')").get() as { total: number }).total;
  const openComplaints = (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'open'").get() as { count: number }).count;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthlyCollection = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM maintenance
    WHERE status = 'paid' AND month = ? AND year = ?
  `).get(currentMonth, currentYear) as { total: number }).total;

  res.json({
    totalResidents,
    activeResidents,
    pendingMaintenance,
    openComplaints,
    monthlyCollection,
  });
});

export default router;
