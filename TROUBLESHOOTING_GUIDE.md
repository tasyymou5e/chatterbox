# Family Portal Troubleshooting Guide

## Common Issues and Solutions

This guide provides comprehensive troubleshooting information for the Chatterbox platform, including authentication, database, performance, and component-related issues.

**Last Updated**: 2025-09-22  
**Platform**: Chatterbox (59 database tables, 12 Zustand stores)  
**Security Grade**: A- (Excellent with configuration warnings)

### Authentication Issues

#### Issue: "Invalid login credentials" error
**Symptoms**: User receives error message when trying to log in with correct credentials
**Causes**:
- Incorrect email/password combination
- User account not found in database
- Authentication service temporarily unavailable

**Solutions**:
1. Verify email and password are entered correctly
2. Check if user account exists in Supabase Auth panel
3. Reset password using forgot password flow
4. Check Supabase service status

#### Issue: Admin users can't access admin dashboard  
**Symptoms**: User logs in successfully but gets redirected to login when accessing admin routes
**Causes**:
- User doesn't have admin role assigned
- Race condition in admin role checking
- RLS policies blocking role verification

**Solutions**:
1. Verify user has 'admin' role in `user_roles` table
2. Check RLS policies on `user_roles` table
3. Clear browser cache and cookies
4. Check console for JavaScript errors

#### Issue: "Access denied. Admin role required" on analytics
**Symptoms**: Admin users get access denied when viewing analytics dashboard
**Causes**:
- Analytics functions now require explicit admin role verification
- Session expired or invalid

**Solutions**:
1. Refresh the page to renew session
2. Log out and log back in
3. Verify admin role is correctly assigned
4. Check browser network tab for 401/403 errors

### Database Connection Issues

#### Issue: "Failed to fetch" errors on data loading
**Symptoms**: Components show loading state indefinitely or error messages
**Causes**:
- Supabase project is paused or unavailable
- Network connectivity issues
- RLS policies blocking data access

**Solutions**:
1. Check Supabase project status in dashboard
2. Verify internet connection
3. Check browser console for specific error messages
4. Test with different user roles

#### Issue: "Permission denied for table/view"
**Symptoms**: Database queries fail with permission errors
**Causes**:
- Missing RLS policies
- Incorrect RLS policy configuration
- User not authenticated

**Solutions**:
1. Verify user is logged in
2. Check RLS policies are enabled and configured correctly
3. Test with service_role key if debugging
4. Review database logs for specific permission errors

### Family Management Issues

#### Issue: "Infinite recursion detected in policy"
**Symptoms**: Family-related queries fail or timeout
**Status**: ✅ **FIXED** - Security definer functions now prevent recursion

**Historical Solution**:
- Updated RLS policies to use security definer functions
- Created `is_family_creator()` and `is_family_member()` functions

#### Issue: Parents can't see children's data
**Symptoms**: Family members appear but detailed data is not accessible
**Status**: ✅ **FIXED** - Added family member access policies

**Solutions**:
1. Verify family relationships are correctly established
2. Check that parent created the family
3. Ensure child users are added as family members

### Analytics Dashboard Issues

#### Issue: Charts not displaying data
**Symptoms**: Empty charts or "No data available" messages
**Causes**:
- Insufficient data in database
- Analytics functions returning empty results
- Date range issues

**Solutions**:
1. Check if there's sufficient historical data (30+ days)
2. Verify analytics data generation is working
3. Try refreshing analytics data
4. Check browser console for JavaScript errors

#### Issue: Performance issues with analytics loading
**Symptoms**: Slow loading times, browser becoming unresponsive
**Causes**:
- Large dataset queries without proper pagination
- Inefficient database queries
- Memory leaks in React components

**Solutions**:
1. Limit date ranges for analytics queries
2. Implement pagination for large datasets
3. Use React profiler to identify performance bottlenecks
4. Clear browser cache and reload

### Component Rendering Issues

#### Issue: React components not updating after data changes
**Symptoms**: UI shows stale data despite successful API calls
**Causes**:
- Missing dependency in useEffect
- Stale closure in event handlers
- Incorrect state management

**Solutions**:
1. Check useEffect dependencies are complete
2. Use useCallback for event handlers
3. Verify state updates are immutable
4. Use React Developer Tools to inspect component state

#### Issue: "Cannot read property of undefined" errors
**Symptoms**: JavaScript errors breaking component rendering
**Causes**:
- Race conditions between API calls and rendering
- Missing null checks for async data
- Incorrect TypeScript types

**Solutions**:
1. Add proper loading states and null checks
2. Use optional chaining (?.) for nested properties
3. Implement error boundaries for graceful error handling
4. Verify TypeScript types match actual data structure

### Edge Function Issues

#### Issue: Edge functions timing out or returning 500 errors
**Symptoms**: Server errors when calling admin functions
**Causes**:
- Edge function runtime errors
- Database connection issues
- Insufficient permissions

**Solutions**:
1. Check Edge Function logs in Supabase dashboard
2. Verify function has proper error handling
3. Test function with different input parameters
4. Check database connection and permissions

### Development Environment Issues

#### Issue: Local development server not starting
**Symptoms**: Vite dev server fails to start or crashes
**Causes**:
- Port conflicts
- Missing dependencies
- Configuration errors

**Solutions**:
1. Check if port 3000 is already in use
2. Run `npm install` to ensure dependencies are installed
3. Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
4. Check for TypeScript compilation errors

#### Issue: Hot reload not working
**Symptoms**: Changes to code don't reflect in browser automatically
**Causes**:
- File watcher limitations
- Browser caching issues
- Vite configuration problems

**Solutions**:
1. Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
2. Restart development server
3. Check Vite configuration for file watching settings
4. Disable browser cache in developer tools

## Debugging Tools and Techniques

### Browser Developer Tools
1. **Console Tab**: Check for JavaScript errors and console.log output
2. **Network Tab**: Monitor API calls and responses
3. **Application Tab**: Inspect localStorage, sessionStorage, and cookies
4. **Sources Tab**: Set breakpoints and debug JavaScript code

### Supabase Dashboard Tools
1. **SQL Editor**: Test database queries directly
2. **Authentication**: View user accounts and sessions
3. **Logs**: Monitor database and Edge Function logs
4. **API**: Test API endpoints and inspect responses

### React Developer Tools
1. **Components Tab**: Inspect component props and state
2. **Profiler Tab**: Analyze component rendering performance
3. **Hooks inspection**: Debug custom hooks and their values

### Database Debugging
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check user roles
SELECT u.email, ur.role 
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id;

-- Check family relationships
SELECT f.name, f.family_code, p.email as creator_email
FROM public.families f
JOIN auth.users u ON f.created_by = u.id
JOIN public.profiles p ON u.id = p.user_id;
```

### Performance Monitoring
- **React Profiler**: Identify slow components
- **Chrome DevTools Performance Tab**: Analyze runtime performance
- **Supabase Query Performance**: Monitor slow database queries
- **Network Performance**: Check API response times

## Error Code Reference

### Authentication Errors
- `401 Unauthorized`: User not logged in or invalid token
- `403 Forbidden`: User lacks required permissions
- `422 Unprocessable Entity`: Invalid email format or weak password

### Database Errors
- `42501 Insufficient Privilege`: RLS policy blocking access
- `23505 Unique Violation`: Duplicate key constraint violation
- `42P01 Undefined Table`: Table or view doesn't exist

### Network Errors
- `ERR_NETWORK`: Network connectivity issues
- `ERR_CONNECTION_REFUSED`: Server not responding
- `ERR_CERT_AUTHORITY_INVALID`: SSL certificate issues

## Performance Optimization Tips

### Frontend Optimization
1. **Code Splitting**: Use React.lazy for route-level code splitting
2. **Memoization**: Apply React.memo and useMemo for expensive computations
3. **Debouncing**: Debounce search inputs and API calls
4. **Virtualization**: Use virtual scrolling for large lists
5. **Image Optimization**: Compress images and use appropriate formats

### Database Optimization
1. **Indexing**: Add indexes for frequently queried columns
2. **Query Optimization**: Use EXPLAIN ANALYZE to optimize slow queries
3. **Connection Pooling**: Ensure proper connection pool settings
4. **Data Pagination**: Implement pagination for large datasets

### API Optimization
1. **Response Caching**: Cache frequently requested data
2. **Batch Requests**: Combine multiple requests when possible
3. **Compression**: Enable gzip compression for responses
4. **CDN Usage**: Use CDN for static assets

## Security Troubleshooting

### RLS Policy Testing
```sql
-- Test as specific user
SET LOCAL "request.jwt.claim.sub" = '74c46b94-643d-49d5-9dc9-98cfef750859';
SELECT * FROM profiles; -- Should only return user's own profile
```

### Authentication Flow Testing
1. Test login with different user roles
2. Verify token expiration and refresh
3. Check logout clears all session data
4. Test password reset functionality

### Data Access Testing
1. Verify users can only access their own data
2. Test family data access for parent users
3. Confirm admin users can access all data
4. Check that deleted users can't access anything

## Getting Help

### Internal Resources
1. **Code Comments**: Check inline documentation in complex functions
2. **Type Definitions**: Review TypeScript interfaces and types
3. **Git History**: Check commit messages for context on changes
4. **PR Descriptions**: Review pull request descriptions for implementation details

### External Resources
1. **Supabase Documentation**: https://supabase.com/docs
2. **React Documentation**: https://react.dev
3. **Tailwind CSS**: https://tailwindcss.com/docs
4. **TypeScript Handbook**: https://www.typescriptlang.org/docs

### Community Support
1. **Supabase Discord**: Active community support
2. **Stack Overflow**: Search for similar issues
3. **GitHub Issues**: Check repository issues for known problems
4. **Reddit Communities**: r/reactjs, r/webdev for general advice

---

**Last Updated**: 2025-09-22  
**Version**: 2.0  
**Next Review**: 2025-12-22  
**Database Tables**: 59 with comprehensive monitoring  
**Zustand Stores**: 12 with enhanced debugging