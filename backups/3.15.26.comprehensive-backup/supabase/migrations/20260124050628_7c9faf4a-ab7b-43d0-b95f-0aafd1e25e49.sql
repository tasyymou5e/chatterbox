-- Remove keira's orphaned membership from The Eagle Eye Family
-- Cleanup action to fix data inconsistency where keira was in two families

DELETE FROM family_members
WHERE user_id = '055edded-b71b-4308-b4ff-8d807abff664'
  AND family_id = '9ee31dca-7614-4e05-88e6-e36dc1ddc37b';