import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { 
  Gamepad2,
  LayoutDashboard, 
  LogOut, 
  Menu,
  X,
  User,
  Volume2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  className?: string;
}

interface FeatureItem {
  title: string;
  href: string;
  highlight?: boolean;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const featuresItems: FeatureItem[] = [
    { title: "Educational Games", href: "/features/educational-games" },
    { title: "Communication Support", href: "/features/communication-support" },
    { title: "Progress Tracking", href: "/features/progress-tracking" },
    { title: "Family Management", href: "/features/family-management" },
    { title: "AAC Demo", href: "/aac-demo", highlight: true },
  ];

  const supportItems = [
    { title: "Help Center", href: "/support/help-center" },
    { title: "Contact Us", href: "/support/contact" },
    { title: "Privacy Policy", href: "/support/privacy-policy" },
    { title: "Terms of Service", href: "/support/terms" },
  ];

  const connectItems = [
    { title: "Community Forum", href: "/connect/community-forum" },
    { title: "Parent Resources", href: "/connect/parent-resources" },
    { title: "Therapist Tools", href: "/connect/therapist-tools" },
    { title: "Research & Studies", href: "/connect/research-studies" },
  ];

  const authenticatedItems = user ? [
    { title: "Parent Dashboard", href: "/parent-dashboard", icon: LayoutDashboard },
  ] : [];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border",
      className
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/90 rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CB</span>
            </div>
            <span className="font-bold text-xl text-foreground">Chatterbox</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4">
                      {featuresItems.map((item) => (
                        <Link
                          key={item.title}
                          to={item.href}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                            item.highlight && "bg-primary/10 border border-primary/20"
                          )}
                        >
                          <div className="text-sm font-medium leading-none flex items-center gap-2">
                            {item.highlight && <Volume2 className="h-4 w-4 text-primary" />}
                            {item.title}
                            {item.highlight && (
                              <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">New</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Support</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4">
                      {supportItems.map((item) => (
                        <Link
                          key={item.title}
                          to={item.href}
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">{item.title}</div>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Connect</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4">
                      {connectItems.map((item) => (
                        <Link
                          key={item.title}
                          to={item.href}
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="text-sm font-medium leading-none">{item.title}</div>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link to="/games" className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4" />
                      Games
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                {authenticatedItems.map((item) => (
                  <NavigationMenuItem key={item.title}>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                      <Link to={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="max-w-32 truncate">
                    {user.email}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90"
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border">
            <nav className="flex flex-col space-y-2 pt-4">
              {/* Features Section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Features
              </div>
              {featuresItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors ml-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
              
              {/* Support Section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                Support
              </div>
              {supportItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors ml-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
              
              {/* Connect Section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                Connect
              </div>
              {connectItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors ml-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
              
              {/* Games Link */}
              <Link
                to="/games"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors mt-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Gamepad2 className="h-4 w-4" />
                Games
              </Link>
              
              {/* Authenticated Items */}
              {authenticatedItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}

              <div className="border-t border-border pt-2 mt-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigate('/auth');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Login
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90"
                      onClick={() => {
                        navigate('/auth');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}