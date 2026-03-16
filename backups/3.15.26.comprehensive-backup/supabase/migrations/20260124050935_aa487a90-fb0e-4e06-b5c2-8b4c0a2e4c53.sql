-- Clean up orphaned test child user: keira.meo7777777@proton.me
-- This user has 'child' role but no family membership or child_account record

-- Remove from user_roles
DELETE FROM user_roles 
WHERE user_id = 'e1c95de7-c7ee-4473-815e-025ddff3e9ac';

-- Remove from profiles
DELETE FROM profiles 
WHERE user_id = 'e1c95de7-c7ee-4473-815e-025ddff3e9ac';