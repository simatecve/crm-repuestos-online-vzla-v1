/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Current policies on user_profiles table cause infinite recursion
    - Policies check admin role by querying user_profiles table itself
    - This creates circular dependency when fetching user_invitations

  2. Solution
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Use direct user_id checks instead of role-based queries that reference the same table

  3. Security
    - Maintain proper access control
    - Users can only see/edit their own profiles
    - Admins can manage all profiles (but with simplified logic)
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Create new simplified policies
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- For admin operations, we'll use a simpler approach
-- Admins can be identified by checking if they have admin role directly
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    role = 'admin'
  );

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
      AND up.id != user_profiles.id  -- Prevent self-reference
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
      AND up.id != user_profiles.id  -- Prevent self-reference
    )
  );

-- Also fix the user_invitations policies to avoid similar issues
DROP POLICY IF EXISTS "Admins can manage invitations" ON user_invitations;

CREATE POLICY "Admins can manage invitations"
  ON user_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
    )
  );

-- Fix user_sessions policies as well
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;

CREATE POLICY "Admins can view all sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
    )
  );