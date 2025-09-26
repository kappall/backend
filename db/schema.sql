drop table schedules; 
drop table work_sessions; 
drop table events; 
drop table tasks;
drop table users;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TExt NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'Europe/Rome',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  deadline TIMESTAMP,
  priority SMALLINT DEFAULT 3, -- 1 high, 2 med, 3 low
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP NOT NULL,
  location TEXT,
  source TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP,
  outcome TEXT,
  rating SMALLINT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  generated_at TIMESTAMP DEFAULT now(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_deadline ON tasks(user_id, deadline);
CREATE INDEX IF NOT EXISTS idx_events_user_start ON events(user_id, start_ts);
