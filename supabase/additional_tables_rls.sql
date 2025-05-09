-- This SQL script adds RLS policies for additional tables
-- Run this in your Supabase SQL editor

-- Policies for pub_area table
ALTER TABLE pub_area ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (select) data
CREATE POLICY "Allow public read access" ON pub_area
  FOR SELECT USING (true);

-- Only allow admins to insert new data
CREATE POLICY "Allow admin insert" ON pub_area
  FOR INSERT WITH CHECK (auth.is_admin());

-- Only allow admins to update data
CREATE POLICY "Allow admin update" ON pub_area
  FOR UPDATE USING (auth.is_admin());

-- Only allow admins to delete data
CREATE POLICY "Allow admin delete" ON pub_area
  FOR DELETE USING (auth.is_admin());

-- Policies for sun_eval_reg table
ALTER TABLE sun_eval_reg ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (select) data
CREATE POLICY "Allow public read access" ON sun_eval_reg
  FOR SELECT USING (true);

-- Only allow admins to insert new data
CREATE POLICY "Allow admin insert" ON sun_eval_reg
  FOR INSERT WITH CHECK (auth.is_admin());

-- Only allow admins to update data
CREATE POLICY "Allow admin update" ON sun_eval_reg
  FOR UPDATE USING (auth.is_admin());

-- Only allow admins to delete data
CREATE POLICY "Allow admin delete" ON sun_eval_reg
  FOR DELETE USING (auth.is_admin());
