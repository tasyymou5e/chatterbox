import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Book, MessageCircle, Video, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics and set up your account",
      articles: 12
    },
    {
      icon: MessageCircle,
      title: "Communication Tools",
      description: "How to use our communication features effectively",
      articles: 8
    },
    {
      icon: Video,
      title: "Educational Games",
      description: "Make the most of our learning activities",
      articles: 15
    }
  ];

  const faqs = [
    {
      question: "How do I create my first child account?",
      answer: "Navigate to your Parent Dashboard and click 'Add Child Account'. Fill in your child's information, and we'll guide you through the setup process including communication preferences and initial assessments."
    },
    {
      question: "Is my child's data secure and private?",
      answer: "Absolutely. We use bank-level encryption and are fully COPPA compliant. Your child's data is never shared with third parties, and you have complete control over who can access your family's information."
    },
    {
      question: "How do progress reports work?",
      answer: "Progress reports are generated automatically based on your child's activities. You can view real-time progress in your dashboard, and we send detailed weekly and monthly reports to your email."
    },
    {
      question: "Can therapists and teachers access the platform?",
      answer: "Yes! You can invite professionals to join your child's support team with specific permission levels. They can view progress, add observations, and coordinate with you through our secure platform."
    },
    {
      question: "What devices are supported?",
      answer: "Our platform works on all modern browsers, tablets, and smartphones. We also integrate with popular AAC devices and support various accessibility features for different needs."
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can cancel your subscription at any time from your Account Settings. Your access will continue until the end of your billing period, and we'll help you export your data if needed."
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
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Help Center
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Find answers, learn best practices, and get the most out of your experience
              </p>
              
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for help articles..."
                  className="pl-10 text-lg py-6"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Find help articles organized by topic
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {categories.map((category, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <category.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {category.articles} articles
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-xl text-muted-foreground">
                  Quick answers to the most common questions
                </p>
              </div>
              
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="bg-background rounded-lg px-6">
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Our support team is here to help you every step of the way
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Button asChild variant="outline" size="lg" className="h-16 text-lg">
                  <Link to="/support/contact">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Contact Support
                  </Link>
                </Button>
                
                <Button asChild size="lg" className="h-16 text-lg">
                  <Link to="/connect/community-forum">
                    Ask the Community
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}