import express from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

router.post('/start', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { task_id } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO work_sessions (user_id, task_id, start_ts) VALUES ($1,$2, now()) RETURNING *`,
      [userId, task_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

router.patch('/end', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { session_id: id, outcome, rating } = req.body;
  try {
    const r = await pool.query(
      `UPDATE work_sessions SET end_ts = now(), outcome = $1, rating = $2 WHERE id=$3 AND user_id=$4 RETURNING *`,
      [outcome || 'done', rating || null, session_id, userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
