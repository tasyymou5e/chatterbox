import { useState } from "react";
import { Hero } from "@/components/Hero";
import { PortalSelection } from "@/components/PortalSelection";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

const Index = () => {
  const [showPortals, setShowPortals] = useState(false);

  const scrollToPortals = () => {
    setShowPortals(true);
    // Smooth scroll to portals section
    setTimeout(() => {
      document.getElementById('portals')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 100);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AC</span>
            </div>
            <span className="font-bold text-xl text-foreground">AutismCare</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={scrollToPortals}
            >
              Login
            </Button>
            <Button 
              size="sm"
              className="bg-gradient-primary text-white hover:opacity-90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16">
        <Hero />
        
        {/* Scroll indicator */}
        <div className="text-center pb-8">
          <Button
            onClick={scrollToPortals}
            variant="ghost"
            size="lg"
            className="text-white hover:bg-white/10 animate-bounce"
          >
            <ArrowDown className="w-6 h-6" />
          </Button>
        </div>
      </section>

      {/* Portal Selection Section */}
      {showPortals && (
        <section id="portals" className="bg-background">
          <PortalSelection />
        </section>
      )}

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AC</span>
                </div>
                <span className="font-bold text-xl">AutismCare</span>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Empowering autistic children through technology, education, and family connection.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li>Educational Games</li>
                <li>Communication Support</li>
                <li>Progress Tracking</li>
                <li>Family Management</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li>Community Forum</li>
                <li>Parent Resources</li>
                <li>Therapist Tools</li>
                <li>Research & Studies</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60">
            <p>&copy; 2024 AutismCare. Built with ❤️ for autistic children and their families.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;