import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { PortalSelection } from "@/components/PortalSelection";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Index = () => {
  const [showPortals, setShowPortals] = useState(false);
  const navigate = useNavigate();
  const { settings, loading } = useSiteSettings();

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
        <Hero onChoosePortal={scrollToPortals} settings={settings} loading={loading} />
        
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
                Empowering children with autism through technology, education, and family connection.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><Link to="/features/educational-games" className="hover:text-white transition-colors">Educational Games</Link></li>
                <li><Link to="/features/communication-support" className="hover:text-white transition-colors">Communication Support</Link></li>
                <li><Link to="/features/progress-tracking" className="hover:text-white transition-colors">Progress Tracking</Link></li>
                <li><Link to="/features/family-management" className="hover:text-white transition-colors">Family Management</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><Link to="/support/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/support/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/support/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/support/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><Link to="/connect/community-forum" className="hover:text-white transition-colors">Community Forum</Link></li>
                <li><Link to="/connect/parent-resources" className="hover:text-white transition-colors">Parent Resources</Link></li>
                <li><Link to="/connect/therapist-tools" className="hover:text-white transition-colors">Therapist Tools</Link></li>
                <li><Link to="/connect/research-studies" className="hover:text-white transition-colors">Research & Studies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60">
            <p>&copy; 2024 Chatterbox. Built with ❤️ for children with autism and their families.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;