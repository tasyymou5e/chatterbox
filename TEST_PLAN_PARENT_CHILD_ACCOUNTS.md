# Parent/Child Account Creation Test Plan

## Overview

This document outlines comprehensive test scenarios for verifying parent and child account creation workflows in the application. It covers both the admin-facing test family creation feature and the parent-facing child account creation.

## Prerequisites

- Admin account with valid credentials
- Access to Supabase dashboard for verification
- Edge function logs access at: https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/functions

## Quick Reference

| Edge Function | Purpose | Logs URL |
|---------------|---------|----------|
| `create-test-family` | Admin creates test families | [View Logs](https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/functions/create-test-family/logs) |
| `create-child-account` | Parent creates child accounts | [View Logs](https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/functions/create-child-account/logs) |
| `cleanup-test-families` | Removes test data | [View Logs](https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/functions/cleanup-test-families/logs) |

---

## Test Scenarios

### Scenario 1: Create Test Family via Admin Dashboard

**Steps:**
1. Log in as admin at `/admin/login`
2. Navigate to `/admin/families`
3. Click "Create Test Family" button
4. Fill in the form:
   - Family Display Name: "Test Family [timestamp]"
   - Parent 1: First Name, Last Name, Email
   - (Optional) Parent 2: First Name, Last Name, Email
   - Add 1-2 children with names
5. Click "Create Family"

**Expected Results:**
- Success dialog appears with family code and temporary password
- All members listed with their credentials

**Verification Checklist:**
- [ ] Family appears in `families` table with `is_test_family: true` in metadata
- [ ] Parent auth users created in Supabase Auth
- [ ] Child auth users created in Supabase Auth
- [ ] `family_members` records exist for all members
- [ ] `child_accounts` records exist for all children
- [ ] `user_roles` assigned correctly (parent/child)
- [ ] `profiles` created for all members

---

### Scenario 2: Create Test Family with Duplicate Email Handling

**Steps:**
1. Create a test family with a specific email (e.g., `test@example.com`)
2. Try to create another test family with the same email
3. Ensure "Force Unique Emails" is enabled

**Expected Results:**
- System auto-generates unique email suffix
- Both families created successfully
- Original email stored in `user_metadata.original_email`

**Verification:**
- [ ] Second user has modified email (e.g., `test.1234567890.abc1@example.com`)
- [ ] Check `auth.users` for `raw_user_meta_data.original_email`

---

### Scenario 3: Create Child Account via Parent Dashboard

**Steps:**
1. Log in as a parent user
2. Navigate to parent dashboard
3. Click "Add Child" or "Create Child Account"
4. Enter child's first name, last name, and password
5. Submit the form

**Expected Results:**
- Child account created successfully
- Credentials displayed to parent
- Child appears in family members list

**Verification Checklist:**
- [ ] Child auth user created in Supabase Auth
- [ ] `child_accounts` record created with correct `family_code`
- [ ] `family_members` record created with `role: 'child'`
- [ ] `profiles` record created
- [ ] `user_roles` has `role: 'child'`

---

### Scenario 4: Cleanup Test Data

**Steps:**
1. Navigate to `/admin/families`
2. Click "Clean Up Test Data" button (if available)
3. Or: Create a test family with "Clean up existing test data first" checked

**Expected Results:**
- All test families (with `is_test_family: true` metadata) removed
- Associated auth users deleted
- Confirmation of cleanup count

**Verification:**
- [ ] No families with `is_test_family: true` in database
- [ ] Associated users removed from Supabase Auth
- [ ] Related `family_members` records cascade deleted
- [ ] Related `child_accounts` records cascade deleted

---

### Scenario 5: Error Handling - Invalid Password

**Steps:**
1. Create a test family with custom password
2. Use a weak password (e.g., "123")

**Expected Results:**
- Validation error displayed
- No family created

**Verification:**
- [ ] Edge function logs show password validation failure
- [ ] No partial records created in database

---

### Scenario 6: Edge Function Timeout/Error Recovery

**Steps:**
1. Create a test family with many children (e.g., 5+)
2. If timeout occurs, check logs

**Expected Results:**
- Partial success handled gracefully
- 207 Multi-Status returned if some members created
- Error details included in response

**Verification:**
- [ ] Logs show which members succeeded/failed
- [ ] UI displays partial success message
- [ ] Successfully created members are usable

---

## Database Verification Queries

Run these in the [SQL Editor](https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/sql/new):

### Check Recently Created Families
```sql
SELECT 
  id,
  display_name,
  family_code,
  metadata->>'is_test_family' as is_test,
  created_at
FROM families 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Family Members for a Family
```sql
SELECT 
  fm.id,
  fm.role,
  fm.created_at,
  p.first_name,
  p.last_name,
  p.email
FROM family_members fm 
JOIN profiles p ON fm.user_id = p.user_id 
WHERE fm.family_id = '<family_id>'
ORDER BY fm.role, fm.created_at;
```

### Check Child Accounts for a Family
```sql
SELECT 
  id,
  first_name,
  last_name,
  generated_email,
  family_code,
  status,
  created_at,
  metadata
FROM child_accounts 
WHERE family_id = '<family_id>'
ORDER BY created_at DESC;
```

### Check User Roles for Family Members
```sql
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at,
  p.first_name,
  p.last_name,
  p.email
FROM user_roles ur 
JOIN profiles p ON ur.user_id = p.user_id 
WHERE ur.user_id IN (
  SELECT user_id 
  FROM family_members 
  WHERE family_id = '<family_id>'
)
ORDER BY ur.role;
```

### Find All Test Families
```sql
SELECT 
  id,
  display_name,
  family_code,
  created_at
FROM families 
WHERE metadata->>'is_test_family' = 'true'
ORDER BY created_at DESC;
```

### Check for Orphaned Records
```sql
-- Child accounts without family_members entry
SELECT ca.* 
FROM child_accounts ca
LEFT JOIN family_members fm ON ca.user_id = fm.user_id
WHERE fm.id IS NULL;

-- Family members without profiles
SELECT fm.* 
FROM family_members fm
LEFT JOIN profiles p ON fm.user_id = p.user_id
WHERE p.user_id IS NULL;
```

---

## Edge Function Log Analysis

### Log Format
Logs follow this format:
```
[REQUEST_ID] [ELAPSED_MS] [PHASE] message {optional_data}
```

### Key Phases to Check
| Phase | Description |
|-------|-------------|
| `INIT` | Request parsing and environment validation |
| `CLEANUP` | Test data cleanup (if enabled) |
| `FAMILY_CODE` | Family code generation |
| `FAMILY_CREATE` | Family record creation |
| `MEMBER_PREP` | Family members list preparation |
| `PASSWORD` | Password generation/validation |
| `EMAIL` | Unique email generation |
| `AUTH_CREATE` | Auth user creation |
| `ROLE_ASSIGN` | Role assignment (parent/child) |
| `FAMILY_MEMBER` | Adding to family_members table |
| `CHILD_ACCOUNT` | Creating child_accounts record |
| `COMPLETE` | Final summary |
| `FATAL` | Unhandled errors |

### Troubleshooting Common Issues

**Issue: "failed to create child account"**
- Check `CHILD_ACCOUNT` phase in logs
- Verify `family_code` is not null
- Check `child_accounts` table constraints

**Issue: "Auth creation failed"**
- Check `AUTH_CREATE` phase for specific error
- Common causes: duplicate email, weak password
- Verify Supabase Auth settings

**Issue: Partial family creation**
- Look for 207 status code
- Check which members succeeded/failed
- Review individual member error messages

---

## Known Issues and Workarounds

### Issue: family_code NULL constraint violation
**Symptom:** "failed to create child account" error
**Cause:** `family_code` was being set to null in `child_accounts` insert
**Fix:** Ensure `family_code` is populated from the family record
**Status:** Fixed in create-child-account edge function

### Issue: Duplicate email conflicts
**Workaround:** Enable "Force Unique Emails" option
**Behavior:** System appends timestamp and random suffix to email

### Issue: Edge function timeout
**Workaround:** Reduce number of children per family
**Note:** Function continues processing; partial results may be returned

---

## Post-Test Cleanup

After testing, clean up test data:

1. **Via Admin UI:**
   - Navigate to `/admin/families`
   - Click "Clean Up Test Data"

2. **Via SQL:**
```sql
-- WARNING: This deletes all test families!
-- Run cleanup_test_families function
SELECT * FROM cleanup_test_families();
```

3. **Manual Auth User Cleanup:**
   - Go to [Auth Users](https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/auth/users)
   - Filter by test emails
   - Delete manually if needed

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-01 | 1.0 | Initial test plan created |
| 2026-01-01 | 1.1 | Added child_accounts integration, enhanced logging phases |
