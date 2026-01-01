import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubtractionGame } from '@/components/games/SubtractionGame';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';

// Content IDs matching database records
const TEST_CONTENT_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const MATH_CATEGORY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default function SubtractionGameDemo() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { setUser } = useLessonProgressStore();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch family ID for the user
  useEffect(() => {
    const fetchFamilyId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setFamilyId(data.family_id);
          setUser(user.id, data.family_id);
        }
      } catch (err) {
        console.error('Error fetching family:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyId();
  }, [user, setUser]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Please log in to play games.</p>
        <Button onClick={() => navigate('/auth')}>Sign In</Button>
      </div>
    );
  }

  if (!familyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No family found. Please join or create a family first.</p>
        <Button onClick={() => navigate('/parent-dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </header>
      
      <main className="container py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Subtraction Practice</h1>
          <p className="text-muted-foreground">
            Answer 20 questions to complete the session
          </p>
        </div>
        
        <SubtractionGame
          contentItemId={TEST_CONTENT_ID}
          categoryId={MATH_CATEGORY_ID}
          skillLevel="beginner"
          onComplete={(stats) => {
            console.log('Game completed:', stats);
          }}
        />
      </main>
    </div>
  );
}
