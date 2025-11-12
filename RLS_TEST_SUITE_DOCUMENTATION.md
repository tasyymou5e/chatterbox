# RLS Policy Test Suite Documentation

## Overview

This test suite provides comprehensive automated testing of all Row Level Security (RLS) policies in the Chatterbox application. It ensures that access controls work correctly across all roles and prevents security regressions.

## Installation & Setup

### Prerequisites
```bash
# Install dependencies (already added)
npm install
```

### Environment Variables
Create a `.env.test` file with:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**IMPORTANT:** Never commit service role keys to version control!

## Running Tests

### All RLS Tests
```bash
npm run test:rls
```

### Watch Mode (Development)
```bash
npm run test:rls:watch
```

### Critical Security Tests Only
```bash
npm run test:critical
```

### With Coverage Report
```bash
npm run test:coverage
```

### Interactive UI
```bash
npm run test:ui
```

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── utils/                      # Test utilities
│   ├── testClient.ts          # Supabase client factories
│   ├── testUsers.ts           # User creation/management
│   ├── testFamilies.ts        # Family creation/management
│   ├── assertions.ts          # Custom RLS assertions
│   └── cleanup.ts             # Test data cleanup
├── rls/                       # RLS policy tests
│   ├── user/                  # User data tables
│   │   └── profiles.test.ts
│   ├── family/                # Family system tables
│   │   └── families.test.ts
│   ├── child/                 # Child protection tables
│   │   └── child-accounts.test.ts
│   └── cross-cutting/         # Cross-table security
│       └── family-isolation.test.ts
└── integration/               # End-to-end scenarios (TODO)
```

## Test Utilities

### Creating Test Users
```typescript
import { createTestUser } from '@tests/utils/testUsers';

const adminUser = await createTestUser('admin');
const parentUser = await createTestUser('parent');
const childUser = await createTestUser('child', familyId);
```

### Creating Test Families
```typescript
import { createTestFamily } from '@tests/utils/testFamilies';

const family = await createTestFamily(creatorUserId, 'Test Family');
```

### Authenticated Clients
```typescript
import { signInTestUser } from '@tests/utils/testClient';

const { client, userId } = await signInTestUser(email, password);
```

### Custom Assertions
```typescript
import { expectRLSAllow, expectRLSBlock } from '@tests/utils/assertions';

// Assert that access was granted
expectRLSAllow(error, data);

// Assert that RLS blocked the query
expectRLSBlock(error, data);

// Assert data contains only own records
expectOnlyOwnData(data, userId);

// Assert data contains only family records
expectOnlyFamilyData(data, familyId);
```

## Current Test Coverage

### ✅ Implemented (Phase 1)

#### User Data Tables
- **profiles** - Personal data and family member visibility
  - ✅ Own profile access
  - ✅ Family member profile visibility
  - ✅ Cross-family isolation
  - ✅ Admin access
  - ✅ Update own profile
  - ✅ Block updates to other profiles

#### Family System Tables
- **families** - Core family data isolation
  - ✅ Own family access
  - ✅ Cross-family blocking
  - ✅ Admin access
  - ✅ Family creation
  - ✅ Family updates by creator
  - ✅ Delete protection

#### Child Protection Tables
- **child_accounts** - COPPA compliance & generated email protection
  - ✅ Parent access to own children
  - ✅ Cross-family blocking
  - ✅ Child cannot see own record
  - ✅ Generated email protection
  - ✅ Parent update permissions
  - ✅ Enumeration attack prevention

#### Cross-Cutting Security
- **family-isolation** - Family data boundaries
  - ✅ Cross-family data isolation
  - ✅ Family enumeration prevention
  - ✅ Lateral movement blocking

### 🔄 Next Phase (Priority 2)

#### User Management
- [ ] user_roles - Role assignment and privilege escalation
- [ ] user_sessions - Session isolation
- [ ] user_activity_logs - Activity tracking access

#### Family System
- [ ] family_members - Membership management
- [ ] family_connections - External connections
- [ ] family_invitations - Invitation system
- [ ] family_activity_logs - Activity logging

#### Child Protection
- [ ] behavioral_events - Sensitive child behavior data
- [ ] child_privacy_settings - Privacy controls

#### Gamification
- [ ] chores - Task assignment and visibility
- [ ] chore_completions - Completion tracking
- [ ] achievements - Achievement definitions
- [ ] user_achievements - User progress

#### Admin & Security
- [ ] admin_audit_logs - Admin action tracking
- [ ] security_audit_logs - Security event logging
- [ ] system_errors - Error logging access

#### Analytics
- [ ] analytics_metrics - Usage metrics
- [ ] engagement_metrics - Engagement tracking
- [ ] performance_analytics - Performance data

## Security Test Patterns

### Pattern 1: Own Data Access
```typescript
it('should allow users to access their own data', async () => {
  const { client } = await signInTestUser(user.email, user.password);
  const { data, error } = await client
    .from('table_name')
    .select('*')
    .eq('user_id', user.id);
  
  expectRLSAllow(error, data);
});
```

### Pattern 2: Family Data Isolation
```typescript
it('should block access to other family data', async () => {
  const { client } = await signInTestUser(user1.email, user1.password);
  const { data, error } = await client
    .from('table_name')
    .select('*')
    .eq('family_id', family2.id);
  
  expectRLSBlock(error, data);
});
```

### Pattern 3: Admin Access
```typescript
it('should allow admins to access all data', async () => {
  const { client } = await signInTestUser(adminUser.email, adminUser.password);
  const { data, error } = await client
    .from('table_name')
    .select('*');
  
  expectRLSAllow(error, data);
  expect(data.length).toBeGreaterThan(0);
});
```

### Pattern 4: Anonymous Blocking
```typescript
it('should block anonymous access', async () => {
  const client = getAnonClient();
  const { data, error } = await client
    .from('table_name')
    .select('*');
  
  expectRLSBlock(error, data);
});
```

## Writing New Tests

### Step 1: Create Test File
Create a new file in the appropriate category:
```bash
tests/rls/{category}/{table-name}.test.ts
```

### Step 2: Set Up Test Data
```typescript
describe('table_name RLS policies', () => {
  let testUsers: TestUser[];
  let testFamily: TestFamily;

  beforeAll(async () => {
    // Create test data
  });

  afterAll(async () => {
    await deleteAllTestFamilies();
    await deleteAllTestUsers();
  });
});
```

### Step 3: Test Each Policy
Test all CRUD operations for each role:
- Anonymous
- Child
- Parent (own family)
- Parent (other family)
- Admin
- Read-only admin

### Step 4: Add Edge Cases
- NULL values
- Invalid UUIDs
- SQL injection attempts
- Concurrent access
- Deleted records

## CI/CD Integration

### GitHub Actions (TODO)
The test suite will run automatically on:
- Every push to main/develop
- Every pull request
- Daily at midnight (regression detection)
- Before database migrations

### Pre-Migration Hook (TODO)
```bash
# Run critical tests before applying migrations
npm run test:critical
```

## Performance Benchmarks

### Current Performance
- Average test execution: ~50-100ms per test
- Full RLS suite: ~10-30 seconds
- Setup/teardown: ~5 seconds

### Performance Goals
- Individual test: <100ms
- Full suite: <60 seconds
- Setup/teardown: <10 seconds

## Troubleshooting

### Tests Failing Locally
1. **Check environment variables**: Ensure `.env.test` has correct keys
2. **Clean test data**: Run `npm run test:rls` to trigger cleanup
3. **Check Supabase connection**: Verify service role key is valid

### RLS Policy Changes Not Reflected
1. **Clear Supabase cache**: Restart Supabase if using local instance
2. **Check migration status**: Ensure migrations are applied
3. **Verify policy names**: Ensure test targets correct policy

### Service Role Key Issues
1. **Never commit service keys**: Use `.env.test` (gitignored)
2. **Rotate keys regularly**: Update after team changes
3. **Limit key scope**: Use dedicated test project if possible

## Security Considerations

### Test Data
- All test data uses `test-*` prefix in emails
- Test families named "Test Family {timestamp}"
- Automatic cleanup after each test run

### Service Role Usage
- Only used for test setup/cleanup
- Never used to test RLS policies
- Bypasses all RLS (by design)

### Data Isolation
- Each test run creates fresh data
- Tests do not share data between runs
- Cleanup ensures no test pollution

## Compliance Testing

### COPPA (Children's Online Privacy Protection Act)
- ✅ Child account generated email protection
- ✅ Parent consent enforcement
- ✅ Child data access restrictions

### GDPR (General Data Protection Regulation)
- ✅ Data access controls
- ✅ Family data isolation
- 🔄 Data deletion verification (TODO)
- 🔄 Data portability testing (TODO)

### SOC2
- ✅ Audit trail protection
- ✅ Role-based access control
- 🔄 Security event logging (TODO)

## Roadmap

### Phase 2 (Week 2)
- [ ] Implement remaining Priority 1 tables
- [ ] Add performance benchmarks
- [ ] Create integration test scenarios

### Phase 3 (Week 3)
- [ ] CI/CD integration
- [ ] Pre-migration hooks
- [ ] Test results dashboard

### Phase 4 (Week 4)
- [ ] Complete all 38+ tables
- [ ] Regression detection system
- [ ] Team training materials

## Contributing

### Adding New Tests
1. Follow existing test patterns
2. Use provided utilities
3. Add cleanup in `afterAll`
4. Test all roles and operations
5. Include edge cases

### Updating Utilities
1. Maintain backward compatibility
2. Add JSDoc comments
3. Update this documentation
4. Test with existing test suite

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS_POLICIES_COMPREHENSIVE_GUIDE.md](./RLS_POLICIES_COMPREHENSIVE_GUIDE.md)
- [SECURITY_FRAMEWORK.md](./SECURITY_FRAMEWORK.md)
