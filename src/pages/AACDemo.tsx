import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParentResponseButton } from '@/components/aac/ParentResponseButton';
import { ArrowLeft, Volume2, Sparkles } from 'lucide-react';

export default function AACDemo() {
  const [childName, setChildName] = useState('Buddy');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Volume2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">AAC Demo</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Parent Response System</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              Parent Response Button Demo
            </CardTitle>
            <CardDescription>
              Test the AAC (Augmentative and Alternative Communication) parent response system. 
              This component allows parents to quickly communicate common phrases to their children 
              using text-to-speech or custom voice recordings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Features:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Personalized phrases with child's name</li>
                  <li>✅ 5 preset command buttons</li>
                  <li>✅ Text-to-speech with Grok AI</li>
                  <li>✅ Custom voice recording upload</li>
                  <li>✅ Adjustable speech speed</li>
                  <li>✅ Multiple voice options</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Feedback:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>🎉 Celebratory animations (confetti/stars)</li>
                  <li>📳 Haptic feedback on touch</li>
                  <li>🔊 Praise sound effects</li>
                  <li>⏱️ Response time indicator</li>
                  <li>🎨 Visual button feedback</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Customize the child's name to personalize all response phrases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="childName">Child's Name</Label>
              <Input
                id="childName"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Enter child's name"
              />
              <p className="text-xs text-muted-foreground">
                This name will be used in all spoken phrases.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parent Response Button Component */}
        <ParentResponseButton 
          childName={childName || 'Buddy'}
          className="shadow-lg"
        />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">1. Tap a Button</h4>
                <p className="text-sm text-muted-foreground">
                  Tap any of the colored response buttons to trigger the speech.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">2. Adjust Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Click the gear icon to change voice type and speech speed.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">3. Add Custom Recordings</h4>
                <p className="text-sm text-muted-foreground">
                  Click the microphone icon on any button to upload your own voice recording.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
