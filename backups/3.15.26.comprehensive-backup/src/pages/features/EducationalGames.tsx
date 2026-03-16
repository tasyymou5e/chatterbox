import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Brain, Trophy, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function EducationalGames() {
  const gameCategories = [
    {
      icon: Brain,
      title: "Cognitive Development",
      description: "Memory games, puzzles, and problem-solving activities",
      features: ["Pattern recognition", "Logic puzzles", "Memory training", "Critical thinking"]
    },
    {
      icon: Users,
      title: "Social Skills",
      description: "Interactive games that build communication and social awareness",
      features: ["Turn-taking games", "Emotion recognition", "Conversation starters", "Group activities"]
    },
    {
      icon: Trophy,
      title: "Achievement System",
      description: "Rewarding progress with badges, levels, and celebrations",
      features: ["Progress tracking", "Custom rewards", "Milestone celebrations", "Family sharing"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Educational Games</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Learning Through Play
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Engaging, research-based games designed to support cognitive development, 
                social skills, and communication abilities for children with special needs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/games">
                    Explore Games
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/auth">Get Started Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Game Categories */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Game Categories</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our games are carefully designed to target specific developmental areas
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {gameCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <category.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Playing?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of families using our educational games to support their children's development
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link to="/auth">
                Start Playing Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}