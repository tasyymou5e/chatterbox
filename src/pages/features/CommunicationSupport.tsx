import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Volume2, Image, Smartphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function CommunicationSupport() {
  const features = [
    {
      icon: MessageCircle,
      title: "Visual Communication",
      description: "Picture cards, symbols, and visual schedules to support non-verbal communication",
      benefits: ["PECS support", "Custom picture cards", "Visual schedules", "Symbol libraries"]
    },
    {
      icon: Volume2,
      title: "Voice & Sound",
      description: "Text-to-speech, voice recording, and sound-based interaction tools",
      benefits: ["Text-to-speech", "Voice recording", "Sound buttons", "Audio feedback"]
    },
    {
      icon: Smartphone,
      title: "AAC Integration",
      description: "Compatible with popular Augmentative and Alternative Communication devices",
      benefits: ["Switch access", "Eye gaze support", "Touch adaptation", "Device sync"]
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
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Communication Support</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Every Voice Matters
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Powerful communication tools that adapt to each child's unique needs, 
                supporting both verbal and non-verbal communication methods.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/auth">
                    Try Communication Tools
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/connect/parent-resources">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Communication Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Comprehensive tools designed to support diverse communication needs
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
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {benefit}
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
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Why Communication Support Matters</h2>
                <p className="text-xl text-muted-foreground">
                  Effective communication opens doors to learning, social connections, and independence
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Reduces Frustration</h3>
                      <p className="text-muted-foreground">Clear communication pathways help children express their needs and wants effectively</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Builds Confidence</h3>
                      <p className="text-muted-foreground">Successful communication experiences boost self-esteem and encourage further interaction</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Enhances Learning</h3>
                      <p className="text-muted-foreground">Better communication leads to more effective teaching and skill development</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Strengthens Relationships</h3>
                      <p className="text-muted-foreground">Improved communication deepens bonds between children, families, and caregivers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Start Communicating Today</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover how our communication tools can help your child express themselves and connect with the world
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}