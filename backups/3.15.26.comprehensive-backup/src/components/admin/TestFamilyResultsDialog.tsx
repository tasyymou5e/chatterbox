import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Download, Eye, EyeOff, CheckCircle, XCircle, Users, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreatedMember {
  name: string;
  email: string;
  role: string;
  tempPassword?: string;
  success: boolean;
  error?: string;
}

interface TestFamilyResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: {
    success: boolean;
    familyCode?: string;
    displayName?: string;
    membersCreated: number;
    members: CreatedMember[];
    tempPassword?: string;
    cleanupResults?: {
      familiesDeleted: number;
      usersDeleted: number;
    };
  } | null;
}

export default function TestFamilyResultsDialog({ 
  open, 
  onOpenChange, 
  results 
}: TestFamilyResultsDialogProps) {
  const { toast } = useToast();
  const [showPasswords, setShowPasswords] = useState(false);

  if (!results) return null;

  const successfulMembers = results.members.filter(m => m.success);
  const failedMembers = results.members.filter(m => !m.success);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ 
      title: "Copied to clipboard", 
      description: `${label} copied successfully` 
    });
  };

  const copyAllCredentials = () => {
    const fullText = successfulMembers.map(member => 
      `${member.name} (${member.role})\nEmail: ${member.email}\nPassword: ${member.tempPassword || results.tempPassword || 'N/A'}\n`
    ).join('\n');

    copyToClipboard(fullText, 'All credentials');
  };

  const downloadCredentials = () => {
    const csvContent = `Family,Role,Name,Email,Password\n` + 
      successfulMembers.map(member => 
        `"${results.displayName} (${results.familyCode})",${member.role},"${member.name}","${member.email}","${member.tempPassword || results.tempPassword || 'N/A'}"`
      ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-family-${results.familyCode}-credentials.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {results.success ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Test Family Creation Results
          </DialogTitle>
          <DialogDescription>
            {results.success 
              ? `Family "${results.displayName}" (${results.familyCode}) has been created`
              : 'Family creation encountered errors'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Creation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">{successfulMembers.length}</div>
                  <div className="text-sm text-muted-foreground">Created</div>
                </div>
                {failedMembers.length > 0 && (
                  <div className="text-center p-3 bg-destructive/10 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{failedMembers.length}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                )}
                {results.cleanupResults && (
                  <>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{results.cleanupResults.familiesDeleted}</div>
                      <div className="text-sm text-muted-foreground">Families Cleaned</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{results.cleanupResults.usersDeleted}</div>
                      <div className="text-sm text-muted-foreground">Users Cleaned</div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Successful Members */}
          {successfulMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Login Credentials ({successfulMembers.length} users)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showPasswords ? 'Hide' : 'Show'} Passwords
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyAllCredentials}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadCredentials}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download CSV
                    </Button>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  ⚠️ Save these credentials securely. They will only be shown once.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {successfulMembers.map((member, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{member.name}</h4>
                          <Badge variant={member.role === 'parent' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        </div>
                        <CheckCircle className="h-4 w-4 text-success" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Email:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">{member.email}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(member.email, 'Email')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Password:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {showPasswords 
                                ? (member.tempPassword || results.tempPassword || 'N/A')
                                : '••••••••••••••••'
                              }
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                member.tempPassword || results.tempPassword || '', 
                                'Password'
                              )}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Members */}
          {failedMembers.length > 0 && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  Failed to Create ({failedMembers.length} users)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {failedMembers.map((member, index) => (
                    <div key={index} className="border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{member.name}</h4>
                          <Badge variant="destructive">{member.role}</Badge>
                        </div>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Email: {member.email}</p>
                      {member.error && (
                        <p className="text-sm text-destructive">{member.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {successfulMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Login Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Users should log in using their email and the temporary password provided</li>
                  <li>After first login, users should change their password in their profile settings</li>
                  <li>Family code <code className="bg-muted px-1 rounded">{results.familyCode}</code> can be used for family identification</li>
                  <li>All test data can be cleaned up using the "Clean Up Test Data" button in the admin panel</li>
                </ol>
              </CardContent>
            </Card>
          )}

          <Separator />
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}