import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Heart, 
  Users, 
  Brain, 
  Gamepad2,
  Award,
  Clock,
  Calendar,
  Target,
  Shield,
  Home,
  ArrowRight
} from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Clock,
      title: "Time Management Made Simple",
      description: "Visual schedules and routines help families structure their days with predictability and reduced anxiety."
    },
    {
      icon: Calendar,
      title: "Organized Daily Life",
      description: "Track appointments, activities, and milestones in one place that the whole family can access and understand."
    },
    {
      icon: Target,
      title: "Goal-Oriented Progress",
      description: "Set achievable goals and celebrate progress with our built-in tracking and reward systems."
    },
    {
      icon: Shield,
      title: "Stress Reduction",
      description: "Reduce family stress through structured tools, clear communication, and predictable routines."
    },
    {
      icon: Users,
      title: "Family Harmony",
      description: "Strengthen family bonds through shared activities, progress tracking, and better understanding of each other's needs."
    },
    {
      icon: Home,
      title: "Independence Building",
      description: "Help children develop self-advocacy skills and independence through guided activities and positive reinforcement."
    }
  ];

  const features = [
    {
      icon: Brain,
      title: "Cognitive Development Tools",
      description: "Memory games, puzzles, and skill-building activities specifically designed for children with autism's learning patterns.",
      impact: "Improves focus, problem-solving skills, and cognitive flexibility in a supportive environment."
    },
    {
      icon: Heart,
      title: "Emotional Regulation Support",
      description: "Interactive tools for emotion recognition, regulation techniques, and social skills development.",
      impact: "Helps children identify feelings, learn coping strategies, and build emotional intelligence."
    },
    {
      icon: Gamepad2,
      title: "Educational Gaming Platform",
      description: "Speech therapy exercises, phonics practice, and interactive learning through engaging gameplay.",
      impact: "Makes learning enjoyable while targeting specific developmental goals and communication skills."
    },
    {
      icon: Award,
      title: "Achievement & Motivation System",
      description: "Personalized rewards, progress streaks, and celebration milestones that encourage continued engagement.",
      impact: "Builds confidence, maintains motivation, and creates positive associations with learning and growth."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md shadow-soft z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SH</span>
            </div>
            <span className="font-bold text-xl text-foreground">Chatterbox</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')}
              className="font-medium"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              className="font-medium"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
              Supporting Families, Empowering Children
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed">
              Chatterbox transforms how families with children with autism navigate daily life through 
              technology, structure, and compassionate support systems designed for real-world success.
            </p>
          </div>

          {/* Mission Statement */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-16">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-white/90 text-lg leading-relaxed max-w-3xl mx-auto">
                We believe every child with autism deserves tools that celebrate their unique strengths while 
                supporting their growth. Chatterbox provides families with comprehensive resources to 
                create structure, reduce stress, and build lasting positive outcomes together.
              </p>
            </CardContent>
          </Card>

          {/* How We Help Families */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              How We Transform Family Life
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <Card 
                  key={index} 
                  className="bg-gradient-card backdrop-blur-sm border-white/20 shadow-soft hover:shadow-medium transition-all duration-300"
                >
                  <CardContent className="p-6 text-center">
                    <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-soft">
                      <benefit.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Comprehensive Support Tools
            </h2>
            <div className="space-y-8">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="bg-white/10 backdrop-blur-md border-white/20 shadow-soft"
                >
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0 shadow-soft">
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold text-white mb-3">
                          {feature.title}
                        </h3>
                        <p className="text-white/80 text-lg mb-4 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className="bg-white/5 rounded-lg p-4 border-l-4 border-primary">
                          <p className="text-white/90 font-medium">
                            <span className="text-primary">Real Impact:</span> {feature.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Success Metrics */}
          <div className="mb-16 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Making a Real Difference
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
              <div>
                <div className="text-4xl font-bold mb-2">1000+</div>
                <div className="text-white/80">Families Supported</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">85%</div>
                <div className="text-white/80">Report Reduced Stress</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">50+</div>
                <div className="text-white/80">Activities Available</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-white/80">Support Access</div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <Card className="bg-gradient-primary text-primary-foreground shadow-medium">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Family's Journey?</h2>
              <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                Join thousands of families who have found structure, support, and success with Chatterbox. 
                Start building a more organized, connected, and joyful family life today.
              </p>
              <Button 
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-white/95 font-semibold px-8 py-4 text-lg"
                onClick={() => navigate('/auth')}
              >
                Start Your Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm opacity-80 mt-4">
                No commitment required • Get started in under 2 minutes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;