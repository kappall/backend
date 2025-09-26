import express from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

/**
 * GET /dashboard/summary
 * returns:
 *  { tasksDueToday: int, tasksCompletedToday: int, freeTimeMinutes: int, studyStreakDays: int }
 */
router.get('/summary', authMiddleware, async (req, res) => {
  
  const userId = req.user.id;
  try {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const tasksRes = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status != 'done') AS due_count,
              COUNT(*) FILTER (WHERE status = 'done' AND completed_at >= $1 AND completed_at < $2) AS completed_today
       FROM tasks WHERE user_id = $3 AND deadline >= $1 AND deadline < $2`,
      [todayStart.toISOString(), todayEnd.toISOString(), userId]
    );

    const { due_count, completed_today } = tasksRes.rows[0];

    // free time estimation: naive - sum gaps between events today
    const eventsRes = await pool.query(
      `SELECT start_ts, end_ts FROM events WHERE user_id = $1 AND start_ts >= $2 AND start_ts < $3 ORDER BY start_ts`,
      [userId, todayStart.toISOString(), todayEnd.toISOString()]
    );

    let freeMinutes = 0;
    // assume day window from 08:00 to 22:00
    let windowStart = new Date(todayStart);
    windowStart.setHours(8, 0, 0, 0);
    let windowEnd = new Date(todayStart);
    windowEnd.setHours(22, 0, 0, 0);

    let cursor = windowStart;
    for (const ev of eventsRes.rows) {
      const s = new Date(ev.start_ts);
      const e = new Date(ev.end_ts);
      if (s > cursor) {
        freeMinutes += Math.max(0, (s - cursor) / 60000);
      }
      if (e > cursor) cursor = e;
    }
    if (cursor < windowEnd) freeMinutes += Math.max(0, (windowEnd - cursor) / 60000);

    // study streak (simple: consecutive days with at least one session)
    const streakRes = await pool.query(
      `SELECT date_trunc('day', start_ts) as day
       FROM work_sessions
       WHERE user_id = $1
       GROUP BY day
       ORDER BY day DESC
       LIMIT 30`,
      [userId]
    );

    const days = streakRes.rows.map(r => new Date(r.day).toISOString().slice(0,10));
    let streak = 0;
    const todayKey = new Date().toISOString().slice(0,10);
    let curDay = new Date();
    for (;;) {
      const key = curDay.toISOString().slice(0,10);
      if (days.includes(key)) {
        streak++;
        curDay.setDate(curDay.getDate() -1);
      } else break;
    }

    res.json({
      tasksDueToday: parseInt(due_count,10),
      tasksCompletedToday: parseInt(completed_today,10),
      freeTimeMinutes: Math.round(freeMinutes),
      studyStreakDays: streak
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
