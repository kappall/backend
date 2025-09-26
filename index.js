import express from "express";
import cors from 'cors';
import dashboardRouter from './routes/dashboard.js';
import tasksRouter from './routes/tasks.js';
import scheduleRouter from './routes/schedule.js';
import sessionsRouter from './routes/work_session.js';
import authRouter from './routes/auth.js'
import userRouter from './routes/user.js'
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({status: "ok"});
});

app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/tasks', tasksRouter);
app.use('/schedule', scheduleRouter);
app.use('/sessions', sessionsRouter);


app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
});