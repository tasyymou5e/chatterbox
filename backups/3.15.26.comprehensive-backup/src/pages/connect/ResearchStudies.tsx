import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Microscope, Users, FileText, CheckCircle, ExternalLink, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function ResearchStudies() {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    toast({
      title: "Research Information",
      description: "For more details about our research program, please contact research@chatterbox.app"
    });
  };

  const currentStudies = [
    {
      title: "Effectiveness of Visual Communication Apps in Early Intervention",
      institution: "University Research Center",
      duration: "12 months",
      participants: "Looking for 50 families",
      status: "Recruiting",
      description: "Studying how visual communication apps impact language development in children aged 2-5",
      eligibility: ["Ages 2-5", "Non-verbal or limited verbal", "No prior AAC experience", "English-speaking family"],
      compensation: "Free app access + $100 gift card"
    },
    {
      title: "Family-Centered Digital Interventions for Autism",
      institution: "Children's Hospital Research Institute",
      duration: "6 months",
      participants: "30 families enrolled",
      status: "Active",
      description: "Examining how family involvement in digital interventions affects outcomes for children with autism",
      eligibility: ["Autism diagnosis", "Ages 4-12", "Family commitment to participation", "Weekly availability"],
      compensation: "Free premium features + research findings"
    },
    {
      title: "Long-term Outcomes of Educational Game Interventions",
      institution: "National Development Institute",
      duration: "24 months",
      participants: "100 families needed",
      status: "Starting Soon",
      description: "Following children's progress over 2 years to understand long-term benefits of educational games",
      eligibility: ["Ages 3-10", "Developmental delays", "Consistent access to technology", "Long-term commitment"],
      compensation: "Free app access + quarterly reports"
    }
  ];

  const completedStudies = [
    {
      title: "Digital Communication Tools Reduce Behavioral Challenges",
      year: "2024",
      findings: "73% reduction in communication-related behavioral episodes when using AAC apps",
      participants: "150 families",
      published: "Journal of Developmental Pediatrics"
    },
    {
      title: "Parent Engagement Through Digital Platforms",
      year: "2023",
      findings: "Parents using coordinated care platforms showed 40% higher engagement in therapy",
      participants: "89 families",
      published: "Early Intervention Research Quarterly"
    },
    {
      title: "Educational Games and Cognitive Development",
      year: "2023",
      findings: "Children using targeted educational games showed 25% faster skill acquisition",
      participants: "200 children",
      published: "Child Development & Technology Review"
    }
  ];

  const researchAreas = [
    {
      icon: Users,
      title: "Communication Development",
      description: "How digital tools support language and communication skills",
      studies: 8
    },
    {
      icon: FileText,
      title: "Family Coordination",
      description: "Impact of digital platforms on family and professional collaboration",
      studies: 5
    },
    {
      icon: CheckCircle,
      title: "Behavioral Outcomes",
      description: "Effects of educational interventions on behavior and social skills",
      studies: 12
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
                <Microscope className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">Research & Studies</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Advancing Science Together
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Participate in groundbreaking research that helps improve outcomes for all children 
                with special needs while contributing to the scientific understanding of development.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/auth">
                    Join a Study
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleLearnMore}
                >
                  Learn More About Research
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Current Studies */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Current Studies</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Participate in ongoing research studies and help shape the future of special needs support
              </p>
            </div>
            
            <div className="space-y-8">
              {currentStudies.map((study, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            study.status === 'Recruiting' ? 'default' : 
                            study.status === 'Active' ? 'secondary' : 'outline'
                          }>
                            {study.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{study.duration}</span>
                        </div>
                        <CardTitle className="text-xl mb-2">{study.title}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          {study.institution} • {study.participants}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-6">{study.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Eligibility Requirements</h4>
                        <ul className="space-y-2">
                          {study.eligibility.map((req, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3">Participation Benefits</h4>
                        <p className="text-sm text-muted-foreground mb-4">{study.compensation}</p>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate('/auth')}
                        >
                          {study.status === 'Recruiting' ? 'Apply to Participate' : 'Learn More'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Research Areas */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Research Areas</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our research focuses on key areas that impact children's development and family wellbeing
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {researchAreas.map((area, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <area.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{area.title}</CardTitle>
                    <CardDescription>{area.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{area.studies} active studies</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Published Research */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Published Research</h2>
                <p className="text-xl text-muted-foreground">
                  See the impact of previous studies and their contributions to the field
                </p>
              </div>
              
              <div className="space-y-6">
                {completedStudies.map((study, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{study.title}</h3>
                            <Badge variant="outline">{study.year}</Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{study.findings}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{study.participants}</span>
                            <span>•</span>
                            <span>Published in {study.published}</span>
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Research Ethics & Privacy */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Research Ethics & Privacy</CardTitle>
                  <CardDescription>
                    Your family's privacy and wellbeing are our top priorities in all research activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-semibold mb-4">Ethical Standards</h3>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>All studies approved by Institutional Review Boards (IRB)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Voluntary participation with right to withdraw anytime</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Full informed consent process for all participants</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Regular monitoring of participant wellbeing</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-4">Privacy Protection</h3>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>All data de-identified and anonymized</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Secure, encrypted data storage and transmission</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Limited access to research data on need-to-know basis</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Right to request data deletion at any time</span>
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
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join families around the world contributing to research that helps all children with special needs
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link to="/auth">
                Explore Participation Opportunities
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}