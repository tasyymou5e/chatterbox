import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { PortalSelection } from "@/components/PortalSelection";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Index = () => {
  const [showPortals, setShowPortals] = useState(false);
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

  const scrollToPortals = () => {
    if (settings.parent_signup_enabled) {
      navigate('/auth');
    } else {
      // Still allow navigation but Auth page will handle the disabled state
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero Section */}
      <section className="pt-16">
        <Hero onChoosePortal={scrollToPortals} />
        
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
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/90 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CB</span>
              </div>
              <span className="font-bold text-xl">Chatterbox</span>
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
            <p>&copy; 2024 Chatterbox. Built with ❤️ for autistic children and their families.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;