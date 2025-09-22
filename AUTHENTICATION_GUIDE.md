# Authentication Troubleshooting Guide
**Enhanced Authentication System with Error Diagnostics - 2025-09-22**

---

## 🔐 AUTHENTICATION ARCHITECTURE OVERVIEW

The Chatterbox application uses a centralized Zustand-based authentication system with enhanced error diagnostics and comprehensive activity logging.

**Current Security Grade**: A- (Excellent with 4 configuration warnings)  
**Database Coverage**: 59 tables with comprehensive authentication security

### **Current Authentication Stack**
- **Frontend**: Zustand authStore with bridge adapter compatibility
- **Backend**: Supabase Auth with enhanced error logging
- **Security**: RLS policies with security definer functions
- **Logging**: authLoggingService with device info and metadata

---

## 🚨 COMMON AUTHENTICATION ISSUES & SOLUTIONS

### **Issue 1: "Invalid login credentials" Error**

**Symptoms:**
- User enters correct email/password but receives "Invalid login credentials"
- Login worked previously but now fails
- Admin can see user exists in Supabase dashboard

**Possible Causes & Solutions:**

#### **🔴 HIGH PRIORITY: Leaked Password Protection**
- **Problem**: Supabase Auth "Leaked Password Protection" is ENABLED
- **Location**: Supabase Dashboard → Authentication → Settings → Security
- **Impact**: Blocks logins with passwords that appear in data breaches
- **Solution**: 
  ```
  1. Go to Supabase Dashboard
  2. Navigate to Authentication → Settings → Security
  3. Disable "Leaked Password Protection" 
  4. Test login again
  ```

#### **Email Confirmation Status**
```sql
-- Check user email confirmation status
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'user@example.com';
```

#### **Account Lock Status**
```sql
-- Check if account is locked or disabled
SELECT 
  id, 
  email,
  banned_until,
  confirmation_sent_at,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'user@example.com';
```

### **Issue 2: Missing Profile Data**

**Symptoms:**
- User can authenticate but profile data is missing
- Dashboard shows loading state indefinitely
- Profile queries return null

**Diagnostic Steps:**
```sql
-- Check if profile exists for authenticated user
SELECT * FROM profiles WHERE user_id = '<user_id>';

-- Check user roles
SELECT * FROM user_roles WHERE user_id = '<user_id>';
```

**Solution - Automated Profile Creation:**
The system now includes automated profile creation via the `create_missing_profile()` function:

```sql
-- Manual profile creation if needed
SELECT create_missing_profile('<user_id>', '<email>', '<first_name>', '<last_name>', 'parent');
```

### **Issue 3: Role Assignment Problems**

**Symptoms:**
- User authenticates but gets "access denied" errors
- Navigation redirects to wrong portal
- Admin functions not available for admin users

**Diagnostic Steps:**
```sql
-- Check user roles
SELECT ur.*, p.email, p.first_name, p.last_name
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.user_id
WHERE p.email = 'user@example.com';

-- Test role checking function
SELECT has_role('<user_id>', 'admin'::app_role);
```

---

## 🔧 ENHANCED ERROR DIAGNOSTICS (2025-08-29)

### **Authentication Store Error Logging**

The enhanced authStore provides detailed error diagnostics:

```typescript
// Enhanced error logging in authStore.signIn()
if (error.message?.includes('Invalid login credentials')) {
  console.error('🔐 AuthStore: Invalid credentials - possible causes:');
  console.error('  • Password incorrect for user:', email);
  console.error('  • ⚠️  LEAKED PASSWORD PROTECTION may be blocking login');
  console.error('  • Account locked or email not confirmed');
  console.error('💡 Check Supabase Auth settings');
}
```

### **Activity Logging Service**

All authentication events are logged with comprehensive metadata:

```typescript
// Successful login logging
authLoggingService.logActivity(
  data.user.id,
  'login',
  true,
  undefined,
  {
    email: data.user.email,
    role: userRole,
    timestamp: new Date().toISOString(),
    loginMethod: 'email_password',
    provider: data.user.app_metadata?.provider || 'email'
  }
);

// Failed login logging
authLoggingService.logActivity(
  email,
  'failed_login',
  false,
  error.message,
  {
    errorCode: error.status,
    errorName: error.name,
    timestamp: new Date().toISOString(),
    attemptMethod: 'email_password'
  }
);
```

---

## 🧪 TESTING AUTHENTICATION

### **Manual Testing Checklist**

#### **Basic Authentication Flow**
- [ ] Sign up new user with email/password
- [ ] Check email confirmation (if enabled)
- [ ] Sign in with correct credentials
- [ ] Verify profile creation
- [ ] Check role assignment
- [ ] Test password reset flow

#### **Admin Authentication**
- [ ] Admin sign in at `/admin/login`
- [ ] Verify admin role checking
- [ ] Test admin-specific functions
- [ ] Check admin activity logging

#### **Error Scenarios**
- [ ] Invalid password attempt
- [ ] Non-existent email attempt
- [ ] Missing profile handling
- [ ] Missing role assignment
- [ ] Network error handling

### **Database Verification Queries**

```sql
-- Comprehensive user verification
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.last_sign_in_at,
  p.first_name,
  p.last_name,
  string_agg(ur.role::text, ', ') as roles
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_roles ur ON au.id = ur.user_id
WHERE au.email = 'user@example.com'
GROUP BY au.id, au.email, au.email_confirmed_at, au.last_sign_in_at, p.first_name, p.last_name;

-- Recent activity logs
SELECT 
  ual.*,
  p.email,
  p.first_name || ' ' || p.last_name as full_name
FROM user_activity_logs ual
LEFT JOIN profiles p ON ual.user_id::uuid = p.user_id
ORDER BY ual.timestamp DESC
LIMIT 20;
```

---

## 🚑 EMERGENCY PROCEDURES

### **Account Recovery Process**

1. **Admin Dashboard Access**: Use `/admin/login` with admin credentials
2. **User Lookup**: Find user in Admin → Users section
3. **Password Reset**: Use admin password reset functionality
4. **Profile Recreation**: If needed, manually create profile via admin tools
5. **Role Assignment**: Verify and assign appropriate roles

### **System-Wide Authentication Issues**

1. **Check Supabase Status**: Verify Supabase service status
2. **Database Connectivity**: Test database connections
3. **Edge Function Status**: Verify edge functions are operational
4. **Rate Limiting**: Check if rate limits are blocking requests

### **Emergency Access**

If all admin accounts are locked:
1. Use Supabase Dashboard direct database access
2. Create new admin user via SQL:
```sql
-- Emergency admin creation (use Supabase Dashboard SQL editor)
INSERT INTO user_roles (user_id, role) 
VALUES ('<user_id>', 'admin');
```

---

## 📊 MONITORING & METRICS

### **Authentication Health Indicators**
- Login success rate: Target >98%
- Average login time: Target <2 seconds
- Failed login attempts: Monitor for patterns
- Profile creation success: Target 100%

### **Key Metrics to Monitor**
- Daily active users
- Authentication error rate
- Profile creation failures
- Role assignment errors
- Session duration metrics

---

## 🔗 QUICK REFERENCE LINKS

### **Supabase Dashboard Links**
- Auth Users: `https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/auth/users`
- Auth Settings: `https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/auth/providers`
- SQL Editor: `https://supabase.com/dashboard/project/lxuqfgbukrrickanmmic/sql/new`

### **Admin Panel Links**
- Admin Login: `/admin/login`
- User Management: `/admin/users`
- System Monitoring: `/admin/system-monitoring`
- Debug Panel: `/admin/debug`

---

**Documentation Version**: 2.0  
**Last Updated**: 2025-09-22  
**Next Review**: 2025-12-22  
**Security Grade**: A- (Excellent)  
**Maintained By**: Development Team