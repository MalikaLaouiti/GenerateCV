-- createdb cv && psql cv -f schema.sql
CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS cv (
  user_id    integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
