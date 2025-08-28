import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Home, 
  UserCheck, 
  Activity,
  TrendingUp,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalFamilies: number;
  totalUsers: number;
  totalParents: number;
  totalChildren: number;
  recentSignups: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalFamilies: 0,
    totalUsers: 0,
    totalParents: 0,
    totalChildren: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Get total families
        const { count: familiesCount } = await supabase
          .from('families')
          .select('*', { count: 'exact', head: true });

        // Get total users
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get parents count
        const { count: parentsCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'parent');

        // Get children count
        const { count: childrenCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'child');

        // Get recent signups (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: recentSignupsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        setStats({
          totalFamilies: familiesCount || 0,
          totalUsers: usersCount || 0,
          totalParents: parentsCount || 0,
          totalChildren: childrenCount || 0,
          recentSignups: recentSignupsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: number; 
    description: string; 
    icon: React.ElementType; 
    trend?: string;
  }) => (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-blue-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {loading ? '...' : value.toLocaleString()}
        </div>
        <p className="text-xs text-gray-400">
          {description}
        </p>
        {trend && (
          <p className="text-xs text-green-400 mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-400">
          Monitor system activity and manage Spectrum Harmony platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Families"
          value={stats.totalFamilies}
          description="Registered family groups"
          icon={Home}
          trend={`+${stats.recentSignups} this week`}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="All registered users"
          icon={Users}
        />
        <StatCard
          title="Parents"
          value={stats.totalParents}
          description="Users with parent role"
          icon={UserCheck}
        />
        <StatCard
          title="Children"
          value={stats.totalChildren}
          description="Users with child role"
          icon={Activity}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-gray-400">
              Latest platform activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-300">
                  {stats.recentSignups} new signups this week
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-gray-300">
                  {stats.totalFamilies} active families
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                <span className="text-gray-300">
                  System running smoothly
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-400" />
              System Status
            </CardTitle>
            <CardDescription className="text-gray-400">
              Platform health overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Database</span>
                <span className="text-green-400 text-sm font-medium">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Authentication</span>
                <span className="text-green-400 text-sm font-medium">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Storage</span>
                <span className="text-green-400 text-sm font-medium">Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full text-left text-sm text-blue-400 hover:text-blue-300 p-2 rounded hover:bg-gray-700 transition-colors">
                View All Families →
              </button>
              <button className="w-full text-left text-sm text-blue-400 hover:text-blue-300 p-2 rounded hover:bg-gray-700 transition-colors">
                Manage Users →
              </button>
              <button className="w-full text-left text-sm text-blue-400 hover:text-blue-300 p-2 rounded hover:bg-gray-700 transition-colors">
                Generate Reports →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}