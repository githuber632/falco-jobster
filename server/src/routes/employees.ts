import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/employees — list all employees with total_seconds
router.get('/', (_req: Request, res: Response) => {
  try {
    const employees = db.prepare(`
      SELECT
        e.id,
        e.name,
        e.position,
        e.created_at,
        COALESCE(SUM(te.duration_seconds), 0) AS total_seconds
      FROM employees e
      LEFT JOIN time_entries te ON te.employee_id = e.id
      GROUP BY e.id
      ORDER BY e.name ASC
    `).all();

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST /api/employees — create employee
router.post('/', (req: Request, res: Response) => {
  const { name, position } = req.body as { name?: string; position?: string };

  if (!name || !position) {
    res.status(400).json({ error: 'name and position are required' });
    return;
  }

  try {
    const stmt = db.prepare(
      `INSERT INTO employees (name, position) VALUES (?, ?)`
    );
    const result = stmt.run(name.trim(), position.trim());
    const employee = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json(employee);
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: `Employee "${name}" already exists` });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
});

// DELETE /api/employees/:id — delete employee
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const employee = db.prepare(`SELECT id FROM employees WHERE id = ?`).get(id);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    db.prepare(`DELETE FROM employees WHERE id = ?`).run(id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;
