import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useTextToSpeech, AVAILABLE_VOICES, type Voice } from '@/hooks/useTextToSpeech';
import { useCelebration } from '@/hooks/useCelebration';
import { 
  Volume2, 
  VolumeX, 
  Loader2, 
  ThumbsUp, 
  Utensils, 
  Moon, 
  Tv, 
  Hand,
  Settings2,
  Mic
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CelebrationEffect } from './CelebrationEffect';
import { ResponseTimeIndicator } from './ResponseTimeIndicator';
import { VoiceRecordingManager } from './VoiceRecordingManager';
import { supabase } from '@/integrations/supabase/client';

interface ParentResponseButtonProps {
  childName?: string;
  familyId?: string;
  className?: string;
}

interface ResponseButton {
  id: string;
  label: string;
  phrase: string;
  icon: React.ReactNode;
  color: string;
  celebrationType?: 'confetti' | 'stars' | 'hearts';
}

interface CustomRecording {
  phraseKey: string;
  audioUrl: string;
}

export function ParentResponseButton({ 
  childName = 'Buddy', 
  familyId,
  className 
}: ParentResponseButtonProps) {
  const { speak, stop, isLoading, isSpeaking } = useTextToSpeech();
  const celebration = useCelebration();
  const [selectedVoice, setSelectedVoice] = useState<Voice>('default');
  const [speed, setSpeed] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [customRecordings, setCustomRecordings] = useState<CustomRecording[]>([]);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [selectedPhraseForRecording, setSelectedPhraseForRecording] = useState<ResponseButton | null>(null);

  // Fetch custom recordings on mount
  useEffect(() => {
    if (!familyId) return;
    
    const fetchRecordings = async () => {
      const { data } = await supabase
        .from('parent_voice_recordings')
        .select('phrase_key, audio_url')
        .eq('family_id', familyId);
      
      if (data) {
        setCustomRecordings(data.map(r => ({
          phraseKey: r.phrase_key,
          audioUrl: r.audio_url
        })));
      }
    };
    
    fetchRecordings();
  }, [familyId]);

  const responseButtons: ResponseButton[] = [
    {
      id: 'good-job',
      label: 'Good Job!',
      phrase: `${childName} did a good job! I'm so proud of you!`,
      icon: <ThumbsUp className="h-8 w-8" />,
      color: 'bg-green-500 hover:bg-green-600',
      celebrationType: 'stars',
    },
    {
      id: 'sit-down',
      label: 'Sit Down',
      phrase: `${childName}, please sit down nicely.`,
      icon: <Hand className="h-8 w-8" />,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'lets-eat',
      label: "Let's Eat",
      phrase: `${childName}, it's time to eat! Let's go to the table.`,
      icon: <Utensils className="h-8 w-8" />,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      id: 'time-for-bed',
      label: 'Time for Bed',
      phrase: `${childName}, it's time for bed. Let's get ready to sleep.`,
      icon: <Moon className="h-8 w-8" />,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'no-tv',
      label: 'NO TV',
      phrase: `${childName}, no TV right now. Let's do something else.`,
      icon: <Tv className="h-8 w-8" />,
      color: 'bg-red-500 hover:bg-red-600',
    },
  ];

  const getCustomRecording = (phraseKey: string) => {
    return customRecordings.find(r => r.phraseKey === phraseKey);
  };

  const handleButtonClick = async (button: ResponseButton) => {
    if (isSpeaking) {
      stop();
      setActiveButton(null);
      return;
    }

    setActiveButton(button.id);
    
    // Trigger haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Check for custom recording first
    const customRecording = getCustomRecording(button.id);
    
    if (customRecording) {
      // Play custom recording
      const audio = new Audio(customRecording.audioUrl);
      audio.playbackRate = speed;
      audio.play();
      audio.onended = () => {
        setActiveButton(null);
        if (button.celebrationType) {
          celebration.trigger(button.celebrationType);
        }
      };
    } else {
      // Use TTS fallback
      await speak(button.phrase, { voice: selectedVoice, speed });
      
      // Trigger celebration for positive responses
      if (button.celebrationType) {
        celebration.trigger(button.celebrationType);
      }
      
      setActiveButton(null);
    }
  };

  const handleRecordingClick = (button: ResponseButton, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhraseForRecording(button);
    setRecordingDialogOpen(true);
  };

  const handleRecordingChange = (url: string | null) => {
    if (!selectedPhraseForRecording) return;
    
    setCustomRecordings(prev => {
      if (url) {
        const existing = prev.findIndex(r => r.phraseKey === selectedPhraseForRecording.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { phraseKey: selectedPhraseForRecording.id, audioUrl: url };
          return updated;
        }
        return [...prev, { phraseKey: selectedPhraseForRecording.id, audioUrl: url }];
      } else {
        return prev.filter(r => r.phraseKey !== selectedPhraseForRecording.id);
      }
    });
  };

  const speedLabel = speed < 0.8 ? 'Slow' : speed > 1.2 ? 'Fast' : 'Normal';
  const estimatedTTSTime = 8; // Average time for TTS response

  return (
    <>
      <CelebrationEffect 
        isActive={celebration.isActive} 
        type={celebration.celebrationType}
      />
      
      <Card className={cn('w-full max-w-2xl mx-auto', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              Parent Response Buttons
            </CardTitle>
            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Response Time Indicator */}
          <ResponseTimeIndicator 
            isLoading={isLoading} 
            estimatedSeconds={estimatedTTSTime}
          />

          {/* Settings Panel */}
          <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <CollapsibleContent className="space-y-4 pb-4 border-b">
              {/* Voice Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">TTS Voice</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VOICES.map((voice) => (
                    <Button
                      key={voice}
                      variant={selectedVoice === voice ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedVoice(voice)}
                      className="capitalize"
                    >
                      {voice}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Speed Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Speed</label>
                  <span className="text-sm text-muted-foreground">{speedLabel} ({speed.toFixed(1)}x)</span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={([value]) => setSpeed(value)}
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Response Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {responseButtons.map((button) => {
              const hasCustomRecording = !!getCustomRecording(button.id);
              
              return (
                <div key={button.id} className="relative">
                  <Button
                    onClick={() => handleButtonClick(button)}
                    disabled={isLoading && activeButton !== button.id}
                    className={cn(
                      'h-24 w-full flex flex-col items-center justify-center gap-2 text-white font-semibold transition-all',
                      button.color,
                      activeButton === button.id && 'ring-4 ring-primary ring-offset-2 scale-95',
                      isSpeaking && activeButton === button.id && 'animate-pulse'
                    )}
                  >
                    {isLoading && activeButton === button.id ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isSpeaking && activeButton === button.id ? (
                      <VolumeX className="h-8 w-8" />
                    ) : (
                      button.icon
                    )}
                    <span className="text-sm">{button.label}</span>
                  </Button>
                  
                  {/* Recording indicator/button */}
                  <button
                    onClick={(e) => handleRecordingClick(button, e)}
                    className={cn(
                      'absolute -top-1 -right-1 p-1 rounded-full transition-colors',
                      hasCustomRecording 
                        ? 'bg-green-500 text-white' 
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                    title={hasCustomRecording ? 'Custom recording active' : 'Add custom recording'}
                  >
                    <Mic className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Status Indicator */}
          {isSpeaking && (
            <div className="text-center text-sm text-muted-foreground animate-pulse">
              Speaking... (tap button to stop)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Recording Manager Dialog */}
      {selectedPhraseForRecording && (
        <VoiceRecordingManager
          phraseKey={selectedPhraseForRecording.id}
          phraseLabel={selectedPhraseForRecording.label}
          familyId={familyId}
          currentRecordingUrl={getCustomRecording(selectedPhraseForRecording.id)?.audioUrl}
          onRecordingChange={handleRecordingChange}
          open={recordingDialogOpen}
          onOpenChange={setRecordingDialogOpen}
        />
      )}
    </>
  );
}
