

## Create Test Family with 2 Kids

I'll create a test family directly in Supabase with 1 parent and 2 children, all using password `notmypassword22` and random emails.

### Accounts to Create

| Role | Name | Email (random) |
|------|------|----------------|
| Parent | Test Parent | `testparent-{random}@testfamily.com` |
| Child 1 | Test Kid One | `testkid1-{random}@testfamily.com` |
| Child 2 | Test Kid Two | `testkid2-{random}@testfamily.com` |

### Steps

1. **Create 3 auth users** via Supabase admin API with password `notmypassword22` and `email_confirm: true`
2. **Create profiles** for each user
3. **Assign roles** in `user_roles` table (parent, child, child)
4. **Create family** record with `is_test_family` metadata
5. **Add family_members** entries linking all 3 users
6. **Create child_accounts** records for the 2 children
7. **Validate** by querying the created data back
8. **Provide login credentials** summary

### Implementation

This will be done by invoking the `create-test-family` edge function (which already handles all the above steps including auth user creation, role assignment, family_members, and child_accounts). The function requires admin auth, so I'll call it via the supabase curl tool with the appropriate payload.

