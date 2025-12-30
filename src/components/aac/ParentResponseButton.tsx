import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useTextToSpeech, AVAILABLE_VOICES, type Voice } from '@/hooks/useTextToSpeech';
import { 
  Volume2, 
  VolumeX, 
  Loader2, 
  ThumbsUp, 
  Utensils, 
  Moon, 
  Tv, 
  Hand,
  Settings2
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ParentResponseButtonProps {
  childName?: string;
  className?: string;
}

interface ResponseButton {
  id: string;
  label: string;
  phrase: string;
  icon: React.ReactNode;
  color: string;
}

export function ParentResponseButton({ childName = 'Buddy', className }: ParentResponseButtonProps) {
  const { speak, stop, isLoading, isSpeaking } = useTextToSpeech();
  const [selectedVoice, setSelectedVoice] = useState<Voice>('nova');
  const [speed, setSpeed] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const responseButtons: ResponseButton[] = [
    {
      id: 'good-job',
      label: 'Good Job!',
      phrase: `${childName} did a good job! I'm so proud of you!`,
      icon: <ThumbsUp className="h-8 w-8" />,
      color: 'bg-green-500 hover:bg-green-600',
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

    await speak(button.phrase, { voice: selectedVoice, speed });
    setActiveButton(null);
  };

  const speedLabel = speed < 0.8 ? 'Slow' : speed > 1.2 ? 'Fast' : 'Normal';

  return (
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
        {/* Settings Panel */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleContent className="space-y-4 pb-4 border-b">
            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice</label>
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
          {responseButtons.map((button) => (
            <Button
              key={button.id}
              onClick={() => handleButtonClick(button)}
              disabled={isLoading}
              className={cn(
                'h-24 flex flex-col items-center justify-center gap-2 text-white font-semibold transition-all',
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
          ))}
        </div>

        {/* Status Indicator */}
        {isSpeaking && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            Speaking... (tap button to stop)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
