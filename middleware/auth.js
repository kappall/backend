import jwt from "jsonwebtoken";
import { pool } from '../db.js';
import { decrypt } from "dotenv";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    const {rows} = await pool.query(
      "SELECT 1 FROM USERS WHERE id=$1",
      [decoded.id]
    );
    if (rows.length===0)
      return res.status(401).json({error: "No user with this id"});
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token", details: err });
  }
}
