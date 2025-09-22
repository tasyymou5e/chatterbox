import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, Download, ExternalLink, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function ParentResources() {
  const resourceCategories = [
    {
      icon: BookOpen,
      title: "Guides & Articles",
      description: "In-depth articles on development, communication, and family strategies",
      count: 45,
      color: "bg-blue-500/10 text-blue-700"
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Step-by-step videos showing techniques and tool usage",
      count: 28,
      color: "bg-green-500/10 text-green-700"
    },
    {
      icon: Download,
      title: "Downloadables",
      description: "Printable resources, checklists, and activity sheets",
      count: 32,
      color: "bg-purple-500/10 text-purple-700"
    }
  ];

  const featuredResources = [
    {
      title: "Complete Guide to Visual Schedules",
      description: "Learn how to create and implement effective visual schedules for daily routines",
      type: "Guide",
      duration: "15 min read",
      rating: 4.9,
      featured: true
    },
    {
      title: "Communication Strategies Video Series",
      description: "5-part video series covering AAC, PECS, and other communication methods",
      type: "Video Series",
      duration: "2.5 hours",
      rating: 4.8,
      featured: true
    },
    {
      title: "Sensory Activities Workbook",
      description: "50+ sensory activities you can do at home with everyday items",
      type: "Workbook",
      duration: "Downloadable PDF",
      rating: 4.7,
      featured: false
    },
    {
      title: "Understanding Meltdowns vs. Tantrums",
      description: "Learn the differences and how to respond appropriately to each",
      type: "Article",
      duration: "8 min read",
      rating: 4.9,
      featured: false
    }
  ];

  const expertTips = [
    {
      tip: "Start with small, achievable goals when implementing new strategies",
      expert: "Dr. Sarah Johnson, Developmental Pediatrician"
    },
    {
      tip: "Consistency across all environments is key to success",
      expert: "Maria Rodriguez, Speech-Language Pathologist"
    },
    {
      tip: "Celebrate small victories - they build confidence for bigger achievements",
      expert: "Dr. Michael Chen, Behavioral Therapist"
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
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Parent Resources</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Empowering Parents with Knowledge
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Access expert-created guides, videos, and tools designed to help you support 
                your child's development and navigate your family's unique journey.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/auth">
                    Access All Resources
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg">
                  Browse Free Resources
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Resource Categories */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Resource Categories</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose from various formats to match your learning style and needs
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {resourceCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${category.color}`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{category.count} resources</Badge>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Resources */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Featured Resources</h2>
                <p className="text-xl text-muted-foreground">
                  Our most popular and highly-rated resources
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {featuredResources.map((resource, index) => (
                  <Card key={index} className={`hover:shadow-lg transition-shadow cursor-pointer ${resource.featured ? 'ring-2 ring-primary/20' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {resource.featured && (
                            <Badge className="mb-2">Featured</Badge>
                          )}
                          <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                          <CardDescription>{resource.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{resource.type}</Badge>
                          <span>{resource.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{resource.rating}</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        Access Resource
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Expert Tips */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Expert Tips</h2>
                <p className="text-xl text-muted-foreground">
                  Quick insights from professionals in the field
                </p>
              </div>
              
              <div className="space-y-6">
                {expertTips.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Star className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <blockquote className="text-lg font-medium mb-2">
                            "{item.tip}"
                          </blockquote>
                          <cite className="text-sm text-muted-foreground">
                            — {item.expert}
                          </cite>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Resource Library Preview */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Complete Resource Library</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Get unlimited access to our growing library of expert-created resources
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">100+</div>
                  <p className="text-muted-foreground">Expert Resources</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">Weekly</div>
                  <p className="text-muted-foreground">New Content</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                  <p className="text-muted-foreground">Access</p>
                </div>
              </div>
              
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth">
                  Unlock All Resources
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