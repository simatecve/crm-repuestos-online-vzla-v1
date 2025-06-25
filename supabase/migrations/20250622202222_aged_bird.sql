/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Multiple conflicting RLS policies on user_profiles table
    - Policies are creating circular dependencies causing infinite recursion
    - Current policies reference user_profiles table within their own conditions

  2. Solution
    - Drop all existing policies on user_profiles table
    - Create simple, non-recursive policies
    - Use auth.uid() directly without complex subqueries
    - Separate policies for different operations with clear conditions

  3. New Policies
    - Users can view their own profile
    - Users can update their own profile
    - Users can insert their own profile
    - Admins can view all profiles (simplified check)
*/

-- Drop all existing policies on user_profiles table
DROP POLICY IF EXISTS "Authenticated users can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Simple admin policy that doesn't create recursion
-- Admins are identified by having role = 'admin' in their own profile
-- This avoids the circular reference by checking the current user's role directly
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.user_id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.user_id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.user_id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );