// Enhanced password validation utility
// Provides comprehensive password strength validation with autism-friendly feedback

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5 strength score
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    noCommonPatterns: boolean;
    notCompromised: boolean;
  };
}

// Common weak passwords and patterns to avoid
const COMMON_WEAK_PASSWORDS = [
  'password', '123456', 'password123', 'admin', 'qwerty', 
  'letmein', 'welcome', 'monkey', '1234567890', 'abc123',
  'password1', 'admin123', 'root', 'user', 'test'
];

const COMMON_PATTERNS = [
  /^(.)\1+$/,           // All same character (aaaa, 1111)
  /^(.)(.)\1\2/,        // Repeating pairs (abab)
  /123456|654321/,      // Sequential numbers
  /abcdef|fedcba/i,     // Sequential letters
  /qwerty|asdfgh/i,     // Keyboard patterns
];

export class PasswordValidator {
  /**
   * Validate password strength with comprehensive checks
   */
  static validate(password: string): PasswordValidationResult {
    const feedback: string[] = [];
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      noCommonPatterns: !this.hasCommonPatterns(password),
      notCompromised: !this.isCommonPassword(password)
    };

    let score = 0;

    // Check minimum length
    if (!requirements.minLength) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
      if (password.length >= 12) score += 1; // Bonus for longer passwords
    }

    // Check character variety
    if (!requirements.hasUppercase) {
      feedback.push('Include at least one uppercase letter (A-Z)');
    } else {
      score += 1;
    }

    if (!requirements.hasLowercase) {
      feedback.push('Include at least one lowercase letter (a-z)');
    } else {
      score += 1;
    }

    if (!requirements.hasNumbers) {
      feedback.push('Include at least one number (0-9)');
    } else {
      score += 1;
    }

    if (!requirements.hasSpecialChars) {
      feedback.push('Include at least one special character (!@#$%^&*)');
    } else {
      score += 1;
    }

    // Check for common patterns
    if (!requirements.noCommonPatterns) {
      feedback.push('Avoid common patterns like "123456" or "qwerty"');
      score = Math.max(0, score - 1);
    }

    // Check for compromised passwords
    if (!requirements.notCompromised) {
      feedback.push('This password is too common. Please choose a unique password');
      score = Math.max(0, score - 2);
    }

    // Calculate final score (0-5 scale)
    const totalRequirements = Object.keys(requirements).length;
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    score = Math.min(5, Math.floor((metRequirements / totalRequirements) * 5));

    // Add positive feedback for strong passwords
    if (score >= 4 && feedback.length === 0) {
      feedback.push('Strong password! Good job creating a secure password.');
    } else if (score >= 3 && feedback.length <= 1) {
      feedback.push('Good password strength. Consider the suggestions above for better security.');
    }

    const isValid = score >= 3 && requirements.minLength && 
                   requirements.hasUppercase && requirements.hasLowercase &&
                   requirements.hasNumbers && requirements.notCompromised;

    return {
      isValid,
      score,
      feedback,
      requirements
    };
  }

  /**
   * Check if password contains common weak patterns
   */
  private static hasCommonPatterns(password: string): boolean {
    return COMMON_PATTERNS.some(pattern => pattern.test(password));
  }

  /**
   * Check if password is in common weak password list
   */
  private static isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return COMMON_WEAK_PASSWORDS.some(weak => 
      lowerPassword.includes(weak) || weak.includes(lowerPassword)
    );
  }

  /**
   * Generate autism-friendly password suggestions
   */
  static generateSuggestions(): string[] {
    return [
      'Create a sentence and use the first letter of each word: "My Dog Likes 2 Play Outside!" becomes "MDL2PO!"',
      'Use a favorite hobby or interest with numbers and symbols: "Reading7Books#Fun"',
      'Combine two favorite things with a year: "Pizza&Soccer2024"',
      'Use a memorable phrase with substitutions: "ILove2ReadBooks!" (I Love 2 Read Books!)',
      'Think of a favorite place with personal numbers: "Beach2024#Vacation"'
    ];
  }

  /**
   * Get strength description for autism-friendly feedback
   */
  static getStrengthDescription(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'Very Weak - This password needs improvement for your security';
      case 2:
        return 'Weak - Please add more variety to make it stronger';
      case 3:
        return 'Fair - Good start! A few more improvements will make it strong';
      case 4:
        return 'Strong - Great job! This password will keep your account safe';
      case 5:
        return 'Very Strong - Excellent! You\'ve created a very secure password';
      default:
        return 'Unknown strength';
    }
  }
}