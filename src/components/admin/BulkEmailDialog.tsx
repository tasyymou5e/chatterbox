import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Loader2, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Recipient {
  email: string;
  name: string;
}

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyName: string;
  recipients: Recipient[];
}

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

export default function BulkEmailDialog({
  open,
  onOpenChange,
  familyName,
  recipients
}: BulkEmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({
        variant: 'destructive',
        title: 'Subject required',
        description: 'Please enter an email subject.'
      });
      return;
    }

    if (!message.trim()) {
      toast({
        variant: 'destructive',
        title: 'Message required',
        description: 'Please enter an email message.'
      });
      return;
    }

    setSending(true);

    try {
      const recipientEmails = recipients.map(r => r.email);
      
      const { data, error } = await supabase.functions.invoke('send-family-email', {
        body: {
          subject: subject.trim(),
          message: message.trim(),
          recipientEmails,
          familyName
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to send emails',
          description: data.message || data.error
        });
        return;
      }

      const results = data?.results as Array<{ success: boolean }> | undefined;
      const successCount = results?.filter((r) => r.success).length || 0;
      const failCount = results?.filter((r) => !r.success).length || 0;

      if (failCount > 0) {
        toast({
          variant: 'default',
          title: 'Emails partially sent',
          description: `${successCount} sent, ${failCount} failed. Check logs for details.`
        });
      } else {
        toast({
          title: 'Emails sent successfully',
          description: `Sent ${successCount} emails to ${familyName} family members.`
        });
      }

      // Reset form and close dialog
      setSubject('');
      setMessage('');
      onOpenChange(false);

    } catch (error) {
      cError('Error sending bulk email:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send emails',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.'
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSubject('');
      setMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Mail className="h-5 w-5 mr-2 text-blue-400" />
            Email Family Members
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Send an email to all members of the {familyName} family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients Preview */}
          <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center text-sm text-gray-300 mb-2">
              <Users className="h-4 w-4 mr-2" />
              Recipients ({recipients.length})
            </div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {recipients.map((recipient, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="bg-gray-600 text-gray-200 text-xs"
                >
                  {recipient.name || recipient.email}
                </Badge>
              ))}
            </div>
          </div>

          {/* Subject Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject" className="text-gray-300">Subject</Label>
              <span className={`text-xs ${subject.length > MAX_SUBJECT_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
                {subject.length}/{MAX_SUBJECT_LENGTH}
              </span>
            </div>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
              placeholder="Enter email subject..."
              className="bg-gray-700 border-gray-600 text-white"
              disabled={sending}
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-gray-300">Message</Label>
              <span className={`text-xs ${message.length > MAX_MESSAGE_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              placeholder="Enter your message..."
              className="bg-gray-700 border-gray-600 text-white min-h-[150px] resize-none"
              disabled={sending}
            />
          </div>

          {/* Info Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg text-sm text-blue-300">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Emails are sent individually to each recipient. Rate limit: 10 bulk emails per hour.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={sending}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim() || recipients.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {recipients.length} {recipients.length === 1 ? 'Member' : 'Members'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
