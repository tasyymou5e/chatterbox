import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Loader2, Users, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import FamilyNameSuggestions from './FamilyNameSuggestions';
import { useUIStore } from '@/stores/uiStore';

interface Child {
  firstName: string;
  lastName: string;
  generatedEmail: string;
}

interface Parent {
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateTestFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateTestFamilyDialog({ open, onOpenChange, onSuccess }: CreateTestFamilyDialogProps) {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const { 
    getLoading, 
    setLoading, 
    setError,
    clearError 
  } = useUIStore();
  
  const loading = getLoading('createTestFamily');
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [parent1, setParent1] = useState<Parent>({ firstName: '', lastName: '', email: '' });
  const [parent2, setParent2] = useState<Parent>({ firstName: '', lastName: '', email: '' });
  const [children, setChildren] = useState<Child[]>([]);

  // Helper function to generate child email
  const generateChildEmail = (childFirstName: string, parent1Email: string) => {
    if (!childFirstName || !parent1Email) return '';
    return `${parent1Email}.${childFirstName.toLowerCase()}`;
  };

  // Update child email when parent1 email or child name changes
  const updateChildEmails = (newParent1Email: string) => {
    setChildren(prev => prev.map(child => ({
      ...child,
      generatedEmail: generateChildEmail(child.firstName, newParent1Email)
    })));
  };

  const handleParent1EmailChange = (email: string) => {
    setParent1(prev => ({ ...prev, email }));
    updateChildEmails(email);
  };

  const addChild = () => {
    const newChild: Child = {
      firstName: '',
      lastName: '',
      generatedEmail: ''
    };
    setChildren(prev => [...prev, newChild]);
  };

  const removeChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: keyof Omit<Child, 'generatedEmail'>, value: string) => {
    setChildren(prev => prev.map((child, i) => {
      if (i !== index) return child;
      
      const updatedChild = { ...child, [field]: value };
      
      // Update generated email if firstName changed
      if (field === 'firstName') {
        updatedChild.generatedEmail = generateChildEmail(value, parent1.email);
      }
      
      return updatedChild;
    }));
  };

  const resetForm = () => {
    setDisplayName('');
    setParent1({ firstName: '', lastName: '', email: '' });
    setParent2({ firstName: '', lastName: '', email: '' });
    setChildren([]);
  };

  const validateForm = () => {
    if (!displayName.trim()) {
      toast({ variant: "destructive", title: "Family display name is required" });
      return false;
    }
    
    if (!parent1.firstName.trim() || !parent1.lastName.trim() || !parent1.email.trim()) {
      toast({ variant: "destructive", title: "Parent 1 information is required" });
      return false;
    }

    // Improved Parent 2 validation with clearer messaging
    const parent2HasAny = parent2.firstName.trim() || parent2.lastName.trim() || parent2.email.trim();
    const parent2HasAll = parent2.firstName.trim() && parent2.lastName.trim() && parent2.email.trim();
    
    if (parent2HasAny && !parent2HasAll) {
      const missingFields = [];
      if (!parent2.firstName.trim()) missingFields.push('First Name');
      if (!parent2.lastName.trim()) missingFields.push('Last Name');
      if (!parent2.email.trim()) missingFields.push('Email');
      
      toast({ 
        variant: "destructive", 
        title: "Parent 2 Information Incomplete",
        description: `Please complete these fields: ${missingFields.join(', ')} - or leave all Parent 2 fields empty for single-parent families.`
      });
      return false;
    }

    // Validate children
    for (const child of children) {
      if (!child.firstName.trim() || !child.lastName.trim()) {
        toast({ variant: "destructive", title: "All children must have first and last names" });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!user?.id) {
      toast({ variant: "destructive", title: "Not authenticated as admin" });
      return;
    }

    setLoading('createTestFamily', true);
    try {
      const familyData = {
        displayName: displayName.trim(),
        parent1: {
          firstName: parent1.firstName.trim(),
          lastName: parent1.lastName.trim(),
          email: parent1.email.trim()
        },
        parent2: parent2.firstName.trim() ? {
          firstName: parent2.firstName.trim(),
          lastName: parent2.lastName.trim(),
          email: parent2.email.trim()
        } : null,
        children: children.map(child => ({
          firstName: child.firstName.trim(),
          lastName: child.lastName.trim(),
          email: child.generatedEmail
        })),
        createdBy: user.id
      };

      const { data, error } = await supabase.functions.invoke('create-test-family', {
        body: familyData
      });

      if (error) throw error;

      toast({
        title: "✅ Test Family Created Successfully!",
        description: `Family "${data.familyCode}" created with ${data.membersCreated} members`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating test family:', error);
      toast({
        variant: "destructive",
        title: "Failed to create test family",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setLoading('createTestFamily', false);
    }
  };

  const hasParent2 = parent2.firstName.trim() || parent2.lastName.trim() || parent2.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create Test Family
          </DialogTitle>
          <DialogDescription>
            Create a complete family with auto-generated accounts for testing. Parent 1 is required, Parent 2 is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Family Display Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Family Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  Family Display Name <span className="text-destructive">*</span>
                </Label>
                <FamilyNameSuggestions
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="e.g., The Smiths, The Adventure Family..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent 1 (Required) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Parent 1 (Primary) <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={parent1.firstName}
                    onChange={(e) => setParent1(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={parent1.lastName}
                    onChange={(e) => setParent1(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email (Used for children's email generation)
                </Label>
                <Input
                  type="email"
                  value={parent1.email}
                  onChange={(e) => handleParent1EmailChange(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent 2 (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parent 2 (Optional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Leave empty for single-parent families, or fill all fields
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={parent2.firstName}
                    onChange={(e) => setParent2(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={parent2.lastName}
                    onChange={(e) => setParent2(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={parent2.email}
                  onChange={(e) => setParent2(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Children */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Children
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChild}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Child
                </Button>
              </CardTitle>
              {parent1.email && (
                <p className="text-sm text-muted-foreground">
                  📧 Children's emails will be generated as: {parent1.email}.childname
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {children.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No children added yet. Click "Add Child" to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {children.map((child, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Child {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChild(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={child.firstName}
                            onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                            placeholder="Emma"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={child.lastName}
                            onChange={(e) => updateChild(index, 'lastName', e.target.value)}
                            placeholder="Smith"
                          />
                        </div>
                      </div>
                      {child.generatedEmail && (
                        <div className="p-2 bg-muted rounded text-sm">
                          <span className="text-muted-foreground">Generated email: </span>
                          <span className="font-mono">{child.generatedEmail}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Preview */}
          {displayName && (parent1.firstName || children.length > 0) && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Family Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Family:</strong> {displayName}</p>
                  <p><strong>Family Code:</strong> Will be auto-generated (e.g., FAM-2025-001)</p>
                  <p><strong>Members to create:</strong></p>
                  <ul className="ml-4 space-y-1">
                    {parent1.firstName && (
                      <li>• {parent1.firstName} {parent1.lastName} (Parent) - {parent1.email}</li>
                    )}
                    {hasParent2 && parent2.firstName && (
                      <li>• {parent2.firstName} {parent2.lastName} (Parent) - {parent2.email}</li>
                    )}
                    {children.map((child, index) => (
                      <li key={index}>
                        • {child.firstName} {child.lastName} (Child) - {child.generatedEmail}
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground text-xs mt-2">
                    💡 All accounts will be created with temporary passwords that will be displayed after creation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !displayName || !parent1.firstName}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Family'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}