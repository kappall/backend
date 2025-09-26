import express from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

router.post("/signup", async (req, res) => {
  const { email, display_name, timezone, password} = req.body;
  console.log(req.body);
  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users (email, password_hash, display_name, timezone) VALUES ($1,$2,$3,$4) RETURNING id,email",
    [email, hash,display_name,timezone]
  );

  res.json({ user: result.rows[0] });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );
  if (rows.length === 0) return res.status(401).json({ error: "Invalid login" });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Invalid login" });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

export default router;