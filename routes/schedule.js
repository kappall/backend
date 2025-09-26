import express from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

/**
 * GET /schedule/today
 * returns list of items: { time, title, type, location, duration }
 */
router.get('/today', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate()+1);

    const events = await pool.query(
      `SELECT title, start_ts, end_ts, location FROM events WHERE user_id=$1 AND start_ts >= $2 AND start_ts < $3 ORDER BY start_ts`,
      [userId, start.toISOString(), end.toISOString()]
    );

    const items = events.rows.map(ev => ({
      time: new Date(ev.start_ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      title: ev.title,
      type: 'class',
      location: ev.location || '',
      duration: `${Math.round((new Date(ev.end_ts)-new Date(ev.start_ts))/60000)}m`,
    }));

    // add top-priority task suggested now (naive: earliest deadline task)
    const tasks = await pool.query(
      `SELECT id, title, subject, estimated_minutes, deadline FROM tasks WHERE user_id=$1 AND status != 'done' ORDER BY deadline NULLS LAST LIMIT 3`,
      [userId]
    );
    
    for (const t of tasks.rows) {
      items.push({
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        title: `${t.title}`,
        type: 'task',
        location: t.subject || '',
        duration: `${t.estimated_minutes}m`
      });
    }

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

/**
 * GET /schedule/free
 * Returns available free time slots for the day (simple greedy gaps between events)
 */
router.get('/free', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate()+1);
    const eventsRes = await pool.query(
      `SELECT start_ts, end_ts FROM events WHERE user_id=$1 AND start_ts >= $2 AND start_ts < $3 ORDER BY start_ts`,
      [userId, start.toISOString(), end.toISOString()]
    );

    let windowStart = new Date(start); windowStart.setHours(8,0,0,0);
    let windowEnd = new Date(start); windowEnd.setHours(22,0,0,0);
    const slots = [];
    let cursor = windowStart;

    for (const ev of eventsRes.rows) {
      const s = new Date(ev.start_ts);
      const e = new Date(ev.end_ts);
      if (s > cursor) {
        const duration = Math.round((s - cursor) / 60000);
        if (duration >= 15) {
          slots.push({
            start: cursor.toISOString(),
            end: s.toISOString(),
            duration_minutes: duration,
            recommended: null
          });
        }
      }
      if (e > cursor) cursor = e;
    }
    if (cursor < windowEnd) {
      const duration = Math.round((windowEnd - cursor) / 60000);
      if (duration >= 15) slots.push({
        start: cursor.toISOString(),
        end: windowEnd.toISOString(),
        duration_minutes: duration,
        recommended: null
      });
    }

    // simple recommendation: map top pending task to first slot
    const taskRes = await pool.query(`SELECT id, title FROM tasks WHERE user_id=$1 AND status != 'done' ORDER BY priority, deadline LIMIT 1`, [userId]);
    if (taskRes.rows[0] && slots.length) {
      slots[0].recommended = taskRes.rows[0].title;
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
