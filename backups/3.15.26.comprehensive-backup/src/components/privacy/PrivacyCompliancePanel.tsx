import { useState } from 'react';
import { Download, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { exportUserData, requestDataDeletion, anonymizeUserData } from '@/utils/privacyCompliance';

export default function PrivacyCompliancePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deletionOptions, setDeletionOptions] = useState({
    deleteBehavioralData: true,
    deleteProfileData: false,
    deleteActivityLogs: true,
    retainFamilyData: true
  });

  const handleDataExport = async () => {
    setLoading(true);
    try {
      const userData = await exportUserData();
      if (userData) {
        const blob = new Blob([JSON.stringify(userData, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Data exported successfully',
          description: 'Your data has been downloaded to your device.'
        });
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Failed to export your data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    setLoading(true);
    try {
      const success = await requestDataDeletion(deletionOptions);
      if (success) {
        toast({
          title: 'Data deletion requested',
          description: 'Your data deletion request has been processed successfully.'
        });
      } else {
        throw new Error('Deletion failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deletion failed',
        description: 'Failed to process your data deletion request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataAnonymization = async () => {
    setLoading(true);
    try {
      const success = await anonymizeUserData();
      if (success) {
        toast({
          title: 'Data anonymized',
          description: 'Your personal data has been anonymized while preserving analytics.'
        });
      } else {
        throw new Error('Anonymization failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Anonymization failed',
        description: 'Failed to anonymize your data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Under privacy regulations like GDPR and CCPA, you have rights regarding your personal data. 
              Use the options below to exercise these rights.
            </AlertDescription>
          </Alert>

          {/* Data Export */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Export My Data</h4>
              <p className="text-sm text-muted-foreground">
                Download a complete copy of your personal data in JSON format
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleDataExport} 
              disabled={loading}
              className="shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          {/* Data Anonymization */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Anonymize My Data</h4>
              <p className="text-sm text-muted-foreground">
                Remove personal identifiers while keeping anonymized usage patterns
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleDataAnonymization} 
              disabled={loading}
              className="shrink-0"
            >
              <Shield className="h-4 w-4 mr-2" />
              Anonymize
            </Button>
          </div>

          {/* Data Deletion */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-destructive">Delete My Data</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently remove your personal data from our systems
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" disabled={loading} className="shrink-0">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Confirm Data Deletion
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This action cannot be undone. 
                        Please carefully select what data to delete.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="behavioral"
                          checked={deletionOptions.deleteBehavioralData}
                          onCheckedChange={(checked) => 
                            setDeletionOptions(prev => ({ 
                              ...prev, 
                              deleteBehavioralData: !!checked 
                            }))
                          }
                        />
                        <label htmlFor="behavioral" className="text-sm">
                          Delete behavioral and analytics data
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="activity"
                          checked={deletionOptions.deleteActivityLogs}
                          onCheckedChange={(checked) => 
                            setDeletionOptions(prev => ({ 
                              ...prev, 
                              deleteActivityLogs: !!checked 
                            }))
                          }
                        />
                        <label htmlFor="activity" className="text-sm">
                          Delete activity and error logs
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="profile"
                          checked={deletionOptions.deleteProfileData}
                          onCheckedChange={(checked) => 
                            setDeletionOptions(prev => ({ 
                              ...prev, 
                              deleteProfileData: !!checked 
                            }))
                          }
                        />
                        <label htmlFor="profile" className="text-sm">
                          Delete profile information
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="family"
                          checked={deletionOptions.retainFamilyData}
                          onCheckedChange={(checked) => 
                            setDeletionOptions(prev => ({ 
                              ...prev, 
                              retainFamilyData: !!checked 
                            }))
                          }
                        />
                        <label htmlFor="family" className="text-sm">
                          Keep family and chore data (recommended)
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <DialogTrigger asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogTrigger>
                      <Button 
                        variant="destructive" 
                        onClick={handleDataDeletion}
                        disabled={loading}
                      >
                        {loading ? 'Processing...' : 'Delete Selected Data'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}