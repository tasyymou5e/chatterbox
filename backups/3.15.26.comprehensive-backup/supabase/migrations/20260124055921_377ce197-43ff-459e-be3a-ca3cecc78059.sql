-- Fix missing profiles for affected users
-- Insert missing profile for child user (keira.eo@wccgroup.net)
INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ca.user_id,
  ca.first_name,
  ca.last_name,
  NOW(),
  NOW()
FROM child_accounts ca
WHERE ca.user_id = '055edded-b71b-4308-b4ff-8d807abff664'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = ca.user_id);

-- Insert missing profile for parent user (eo@wccgroup.net)
INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  au.id,
  COALESCE(au.raw_user_meta_data->>'first_name', SPLIT_PART(au.email, '@', 1)) as first_name,
  au.raw_user_meta_data->>'last_name',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id = '90c54b29-3831-43e0-8e83-66d7bd259ebd'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = au.id);

-- Also repair any other missing profiles system-wide for child accounts
INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ca.user_id,
  ca.first_name,
  COALESCE(ca.last_name, ''),
  NOW(),
  NOW()
FROM child_accounts ca
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = ca.user_id);

-- Repair any other missing profiles for parents/users from auth.users
INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'first_name',
    SPLIT_PART(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = au.id);