import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/time-entries/active?employee_id= — get active entry for employee
router.get('/active', (req: Request, res: Response) => {
  const { employee_id } = req.query as { employee_id?: string };

  if (!employee_id) {
    res.status(400).json({ error: 'employee_id query parameter is required' });
    return;
  }

  try {
    const entry = db.prepare(`
      SELECT
        te.*,
        e.name AS employee_name
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE te.employee_id = ? AND te.stopped_at IS NULL
      LIMIT 1
    `).get(employee_id) ?? null;

    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active entry' });
  }
});

// GET /api/time-entries?employee_id=&from=&to= — list entries with filters
router.get('/', (req: Request, res: Response) => {
  const { employee_id, from, to } = req.query as {
    employee_id?: string;
    from?: string;
    to?: string;
  };

  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (employee_id) {
      conditions.push('te.employee_id = ?');
      params.push(employee_id);
    }

    if (from) {
      conditions.push("te.started_at >= ?");
      params.push(from);
    }

    if (to) {
      conditions.push("te.started_at <= ?");
      params.push(`${to}T23:59:59`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const entries = db.prepare(`
      SELECT
        te.*,
        e.name AS employee_name
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      ${where}
      ORDER BY te.started_at DESC
    `).all(...params);

    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(te.duration_seconds), 0) AS total_seconds
      FROM time_entries te
      ${where}
    `).get(...params) as { total_seconds: number };

    res.json({
      entries,
      total_seconds: totalRow.total_seconds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// POST /api/time-entries/start — start a timer
router.post('/start', (req: Request, res: Response) => {
  const { employee_id, task_description } = req.body as {
    employee_id?: number;
    task_description?: string;
  };

  if (!employee_id || !task_description) {
    res.status(400).json({ error: 'employee_id and task_description are required' });
    return;
  }

  try {
    // Check employee exists
    const employee = db.prepare(`SELECT id FROM employees WHERE id = ?`).get(employee_id);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Check for existing active entry
    const active = db.prepare(`
      SELECT id FROM time_entries
      WHERE employee_id = ? AND stopped_at IS NULL
    `).get(employee_id);

    if (active) {
      res.status(409).json({ error: 'Employee already has an active timer. Stop it first.' });
      return;
    }

    const started_at = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO time_entries (employee_id, task_description, started_at)
      VALUES (?, ?, ?)
    `).run(employee_id, task_description.trim(), started_at);

    const entry = db.prepare(`
      SELECT te.*, e.name AS employee_name
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE te.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

// POST /api/time-entries/:id/stop — stop a timer
router.post('/:id/stop', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const entry = db.prepare(`SELECT * FROM time_entries WHERE id = ?`).get(id) as
      | { id: number; stopped_at: string | null }
      | undefined;

    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }

    if (entry.stopped_at !== null) {
      res.status(409).json({ error: 'Timer is already stopped' });
      return;
    }

    const stopped_at = new Date().toISOString();

    db.prepare(`
      UPDATE time_entries
      SET
        stopped_at = ?,
        duration_seconds = CAST(ROUND((julianday(?) - julianday(started_at)) * 86400) AS INTEGER)
      WHERE id = ?
    `).run(stopped_at, stopped_at, id);

    const updated = db.prepare(`
      SELECT te.*, e.name AS employee_name
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE te.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

// DELETE /api/time-entries/:id — delete entry
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const entry = db.prepare(`SELECT id FROM time_entries WHERE id = ?`).get(id);
    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }

    db.prepare(`DELETE FROM time_entries WHERE id = ?`).run(id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

export default router;
