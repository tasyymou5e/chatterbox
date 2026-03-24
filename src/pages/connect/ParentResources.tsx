import { useState, useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BookOpen, Video, Download, ExternalLink, ArrowRight, Star,
  Search, Heart, Clock, CheckCircle2, Filter,
  Lightbulb, Users, Brain, Palette, MessageSquare, Shield, Home, Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: "guides" | "videos" | "downloads";
  topic: string;
  type: string;
  duration: string;
  rating: number;
  featured: boolean;
  isNew: boolean;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

const ALL_RESOURCES: Resource[] = [
  // Guides & Articles
  { id: "g1", title: "Complete Guide to Visual Schedules", description: "Learn how to create and implement effective visual schedules for daily routines", category: "guides", topic: "Daily Living", type: "Guide", duration: "15 min read", rating: 4.9, featured: true, isNew: false, difficulty: "Beginner" },
  { id: "g2", title: "Understanding Meltdowns vs. Tantrums", description: "Learn the differences and how to respond appropriately to each", category: "guides", topic: "Behavior", type: "Article", duration: "8 min read", rating: 4.9, featured: true, isNew: false, difficulty: "Beginner" },
  { id: "g3", title: "Building Social Skills Through Play", description: "Structured play activities that develop turn-taking, sharing, and cooperation", category: "guides", topic: "Social Skills", type: "Guide", duration: "12 min read", rating: 4.8, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "g4", title: "Navigating the IEP Process", description: "Step-by-step guide to advocating for your child's educational needs", category: "guides", topic: "Education", type: "Guide", duration: "20 min read", rating: 4.7, featured: false, isNew: false, difficulty: "Intermediate" },
  { id: "g5", title: "Sensory Processing: A Parent's Primer", description: "Understanding hyper- and hypo-sensitivity and creating sensory-friendly environments", category: "guides", topic: "Sensory", type: "Article", duration: "10 min read", rating: 4.8, featured: false, isNew: true, difficulty: "Beginner" },
  { id: "g6", title: "Positive Behavior Support at Home", description: "Evidence-based strategies for reinforcing positive behaviors", category: "guides", topic: "Behavior", type: "Guide", duration: "18 min read", rating: 4.6, featured: false, isNew: false, difficulty: "Intermediate" },
  { id: "g7", title: "AAC Device Selection Guide", description: "Comparing communication devices and apps to find the right fit", category: "guides", topic: "Communication", type: "Guide", duration: "25 min read", rating: 4.9, featured: false, isNew: false, difficulty: "Intermediate" },
  { id: "g8", title: "Transition Planning for Teenagers", description: "Preparing your teen for adulthood, employment, and independent living", category: "guides", topic: "Daily Living", type: "Guide", duration: "22 min read", rating: 4.7, featured: false, isNew: false, difficulty: "Advanced" },
  { id: "g9", title: "Managing Anxiety in Autistic Children", description: "Recognizing anxiety triggers and teaching coping mechanisms", category: "guides", topic: "Behavior", type: "Article", duration: "14 min read", rating: 4.8, featured: false, isNew: true, difficulty: "Intermediate" },
  { id: "g10", title: "Sibling Support Strategies", description: "Helping neurotypical siblings understand and connect with their autistic sibling", category: "guides", topic: "Family", type: "Article", duration: "11 min read", rating: 4.6, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "g11", title: "Sleep Solutions for ASD Families", description: "Practical approaches to establishing healthy sleep routines", category: "guides", topic: "Daily Living", type: "Guide", duration: "16 min read", rating: 4.7, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "g12", title: "Understanding Executive Function", description: "How executive function challenges affect daily life and strategies to help", category: "guides", topic: "Education", type: "Article", duration: "13 min read", rating: 4.5, featured: false, isNew: false, difficulty: "Intermediate" },
  { id: "g13", title: "Dietary Approaches & Nutrition Tips", description: "Addressing picky eating and ensuring balanced nutrition", category: "guides", topic: "Daily Living", type: "Guide", duration: "19 min read", rating: 4.4, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "g14", title: "Self-Care for Autism Parents", description: "Preventing burnout and maintaining your own well-being", category: "guides", topic: "Family", type: "Article", duration: "9 min read", rating: 4.9, featured: false, isNew: true, difficulty: "Beginner" },
  { id: "g15", title: "Inclusive Birthday Party Planning", description: "Creating celebrations that are fun and accessible for everyone", category: "guides", topic: "Social Skills", type: "Guide", duration: "7 min read", rating: 4.3, featured: false, isNew: false, difficulty: "Beginner" },

  // Video Tutorials
  { id: "v1", title: "Communication Strategies Video Series", description: "5-part video series covering AAC, PECS, and other communication methods", category: "videos", topic: "Communication", type: "Video Series", duration: "2.5 hours", rating: 4.8, featured: true, isNew: false, difficulty: "Beginner" },
  { id: "v2", title: "ABA Techniques for Parents", description: "Learn foundational Applied Behavior Analysis techniques to use at home", category: "videos", topic: "Behavior", type: "Video Course", duration: "3 hours", rating: 4.7, featured: false, isNew: false, difficulty: "Intermediate" },
  { id: "v3", title: "Sensory Room Setup Tutorial", description: "How to create an effective sensory space on any budget", category: "videos", topic: "Sensory", type: "Tutorial", duration: "45 min", rating: 4.6, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "v4", title: "Social Stories Masterclass", description: "Creating personalized social stories that resonate with your child", category: "videos", topic: "Social Skills", type: "Masterclass", duration: "1.5 hours", rating: 4.8, featured: false, isNew: true, difficulty: "Intermediate" },
  { id: "v5", title: "Calm-Down Techniques Demo", description: "Visual demonstrations of breathing, grounding, and regulation techniques", category: "videos", topic: "Behavior", type: "Tutorial", duration: "30 min", rating: 4.9, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "v6", title: "Fine Motor Skills Activities", description: "Fun exercises to develop handwriting, buttoning, and coordination", category: "videos", topic: "Daily Living", type: "Tutorial", duration: "40 min", rating: 4.5, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "v7", title: "Parent Advocacy Workshop", description: "How to effectively advocate for your child at school and in the community", category: "videos", topic: "Education", type: "Workshop", duration: "2 hours", rating: 4.7, featured: false, isNew: false, difficulty: "Advanced" },
  { id: "v8", title: "Structured Teaching with TEACCH", description: "Implementing TEACCH principles for visual structure at home", category: "videos", topic: "Education", type: "Video Course", duration: "1.5 hours", rating: 4.6, featured: false, isNew: false, difficulty: "Intermediate" },
  { id: "v9", title: "Yoga & Movement for Kids", description: "Gentle yoga sequences designed for sensory regulation", category: "videos", topic: "Sensory", type: "Tutorial", duration: "25 min", rating: 4.4, featured: false, isNew: true, difficulty: "Beginner" },
  { id: "v10", title: "Family Game Night Ideas", description: "Adapted games that the whole family can enjoy together", category: "videos", topic: "Family", type: "Tutorial", duration: "35 min", rating: 4.5, featured: false, isNew: false, difficulty: "Beginner" },

  // Downloadables
  { id: "d1", title: "Sensory Activities Workbook", description: "50+ sensory activities you can do at home with everyday items", category: "downloads", topic: "Sensory", type: "Workbook", duration: "Downloadable PDF", rating: 4.7, featured: true, isNew: false, difficulty: "Beginner" },
  { id: "d2", title: "Visual Schedule Template Pack", description: "Customizable daily, weekly, and activity schedule templates", category: "downloads", topic: "Daily Living", type: "Templates", duration: "12 printable pages", rating: 4.8, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "d3", title: "Emotion Flashcards Set", description: "48 illustrated cards for recognizing and naming emotions", category: "downloads", topic: "Social Skills", type: "Flashcards", duration: "Printable PDF", rating: 4.6, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "d4", title: "Behavior Tracking Sheets", description: "ABC data collection forms and behavior tracking templates", category: "downloads", topic: "Behavior", type: "Worksheets", duration: "8 printable pages", rating: 4.5, featured: false, isNew: true, difficulty: "Intermediate" },
  { id: "d5", title: "IEP Goal Bank", description: "200+ sample IEP goals organized by domain and skill area", category: "downloads", topic: "Education", type: "Reference", duration: "Downloadable PDF", rating: 4.9, featured: false, isNew: false, difficulty: "Advanced" },
  { id: "d6", title: "Social Story Starter Kit", description: "10 customizable social story templates for common scenarios", category: "downloads", topic: "Social Skills", type: "Templates", duration: "15 printable pages", rating: 4.7, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "d7", title: "Chore Chart with Visual Supports", description: "Step-by-step chore breakdowns with picture cues", category: "downloads", topic: "Daily Living", type: "Charts", duration: "6 printable pages", rating: 4.4, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "d8", title: "Communication Board Printables", description: "Ready-to-use low-tech communication boards for various settings", category: "downloads", topic: "Communication", type: "Printables", duration: "20 printable pages", rating: 4.8, featured: false, isNew: false, difficulty: "Beginner" },
  { id: "d9", title: "Sensory Diet Planning Worksheet", description: "Create a personalized sensory diet with activity suggestions", category: "downloads", topic: "Sensory", type: "Worksheet", duration: "Downloadable PDF", rating: 4.6, featured: false, isNew: true, difficulty: "Intermediate" },
  { id: "d10", title: "Parent Self-Assessment Checklist", description: "Evaluate your family's current strategies and identify growth areas", category: "downloads", topic: "Family", type: "Checklist", duration: "4 printable pages", rating: 4.3, featured: false, isNew: false, difficulty: "Beginner" },
];

const TOPICS = [
  { label: "All Topics", value: "all", icon: Sparkles },
  { label: "Behavior", value: "Behavior", icon: Shield },
  { label: "Communication", value: "Communication", icon: MessageSquare },
  { label: "Sensory", value: "Sensory", icon: Palette },
  { label: "Social Skills", value: "Social Skills", icon: Users },
  { label: "Daily Living", value: "Daily Living", icon: Home },
  { label: "Education", value: "Education", icon: Brain },
  { label: "Family", value: "Family", icon: Heart },
];

const CATEGORY_META = [
  { key: "guides" as const, icon: BookOpen, title: "Guides & Articles", description: "In-depth articles on development, communication, and family strategies", accent: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  { key: "videos" as const, icon: Video, title: "Video Tutorials", description: "Step-by-step videos showing techniques and tool usage", accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "downloads" as const, icon: Download, title: "Downloadables", description: "Printable resources, checklists, and activity sheets", accent: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
];

export default function ParentResources() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [savedResources, setSavedResources] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) => {
    setSavedResources(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: "Removed from saved", description: "Resource removed from your saved list." });
      } else {
        next.add(id);
        toast({ title: "Saved!", description: "Resource added to your saved list." });
      }
      return next;
    });
  };

  const categoryCounts = useMemo(() => ({
    all: ALL_RESOURCES.length,
    guides: ALL_RESOURCES.filter(r => r.category === "guides").length,
    videos: ALL_RESOURCES.filter(r => r.category === "videos").length,
    downloads: ALL_RESOURCES.filter(r => r.category === "downloads").length,
  }), []);

  const filtered = useMemo(() => {
    return ALL_RESOURCES.filter(r => {
      if (activeTab !== "all" && r.category !== activeTab) return false;
      if (selectedTopic !== "all" && r.topic !== selectedTopic) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.topic.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeTab, selectedTopic, searchQuery]);

  const featuredResources = useMemo(() => ALL_RESOURCES.filter(r => r.featured), []);

  const difficultyColor = (d: string) => {
    if (d === "Beginner") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (d === "Intermediate") return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  };

  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {resource.featured && <Badge className="bg-primary text-primary-foreground text-xs">Featured</Badge>}
              {resource.isNew && <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400">New</Badge>}
              <Badge variant="outline" className={`text-xs ${difficultyColor(resource.difficulty)}`}>{resource.difficulty}</Badge>
            </div>
            <CardTitle className="text-base leading-snug mb-1.5">{resource.title}</CardTitle>
            <CardDescription className="text-sm line-clamp-2">{resource.description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={(e) => { e.stopPropagation(); toggleSave(resource.id); }}
          >
            <Heart className={`h-4 w-4 ${savedResources.has(resource.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {resource.duration}
            </span>
          </div>
          <span className="flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {resource.rating}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={() => navigate('/auth')}
        >
          Access Resource
          <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="pt-20">
        {/* Hero */}
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
                <Button variant="outline" size="lg" onClick={() => setActiveTab("all")}>
                  <a href="#library">Browse Free Resources</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Category Cards */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Resource Categories</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose from various formats to match your learning style and needs
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {CATEGORY_META.map((cat) => {
                const count = categoryCounts[cat.key];
                return (
                  <Card
                    key={cat.key}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
                    onClick={() => { setActiveTab(cat.key); document.getElementById("library")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${cat.bg}`}>
                        <cat.icon className={`h-6 w-6 ${cat.accent}`} />
                      </div>
                      <CardTitle>{cat.title}</CardTitle>
                      <CardDescription>{cat.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{count} resources</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Resources */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Featured Resources</h2>
                <p className="text-xl text-muted-foreground">Our most popular and highly-rated resources</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {featuredResources.map((resource) => (
                  <Card key={resource.id} className="ring-2 ring-primary/20 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
                    <CardHeader className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                        <Badge variant="outline" className={`text-xs ${difficultyColor(resource.difficulty)}`}>{resource.difficulty}</Badge>
                      </div>
                      <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{resource.type}</Badge>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{resource.duration}</span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{resource.rating}</span>
                        </span>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                        Access Resource
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Full Resource Library */}
        <section id="library" className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Browse All Resources</h2>
                <p className="text-xl text-muted-foreground">Search, filter, and discover the right resources for your family</p>
              </div>

              {/* Search & Filters */}
              <div className="mb-8 space-y-4">
                <div className="relative max-w-lg mx-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources by title, topic, or keyword…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Topic filter chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {TOPICS.map(t => (
                    <Button
                      key={t.value}
                      variant={selectedTopic === t.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTopic(t.value)}
                      className="gap-1.5"
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 bg-transparent p-0">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    All ({categoryCounts.all})
                  </TabsTrigger>
                  {CATEGORY_META.map(cat => (
                    <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <cat.icon className="h-3.5 w-3.5" />
                      {cat.title} ({categoryCounts[cat.key]})
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {filtered.length === 0 ? (
                    <div className="text-center py-16">
                      <Filter className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No resources found</h3>
                      <p className="text-muted-foreground">Try adjusting your search or filters</p>
                      <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setSelectedTopic("all"); setActiveTab("all"); }}>
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">{filtered.length} resource{filtered.length !== 1 ? "s" : ""} found</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(resource => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Expert Tips */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Expert Tips</h2>
                <p className="text-xl text-muted-foreground">Quick insights from professionals in the field</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { tip: "Start with small, achievable goals when implementing new strategies", expert: "Dr. Sarah Johnson", role: "Developmental Pediatrician", icon: Lightbulb },
                  { tip: "Consistency across all environments is key to success", expert: "Maria Rodriguez", role: "Speech-Language Pathologist", icon: CheckCircle2 },
                  { tip: "Celebrate small victories — they build confidence for bigger achievements", expert: "Dr. Michael Chen", role: "Behavioral Therapist", icon: Sparkles },
                ].map((item, index) => (
                  <Card key={index} className="text-center">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <blockquote className="text-sm font-medium mb-3 leading-relaxed">"{item.tip}"</blockquote>
                      <p className="text-sm font-semibold">{item.expert}</p>
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Complete Resource Library</h2>
              <p className="text-xl text-muted-foreground mb-8">Get unlimited access to our growing library of expert-created resources</p>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{ALL_RESOURCES.length}+</div>
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
