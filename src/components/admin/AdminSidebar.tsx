import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  Users,
  BarChart3,
  Settings,
  Shield,
  Activity,
  Brain,
  TrendingUp,
  Wrench,
  ShieldCheck,
  HeartPulse,
  BookOpen,
  Bug,
  FlaskConical,
  Gamepad2,
  ChevronRight,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/admin/dashboard', icon: Home },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Families', url: '/admin/families', icon: Users },
      { title: 'Users', url: '/admin/users', icon: Users },
      { title: 'Content', url: '/admin/content', icon: Settings },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { title: 'Reports', url: '/admin/reports', icon: BarChart3 },
      { title: 'Kids Catalog', url: '/admin/kids-catalog', icon: Gamepad2 },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { title: 'System Monitoring', url: '/admin/system-monitoring', icon: Activity },
      { title: 'LLM Monitor', url: '/admin/llm-monitoring', icon: Brain },
      { title: 'Uptime Report', url: '/admin/uptime-report', icon: TrendingUp },
      { title: 'Logs Triage', url: '/admin/logs-triage', icon: Bug },
      { title: 'Test Results', url: '/admin/test-results', icon: FlaskConical },
    ],
  },
  {
    label: 'Security & Health',
    items: [
      { title: 'Security Center', url: '/admin/security-center', icon: Shield },
      { title: 'Integrity', url: '/admin/integrity', icon: ShieldCheck },
      { title: 'Data Health', url: '/admin/data-health', icon: HeartPulse },
      { title: 'Auto-Repair', url: '/admin/auto-repair-logs', icon: Wrench },
    ],
  },
  {
    label: 'Resources',
    items: [
      { title: 'Architecture Ebook', url: '/admin/architecture-ebook', icon: BookOpen },
    ],
  },
];

function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => pathname === item.url);
}

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-gray-700 bg-gray-800">
      <SidebarContent className="bg-gray-800">
        {navGroups.map((group) => {
          const active = isGroupActive(group, location.pathname);

          return (
            <Collapsible key={group.label} defaultOpen={active} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-gray-400 hover:text-gray-200">
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-gray-300 hover:text-gray-200">
                    <span>{group.label}</span>
                    {!collapsed && (
                      <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.url;
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.title}
                            >
                              <Link
                                to={item.url}
                                className={
                                  isActive
                                    ? 'text-white bg-gray-700'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                                }
                              >
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
