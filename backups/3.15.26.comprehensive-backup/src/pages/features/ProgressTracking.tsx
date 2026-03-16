import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Calendar, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProgressTracking() {
  const features = [
    {
      icon: BarChart3,
      title: "Visual Analytics",
      description: "Easy-to-understand charts and graphs showing your child's development",
      capabilities: ["Skill progression charts", "Achievement timelines", "Comparative analysis", "Goal visualization"]
    },
    {
      icon: Target,
      title: "Goal Setting",
      description: "Set and track personalized goals based on your child's individual needs",
      capabilities: ["SMART goal creation", "Milestone tracking", "Progress alerts", "Celebration triggers"]
    },
    {
      icon: Calendar,
      title: "Regular Reports",
      description: "Automated reports to keep you informed about progress and areas of focus",
      capabilities: ["Weekly summaries", "Monthly insights", "Quarterly reviews", "Custom schedules"]
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
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Progress Tracking</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                See Every Step Forward
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Comprehensive progress tracking that celebrates achievements, identifies opportunities, 
                and keeps your child's development journey transparent and measurable.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/reports">
                    View Sample Report
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/auth">Start Tracking</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Tracking Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful tools to monitor, analyze, and celebrate your child's progress
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.capabilities.map((capability, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">The Power of Data-Driven Development</h2>
                <p className="text-xl text-muted-foreground">
                  Understanding progress helps make informed decisions about your child's care and education
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Identify Strengths</h3>
                    <p className="text-sm text-muted-foreground">Recognize and build upon your child's natural abilities</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Track Improvements</h3>
                    <p className="text-sm text-muted-foreground">See clear evidence of growth and development over time</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Inform Decisions</h3>
                    <p className="text-sm text-muted-foreground">Make evidence-based choices about interventions and activities</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Plan Ahead</h3>
                    <p className="text-sm text-muted-foreground">Use insights to set meaningful goals and milestones</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Start Tracking Progress Today</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join families who are using data to make a meaningful difference in their child's development
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link to="/auth">
                Begin Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}