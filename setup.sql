-- =============================================
-- To-Do App — Supabase Setup
-- Run this in Supabase → SQL Editor
-- =============================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tasks" ON tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Demo accounts
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
)
SELECT
  gen_random_uuid(), 'student@demo.com',
  crypt('Student@123', gen_salt('bf')),
  NOW(), '{"full_name":"Demo Student","role":"student"}'::jsonb,
  NOW(), NOW(), 'authenticated', 'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'student@demo.com'
);
