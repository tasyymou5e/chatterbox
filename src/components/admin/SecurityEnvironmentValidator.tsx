import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/getErrorMessage';
interface ValidationResult {
  success: boolean;
  issues: string[];
  warnings: string[];
}

export default function SecurityEnvironmentValidator() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateEnvironment = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-testing', {
        body: { action: 'validate_environment' }
      });

      if (error) {
        toast({
          title: "Validation Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setValidationResult(data);
      
      if (data.success) {
        toast({
          title: "Environment Valid",
          description: "Security test environment is properly configured",
        });
      } else {
        toast({
          title: "Environment Issues Found",
          description: `Found ${data.issues.length} critical issues`,
          variant: "destructive"
        });
      }
    } catch (error: unknown) {
      console.error('Environment validation error:', error);
      toast({
        title: "Validation Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = (success: boolean, hasWarnings: boolean) => {
    if (success && !hasWarnings) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (success && hasWarnings) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = (success: boolean, hasWarnings: boolean) => {
    if (success && !hasWarnings) return "Healthy";
    if (success && hasWarnings) return "Healthy with Warnings";
    return "Issues Found";
  };

  const getStatusVariant = (success: boolean, hasWarnings: boolean): "default" | "secondary" | "destructive" => {
    if (success && !hasWarnings) return "default";
    if (success && hasWarnings) return "secondary";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Environment Validator
        </CardTitle>
        <CardDescription>
          Validate your security test environment configuration before running tests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={validateEnvironment} 
          disabled={isValidating}
          className="w-full"
        >
          {isValidating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Validating Environment...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Validate Environment
            </>
          )}
        </Button>

        {validationResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(validationResult.success, validationResult.warnings.length > 0)}
                <span className="font-medium">Environment Status</span>
              </div>
              <Badge variant={getStatusVariant(validationResult.success, validationResult.warnings.length > 0)}>
                {getStatusText(validationResult.success, validationResult.warnings.length > 0)}
              </Badge>
            </div>

            {validationResult.issues.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Critical Issues Found:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validationResult.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                    <p className="text-sm mt-2">
                      These issues must be resolved before running security tests.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                    <p className="text-sm mt-2">
                      Security tests will run but some features may be limited.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.success && validationResult.warnings.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Environment is properly configured for security testing. All systems are ready.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>What this validates:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs ml-4">
            <li>Supabase database connectivity</li>
            <li>Authentication service configuration</li>
            <li>Service role permissions</li>
            <li>Required security functions availability</li>
            <li>RLS policy infrastructure</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}