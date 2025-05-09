-- This SQL script shows how to set up Supabase to work with Auth0 JWTs
-- Run this in your Supabase SQL editor

-- Step 1: Create a JWT verification function to validate Auth0 tokens
CREATE OR REPLACE FUNCTION auth.verify_auth0_jwt() RETURNS TEXT AS $$
DECLARE
  auth0_domain TEXT := 'pubs-in-the-sun.uk.auth0.com';
  auth0_jwks_uri TEXT := 'https://pubs-in-the-sun.uk.auth0.com/.well-known/jwks.json';
  email TEXT;
BEGIN
  -- Extract email from JWT claims
  email := current_setting('request.jwt.claims', true)::json->>'email';
  RETURN email;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
DECLARE
  admin_emails TEXT[] := ARRAY['andrew@outerlands.co']; -- Same as in your React code
  user_email TEXT;
BEGIN
  -- Get the email from the JWT
  user_email := auth.verify_auth0_jwt();
  
  -- Check if the email is in the admin list
  RETURN user_email = ANY(admin_emails);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example RLS policy for a table (replace 'your_table' with your actual table name)
-- This is just an example, you'll need to create policies for each of your tables

-- Step 3: Enable RLS on your tables
ALTER TABLE pub ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for each operation

-- Allow anyone to read (select) data
CREATE POLICY "Allow public read access" ON pub
  FOR SELECT USING (true);

-- Allow anyone to insert new data (pub submissions)
CREATE POLICY "Allow public insert" ON pub
  FOR INSERT WITH CHECK (true);

-- Only allow admins to update data
CREATE POLICY "Allow admin update" ON pub
  FOR UPDATE USING (auth.is_admin());

-- Only allow admins to delete data
CREATE POLICY "Allow admin delete" ON pub
  FOR DELETE USING (auth.is_admin());

-- Policies for pub_area table
ALTER TABLE pub_area ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (select) data
CREATE POLICY "Allow public read access" ON pub_area
  FOR SELECT USING (true);

-- Allow anyone to insert new data
CREATE POLICY "Allow public insert" ON pub_area
  FOR INSERT WITH CHECK (true);

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

-- Allow anyone to insert new data
CREATE POLICY "Allow public insert" ON sun_eval_reg
  FOR INSERT WITH CHECK (true);

-- Only allow admins to update data
CREATE POLICY "Allow admin update" ON sun_eval_reg
  FOR UPDATE USING (auth.is_admin());

-- Only allow admins to delete data
CREATE POLICY "Allow admin delete" ON sun_eval_reg
  FOR DELETE USING (auth.is_admin());
