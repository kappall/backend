import express from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

// list tasks (optional query ?due=today)
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { due } = req.query;
  try {
    if (due === 'today') {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate()+1);
      const r = await pool.query(
        `SELECT * FROM tasks WHERE user_id=$1 AND deadline >= $2 AND deadline < $3 ORDER BY priority, deadline`,
        [userId, start.toISOString(), end.toISOString()]
      );
      return res.json(r.rows);
    }
    const r = await pool.query(`SELECT * FROM tasks WHERE user_id=$1 ORDER BY status, priority, deadline`, [userId]);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { title, subject, estimated_minutes, deadline, priority } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO tasks (user_id, title, subject, estimated_minutes, deadline, priority) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, title, subject, estimated_minutes || 30, deadline || null, priority || 3]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { status, completed_at } = req.body;
  try {
    const r = await pool.query(
      `UPDATE tasks SET status = COALESCE($1, status), completed_at = COALESCE($2, completed_at) WHERE id=$3 AND user_id=$4 RETURNING *`,
      [status, completed_at, id, userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
