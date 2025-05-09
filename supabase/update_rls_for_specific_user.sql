-- This SQL script updates RLS policies to allow a specific user to update/delete items
-- and restricts read access to only public users
-- Run this in your Supabase SQL editor

-- Create a function to check if the user is the specific authorized user
CREATE OR REPLACE FUNCTION auth.is_authorized_user() RETURNS BOOLEAN AS $$
DECLARE
  authorized_user_id UUID := 'b7914936-cd8e-4a07-a1a1-0a2f4ef38bf0'::UUID;
BEGIN
  -- Check if the current user matches the authorized user ID
  RETURN auth.uid() = authorized_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies for pub table
ALTER TABLE pub ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON pub;
DROP POLICY IF EXISTS "Allow public insert" ON pub;
DROP POLICY IF EXISTS "Allow admin update" ON pub;
DROP POLICY IF EXISTS "Allow admin delete" ON pub;

-- Create new policies
-- Allow only public users to read data (not authenticated users)
CREATE POLICY "Allow public read access" ON pub
  FOR SELECT USING (auth.role() = 'anon');

-- Allow public users to insert new data (pub submissions)
CREATE POLICY "Allow public insert" ON pub
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Allow specific user to update data
CREATE POLICY "Allow authorized user update" ON pub
  FOR UPDATE USING (auth.is_authorized_user());

-- Allow specific user to delete data
CREATE POLICY "Allow authorized user delete" ON pub
  FOR DELETE USING (auth.is_authorized_user());

-- Update policies for pub_area table
ALTER TABLE pub_area ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON pub_area;
DROP POLICY IF EXISTS "Allow admin insert" ON pub_area;
DROP POLICY IF EXISTS "Allow admin update" ON pub_area;
DROP POLICY IF EXISTS "Allow admin delete" ON pub_area;

-- Create new policies
-- Allow only public users to read data
CREATE POLICY "Allow public read access" ON pub_area
  FOR SELECT USING (auth.role() = 'anon');

-- Allow specific user to insert new data
CREATE POLICY "Allow authorized user insert" ON pub_area
  FOR INSERT WITH CHECK (auth.is_authorized_user());

-- Allow specific user to update data
CREATE POLICY "Allow authorized user update" ON pub_area
  FOR UPDATE USING (auth.is_authorized_user());

-- Allow specific user to delete data
CREATE POLICY "Allow authorized user delete" ON pub_area
  FOR DELETE USING (auth.is_authorized_user());

-- Update policies for sun_eval_reg table
ALTER TABLE sun_eval_reg ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON sun_eval_reg;
DROP POLICY IF EXISTS "Allow admin insert" ON sun_eval_reg;
DROP POLICY IF EXISTS "Allow admin update" ON sun_eval_reg;
DROP POLICY IF EXISTS "Allow admin delete" ON sun_eval_reg;

-- Create new policies
-- Allow only public users to read data
CREATE POLICY "Allow public read access" ON sun_eval_reg
  FOR SELECT USING (auth.role() = 'anon');

-- Allow specific user to insert new data
CREATE POLICY "Allow authorized user insert" ON sun_eval_reg
  FOR INSERT WITH CHECK (auth.is_authorized_user());

-- Allow specific user to update data
CREATE POLICY "Allow authorized user update" ON sun_eval_reg
  FOR UPDATE USING (auth.is_authorized_user());

-- Allow specific user to delete data
CREATE POLICY "Allow authorized user delete" ON sun_eval_reg
  FOR DELETE USING (auth.is_authorized_user());
