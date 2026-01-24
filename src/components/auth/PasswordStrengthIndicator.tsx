import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface PasswordValidationResult {
  isValid: boolean;
  score: number;
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

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

// Password validation logic (copied from shared validator)
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

const hasCommonPatterns = (password: string): boolean => {
  return COMMON_PATTERNS.some(pattern => pattern.test(password));
};

const isCommonPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return COMMON_WEAK_PASSWORDS.some(weak => 
    lowerPassword.includes(weak) || weak.includes(lowerPassword)
  );
};

const validatePassword = (password: string): PasswordValidationResult => {
  const feedback: string[] = [];
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    noCommonPatterns: !hasCommonPatterns(password),
    notCompromised: !isCommonPassword(password)
  };

  let score = 0;

  // Check minimum length
  if (!requirements.minLength) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
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
};

const getStrengthDescription = (score: number): string => {
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
};

const getStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'hsl(var(--destructive))';
    case 2:
      return 'hsl(var(--warning))';
    case 3:
      return 'hsl(var(--warning))';
    case 4:
      return 'hsl(var(--success))';
    case 5:
      return 'hsl(var(--success))';
    default:
      return 'hsl(var(--muted))';
  }
};

export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const validation = useMemo(() => {
    if (!password) return null;
    return validatePassword(password);
  }, [password]);

  if (!password || !validation) {
    return null;
  }

  const progressValue = (validation.score / 5) * 100;
  const strengthColor = getStrengthColor(validation.score);

  return (
    <div data-testid="password-strength" className={`space-y-3 ${className}`}>
      {/* Strength Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Password Strength</span>
          <span className="text-xs text-muted-foreground">
            {getStrengthDescription(validation.score)}
          </span>
        </div>
        <Progress 
          value={progressValue} 
          className="h-2"
          style={{
            '--progress-foreground': strengthColor
          } as React.CSSProperties}
        />
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-foreground">Password Requirements:</h4>
        <div className="grid grid-cols-1 gap-1 text-xs">
          <RequirementItem 
            met={validation.requirements.minLength} 
            text="At least 8 characters long" 
          />
          <RequirementItem 
            met={validation.requirements.hasUppercase} 
            text="One uppercase letter (A-Z)" 
          />
          <RequirementItem 
            met={validation.requirements.hasLowercase} 
            text="One lowercase letter (a-z)" 
          />
          <RequirementItem 
            met={validation.requirements.hasNumbers} 
            text="One number (0-9)" 
          />
          <RequirementItem 
            met={validation.requirements.hasSpecialChars} 
            text="One special character (!@#$%^&*)" 
          />
          <RequirementItem 
            met={validation.requirements.notCompromised} 
            text="Not a common password" 
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {validation.feedback.length > 0 && (
        <Alert className="border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <ul className="space-y-1 mt-1">
              {validation.feedback.map((feedback, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-muted-foreground">•</span>
                  <span>{feedback}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}
      <span className={met ? 'text-success' : 'text-muted-foreground'}>
        {text}
      </span>
    </div>
  );
}