import express from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

// list tasks (optional query ?due=today)
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {rows} = await pool.query(
    "SELECT id, email, display_name, timezone FROM USERS WHERE id=$1",
    [userId]
  );
  if (rows.length===0)
    return res.status(400).json({error: "No user with this id"});

  res.json(rows[0]);
});

export default router;