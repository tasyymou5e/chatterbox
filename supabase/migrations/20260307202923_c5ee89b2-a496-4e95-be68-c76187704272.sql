
-- ============================================================
-- DATA CLEANUP: Remove 6 duplicate/junk users and 4 orphaned families
-- ============================================================

-- 1. Delete user_roles for the 6 users
DELETE FROM public.user_roles 
WHERE user_id IN (
  '0ca85bbc-aee1-4ea1-97cc-73157dae7e62',
  'b89b6868-d3ba-4af1-a105-365e438c20b0',
  '8f5bccd4-8a5a-4887-a60e-876d0004f0d9',
  '28aca84b-f9a1-4abb-b277-1d43e2eaf388',
  'e1c95de7-c7ee-4473-815e-025ddff3e9ac',
  '4da38cde-4699-45cd-984a-077407b2a423'
);

-- 2. Delete family_members for the 4 orphaned families
DELETE FROM public.family_members 
WHERE family_id IN (
  'a8b7226c-7f27-4f21-b961-48eb2be3ad54',
  '9ee31dca-7614-4e05-88e6-e36dc1ddc37b',
  'a9d8e8b2-e37b-499f-8150-73dcb40b13aa',
  'ba023c72-9ee8-489b-87ff-2b941fdac00d'
);

-- 3. Delete child_accounts for the 4 orphaned families
DELETE FROM public.child_accounts 
WHERE family_id IN (
  'a8b7226c-7f27-4f21-b961-48eb2be3ad54',
  '9ee31dca-7614-4e05-88e6-e36dc1ddc37b',
  'a9d8e8b2-e37b-499f-8150-73dcb40b13aa',
  'ba023c72-9ee8-489b-87ff-2b941fdac00d'
);

-- 4. Delete the 4 orphaned families
DELETE FROM public.families 
WHERE id IN (
  'a8b7226c-7f27-4f21-b961-48eb2be3ad54',
  '9ee31dca-7614-4e05-88e6-e36dc1ddc37b',
  'a9d8e8b2-e37b-499f-8150-73dcb40b13aa',
  'ba023c72-9ee8-489b-87ff-2b941fdac00d'
);

-- 5. Delete profiles for the 6 users
DELETE FROM public.profiles 
WHERE user_id IN (
  '0ca85bbc-aee1-4ea1-97cc-73157dae7e62',
  'b89b6868-d3ba-4af1-a105-365e438c20b0',
  '8f5bccd4-8a5a-4887-a60e-876d0004f0d9',
  '28aca84b-f9a1-4abb-b277-1d43e2eaf388',
  'e1c95de7-c7ee-4473-815e-025ddff3e9ac',
  '4da38cde-4699-45cd-984a-077407b2a423'
);
