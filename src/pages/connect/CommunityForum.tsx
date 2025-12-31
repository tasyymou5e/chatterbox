import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Search, Heart, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function CommunityForum() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon!",
      description: `${feature} will be available soon. Sign up to be notified!`
    });
  };

  const forumCategories = [
    {
      icon: MessageSquare,
      title: "General Discussion",
      description: "Share experiences and connect with other families",
      posts: 156,
      lastActive: "2 hours ago"
    },
    {
      icon: Heart,
      title: "Success Stories",
      description: "Celebrate milestones and achievements",
      posts: 89,
      lastActive: "5 hours ago"
    },
    {
      icon: TrendingUp,
      title: "Tips & Strategies",
      description: "Share what works and learn from others",
      posts: 203,
      lastActive: "1 hour ago"
    }
  ];

  const recentPosts = [
    {
      title: "How we helped our daughter with communication using visual schedules",
      author: "Sarah M.",
      category: "Success Stories",
      replies: 12,
      likes: 24,
      timeAgo: "3 hours ago"
    },
    {
      title: "Looking for recommendations on AAC devices",
      author: "Mike T.",
      category: "General Discussion",
      replies: 8,
      likes: 15,
      timeAgo: "6 hours ago"
    },
    {
      title: "Bedtime routine strategies that actually work",
      author: "Jennifer L.",
      category: "Tips & Strategies",
      replies: 15,
      likes: 31,
      timeAgo: "1 day ago"
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
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Community Forum</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Connect with Families Like Yours
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Join a supportive community where families share experiences, celebrate successes, 
                and learn from each other's journeys.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/auth">
                    Join the Community
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => handleComingSoon("Guest browsing")}
                >
                  Browse as Guest
                </Button>
              </div>
              
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search discussions..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Forum Categories */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Forum Categories</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Find discussions that matter to you and your family's journey
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {forumCategories.map((category, index) => (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleComingSoon(category.title)}
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <category.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{category.posts} posts</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {category.lastActive}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Posts */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Recent Discussions</h2>
                <p className="text-xl text-muted-foreground">
                  See what the community is talking about
                </p>
              </div>
              
              <div className="space-y-4">
                {recentPosts.map((post, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{post.category}</Badge>
                            <span className="text-sm text-muted-foreground">{post.timeAgo}</span>
                          </div>
                          <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            by {post.author}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {post.replies} replies
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              {post.likes} likes
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate('/auth')}
                >
                  View All Discussions
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Community Guidelines</CardTitle>
                  <CardDescription>
                    Help us maintain a supportive and respectful environment for all families
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3 text-green-700">Do:</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                          Be respectful and supportive of all families
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                          Share your experiences and what works for your family
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                          Ask questions and seek advice from the community
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                          Celebrate successes and milestones together
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3 text-red-700">Don't:</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
                          Share personal medical information about your child
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
                          Give or seek professional medical advice
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
                          Use offensive language or personal attacks
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
                          Promote products or services for personal gain
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Connect?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of families supporting each other on this journey
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link to="/auth">
                Join Our Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}