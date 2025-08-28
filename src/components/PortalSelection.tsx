import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Baby, ArrowRight } from "lucide-react";

export const PortalSelection = () => {
  const portals = [
    {
      id: "admin",
      title: "Administrator Portal",
      description: "Site management, reports, testing, and family oversight",
      icon: Shield,
      gradient: "bg-gradient-primary",
      features: [
        "Dashboard with all families and children",
        "Site maintenance and testing tools",
        "Affiliate management system",
        "Log collection and analytics",
        "Feature management and feedback"
      ],
      buttonText: "Admin Login",
      restricted: true
    },
    {
      id: "parent",
      title: "Parent Portal",
      description: "Create and manage your family unit and children's activities",
      icon: Users,
      gradient: "bg-gradient-secondary",
      features: [
        "Create family units and invite members",
        "Assign and track daily quests/chores",
        "Monitor children's progress and achievements",
        "Approve completed tasks and award points",
        "View family leaderboards and statistics"
      ],
      buttonText: "Parent Login",
      restricted: false
    },
    {
      id: "child",
      title: "Children's Portal",
      description: "Fun learning activities, games, and progress tracking",
      icon: Baby,
      gradient: "bg-gradient-accent",
      features: [
        "Educational games and learning activities",
        "Communication support with AAC symbols",
        "Visual schedules and routine management",
        "Speech therapy and phonics exercises",
        "Track personal progress and achievements"
      ],
      buttonText: "Kids Login",
      restricted: false
    }
  ];

  const handlePortalSelect = (portalId: string) => {
    // Since we don't have authentication set up yet, we'll show a message
    if (portalId === "admin") {
      alert("Administrator access requires special credentials. Please contact support.");
    } else {
      alert(`${portalId.charAt(0).toUpperCase() + portalId.slice(1)} portal coming soon! Please connect Supabase authentication first.`);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Portal
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the appropriate portal for your role. Each portal is designed 
            with specific features and permissions for optimal user experience.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {portals.map((portal) => (
            <Card 
              key={portal.id}
              className="relative overflow-hidden hover:shadow-large transition-all duration-300 hover:scale-105 border-2 hover:border-primary/20"
            >
              {/* Header with gradient background */}
              <div className={`${portal.gradient} p-6 text-white relative`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                      <portal.icon className="w-8 h-8" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-2">
                    {portal.title}
                  </h3>
                  <p className="text-center text-white/90 leading-relaxed">
                    {portal.description}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  {portal.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePortalSelect(portal.id)}
                  className={`w-full font-semibold ${
                    portal.restricted 
                      ? 'bg-muted hover:bg-muted/80 text-muted-foreground' 
                      : portal.gradient + ' hover:opacity-90 text-white shadow-soft'
                  }`}
                  size="lg"
                >
                  {portal.buttonText}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                {portal.restricted && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Administrator access only
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Information Banner */}
        <div className="mt-12 bg-muted/50 rounded-2xl p-6 border border-border">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-foreground mb-2">
              First Time Here?
            </h4>
            <p className="text-muted-foreground mb-4">
              Parents can create new family accounts, while children log in using credentials 
              provided by their parents. All data is securely stored and protected.
            </p>
            <Button variant="outline" size="sm">
              Need Help? Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};