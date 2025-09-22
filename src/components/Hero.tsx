import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Heart, Star, Users, Brain, Gamepad2, Award } from "lucide-react";

interface HeroProps {
  onChoosePortal?: () => void;
  settings: {
    parent_signup_enabled: boolean;
    site_maintenance_mode: boolean;
    max_families_per_parent: number;
  };
}

export const Hero = ({ onChoosePortal, settings }: HeroProps) => {
  const navigate = useNavigate();
  const features = [
    {
      icon: Brain,
      title: "Cognitive Development",
      description: "Memory games, puzzles, and skill-building activities designed for autistic children"
    },
    {
      icon: Heart,
      title: "Emotional Support",
      description: "Emotion recognition, regulation tools, and social skills training through stories"
    },
    {
      icon: Gamepad2,
      title: "Educational Games",
      description: "Interactive learning experiences with speech therapy and phonics exercises"
    },
    {
      icon: Users,
      title: "Family Connection",
      description: "Parent tracking, progress monitoring, and family task management system"
    },
    {
      icon: Award,
      title: "Achievement System",
      description: "Motivating rewards, streaks, and gamification to encourage daily progress"
    },
    {
      icon: Star,
      title: "Personalized Experience",
      description: "Customizable with photos, audio, and visual schedules for individual needs"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
            Empowering Autistic Children
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            A comprehensive platform designed specifically for autistic children, featuring educational games, 
            communication support, and family engagement tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className={`font-semibold px-8 py-4 text-lg shadow-medium ${
                settings.parent_signup_enabled 
                  ? "bg-white text-primary hover:bg-white/95" 
                  : "bg-white/50 text-primary/50 cursor-not-allowed"
              }`}
              onClick={settings.parent_signup_enabled ? onChoosePortal : undefined}
              disabled={!settings.parent_signup_enabled}
            >
              {settings.parent_signup_enabled ? "Parent Sign Up" : "Parent Signup Disabled"}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-4 text-lg backdrop-blur-sm"
              onClick={() => navigate('/games')}
            >
              Browse Games & Activities
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-gradient-card backdrop-blur-sm border-white/20 shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105"
            >
              <div className="p-6 text-center">
                <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-white/80">Happy Families</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-white/80">Learning Activities</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-white/80">Support Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};