-- Add keira to eo's Family
-- This fixes the family membership mismatch where keira was only in Eagle Eye Family

-- Insert new family_members record linking keira to eo's Family
INSERT INTO family_members (
  family_id,
  user_id,
  role,
  joined_at,
  connection_metadata
)
VALUES (
  '8d1de60a-370a-4925-9292-a565875589fc',  -- eo's Family
  '055edded-b71b-4308-b4ff-8d807abff664',  -- keira's user_id
  'child',
  NOW(),
  jsonb_build_object(
    'added_by', 'admin_manual_fix',
    'reason', 'correcting_family_assignment',
    'original_family', '9ee31dca-7614-4e05-88e6-e36dc1ddc37b'
  )
)
ON CONFLICT (family_id, user_id) DO NOTHING;

-- Update the child_accounts record to reference eo's Family as the primary family
UPDATE child_accounts
SET 
  family_id = '8d1de60a-370a-4925-9292-a565875589fc',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'reassigned_at', NOW(),
    'reassigned_from', '9ee31dca-7614-4e05-88e6-e36dc1ddc37b',
    'reassigned_reason', 'correcting_family_assignment'
  )
WHERE user_id = '055edded-b71b-4308-b4ff-8d807abff664';