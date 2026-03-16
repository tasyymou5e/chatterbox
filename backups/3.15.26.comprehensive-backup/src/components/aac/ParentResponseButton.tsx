import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTextToSpeech, AVAILABLE_VOICES, type Voice } from '@/hooks/useTextToSpeech';
import { useGrokTextToSpeech, GROK_VOICES, type GrokVoice } from '@/hooks/useGrokTextToSpeech';
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
  Mic,
  Cloud
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
  // Web Speech API TTS
  const browserTTS = useTextToSpeech();
  // Grok Cloud TTS
  const grokTTS = useGrokTextToSpeech();
  
  const celebration = useCelebration();
  
  // Toggle between browser TTS and Grok Cloud TTS
  const [useGrokVoice, setUseGrokVoice] = useState(false);
  
  // Voice selections for each mode
  const [browserVoice, setBrowserVoice] = useState<Voice>('female');
  const [grokVoice, setGrokVoice] = useState<GrokVoice>('Ara');
  
  const [speed, setSpeed] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [customRecordings, setCustomRecordings] = useState<CustomRecording[]>([]);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [selectedPhraseForRecording, setSelectedPhraseForRecording] = useState<ResponseButton | null>(null);

  // Derived state based on which TTS is active
  const isLoading = useGrokVoice ? grokTTS.isLoading : browserTTS.isLoading;
  const isSpeaking = useGrokVoice ? grokTTS.isSpeaking : browserTTS.isSpeaking;
  const stop = useGrokVoice ? grokTTS.stop : browserTTS.stop;

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
      celebrationType: 'hearts',
    },
    {
      id: 'time-for-bed',
      label: 'Time for Bed',
      phrase: `${childName}, it's time for bed. Let's get ready to sleep.`,
      icon: <Moon className="h-8 w-8" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      celebrationType: 'stars',
    },
    {
      id: 'all-done',
      label: 'All Done!',
      phrase: `All done, ${childName}! Great work finishing that!`,
      icon: <ThumbsUp className="h-8 w-8" />,
      color: 'bg-emerald-500 hover:bg-emerald-600',
      celebrationType: 'confetti',
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
      // Use TTS based on mode
      if (useGrokVoice) {
        await grokTTS.speak(button.phrase, { voice: grokVoice, speed });
      } else {
        await browserTTS.speak(button.phrase, { voice: browserVoice, speed });
      }
      
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
              {/* Grok Cloud Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  <Label htmlFor="grok-toggle" className="text-sm font-medium cursor-pointer">
                    Use Grok AI Voice (Cloud)
                  </Label>
                </div>
                <Switch
                  id="grok-toggle"
                  checked={useGrokVoice}
                  onCheckedChange={setUseGrokVoice}
                />
              </div>

              {/* Voice Selection - conditional based on mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {useGrokVoice ? 'Grok Voice' : 'Browser Voice'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {useGrokVoice ? (
                    GROK_VOICES.map((voice) => (
                      <Button
                        key={voice}
                        variant={grokVoice === voice ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGrokVoice(voice)}
                      >
                        {voice}
                      </Button>
                    ))
                  ) : (
                    AVAILABLE_VOICES.map((voice) => (
                      <Button
                        key={voice}
                        variant={browserVoice === voice ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBrowserVoice(voice)}
                        className="capitalize"
                      >
                        {voice}
                      </Button>
                    ))
                  )}
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
                  min={useGrokVoice ? 0.25 : 0.5}
                  max={useGrokVoice ? 4.0 : 1.5}
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
                      'h-24 w-full flex flex-col items-center justify-center gap-2 text-white font-semibold transition-[transform,box-shadow,opacity]',
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
                      'absolute -top-2 -right-2 p-1.5 rounded-full transition-colors shadow-md border-2 border-background',
                      hasCustomRecording 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                    title={hasCustomRecording ? 'Custom recording active' : 'Add custom recording'}
                  >
                    <Mic className="h-4 w-4" />
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
      {selectedPhraseForRecording && familyId && (
        <VoiceRecordingManager
          phraseKey={selectedPhraseForRecording.id}
          phraseLabel={selectedPhraseForRecording.label}
          familyId={familyId}
          {...(getCustomRecording(selectedPhraseForRecording.id)?.audioUrl !== undefined 
            ? { currentRecordingUrl: getCustomRecording(selectedPhraseForRecording.id)?.audioUrl } 
            : {})}
          onRecordingChange={handleRecordingChange}
          open={recordingDialogOpen}
          onOpenChange={setRecordingDialogOpen}
        />
      )}
    </>
  );
}
