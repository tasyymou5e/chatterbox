/**
 * Utility function to categorize and format authentication error messages.
 */
export const getAuthErrorMessage = (error: unknown): { title: string; description: string } => {
  const message = (error as { message?: string })?.message || '';
  
  if (message.includes('Invalid login credentials') || message.includes('Invalid credentials')) {
    return {
      title: 'Access Denied',
      description: 'Invalid email or password. Please check your credentials and try again.'
    };
  }
  
  if (message.includes('Too many requests') || message.includes('rate limit')) {
    return {
      title: 'Rate Limited',
      description: 'Too many login attempts. Please wait a moment and try again.'
    };
  }
  
  if (message.includes('Network') || message.includes('fetch')) {
    return {
      title: 'Connection Error',
      description: 'Network error. Please check your internet connection and try again.'
    };
  }
  
  if (message.includes('User already registered')) {
    return {
      title: 'Account Exists',
      description: 'An account with this email already exists. Please sign in instead.'
    };
  }
  
  if (message.includes('Email not confirmed')) {
    return {
      title: 'Email Verification Required',
      description: 'Please check your email and click the verification link to complete your account setup.'
    };
  }
  
  if (message.includes('weak password') || message.includes('password')) {
    return {
      title: 'Password Requirements',
      description: 'Password does not meet security requirements. Please choose a stronger password.'
    };
  }
  
  // Default fallback with original message
  return {
    title: 'Authentication Error',
    description: message || 'An unexpected error occurred. Please try again.'
  };
};
