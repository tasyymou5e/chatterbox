import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, BarChart3, Users, FileText, Calendar, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function TherapistTools() {
  const professionalFeatures = [
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Detailed progress tracking with professional-grade reporting and data visualization",
      benefits: ["Comprehensive progress reports", "Data export capabilities", "Trend analysis", "Goal tracking"]
    },
    {
      icon: Users,
      title: "Multi-Client Management",
      description: "Efficiently manage multiple clients with secure, organized access controls",
      benefits: ["Client dashboard", "Secure data separation", "Bulk operations", "Team collaboration"]
    },
    {
      icon: FileText,
      title: "Professional Documentation",
      description: "Generate reports and documentation that meet professional standards and requirements",
      benefits: ["Custom report templates", "Assessment tools", "Progress summaries", "Insurance compatibility"]
    }
  ];

  const specializations = [
    {
      title: "Speech-Language Pathologists",
      features: ["AAC assessment tools", "Communication progress tracking", "Articulation data", "Language development metrics"],
      icon: "💬"
    },
    {
      title: "Occupational Therapists",
      features: ["Fine motor skill tracking", "Sensory profile assessments", "ADL progress monitoring", "Equipment recommendations"],
      icon: "🔧"
    },
    {
      title: "Behavioral Therapists",
      features: ["Behavior data collection", "Intervention tracking", "Outcome measurement", "Goal modification tools"],
      icon: "📊"
    },
    {
      title: "Special Education Teachers",
      features: ["IEP goal tracking", "Classroom data collection", "Student progress monitoring", "Accommodation tracking"],
      icon: "📚"
    }
  ];

  const complianceFeatures = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Full HIPAA compliance with encrypted data storage and secure access controls"
    },
    {
      icon: FileText,
      title: "Professional Reporting",
      description: "Generate reports that meet insurance, school, and clinical documentation requirements"
    },
    {
      icon: Calendar,
      title: "Session Management",
      description: "Track sessions, schedule follow-ups, and coordinate care with families and other professionals"
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
                <Stethoscope className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Therapist Tools</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Professional Tools for Better Outcomes
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Comprehensive platform designed for speech-language pathologists, occupational therapists, 
                behavioral specialists, and educators working with children with special needs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/auth">
                    Start Professional Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg">
                  Schedule Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Professional Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Professional Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Tools designed specifically for professional use in therapeutic and educational settings
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {professionalFeatures.map((feature, index) => (
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

        {/* Specializations */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Tailored for Your Specialty</h2>
                <p className="text-xl text-muted-foreground">
                  Specialized tools and workflows for different therapeutic disciplines
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {specializations.map((spec, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{spec.icon}</span>
                        <CardTitle className="text-lg">{spec.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {spec.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Compliance & Security */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Compliance & Security</h2>
                <p className="text-xl text-muted-foreground">
                  Professional-grade security and compliance features you can trust
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                {complianceFeatures.map((feature, index) => (
                  <Card key={index}>
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Collaboration Features */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Enhanced Family Collaboration</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Bridge the gap between professional sessions and home practice
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 text-left">
                <Card>
                  <CardHeader>
                    <Users className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Family Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Share progress reports with families
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Assign home practice activities
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Coordinate care across team members
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Real-time communication tools
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <BarChart3 className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Data Continuity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Session data flows to home activities
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Home practice data informs sessions
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Comprehensive progress timeline
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Evidence-based treatment planning
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing for Professionals */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Professional Pricing</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Flexible pricing options for individuals, clinics, and schools
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle>Individual</CardTitle>
                    <CardDescription>For individual practitioners</CardDescription>
                    <div className="text-3xl font-bold mt-4">$49/mo</div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>Up to 25 active clients</li>
                      <li>Professional reporting</li>
                      <li>HIPAA compliance</li>
                      <li>Email support</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="ring-2 ring-primary">
                  <CardHeader className="text-center">
                    <Badge className="mb-2">Most Popular</Badge>
                    <CardTitle>Clinic</CardTitle>
                    <CardDescription>For small clinics & practices</CardDescription>
                    <div className="text-3xl font-bold mt-4">$129/mo</div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>Up to 100 active clients</li>
                      <li>Team collaboration tools</li>
                      <li>Advanced analytics</li>
                      <li>Priority support</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle>Enterprise</CardTitle>
                    <CardDescription>For schools & large organizations</CardDescription>
                    <div className="text-3xl font-bold mt-4">Custom</div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>Unlimited clients</li>
                      <li>Custom integrations</li>
                      <li>Dedicated support</li>
                      <li>Training & onboarding</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth">
                  Start Your Professional Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}