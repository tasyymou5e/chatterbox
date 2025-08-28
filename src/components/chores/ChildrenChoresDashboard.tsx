import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useChoreManagement } from '@/hooks/useChoreManagement';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Play,
  CheckCircle,
  Star,
  Trophy,
  Target,
  Clock,
  Gift,
  Heart,
  Zap,
  Medal,
  Crown,
  Sparkles
} from 'lucide-react';

interface ChildrenChoresDashboardProps {
  familyId: string;
}

export const ChildrenChoresDashboard = ({ familyId }: ChildrenChoresDashboardProps) => {
  const { user } = useAuth();
  const { assignments, updateAssignmentStatus, loading: choreLoading } = useChoreManagement(familyId);
  const { 
    userLevel, 
    userPoints, 
    userAchievements, 
    wishlistItems,
    dailyStreaks,
    leaderboard,
    loading: gamificationLoading,
    checkAchievements 
  } = useGamification(familyId);

  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Filter assignments for current user
  const myAssignments = assignments.filter(a => a.assigned_to === user?.id);
  const todaysAssignments = myAssignments.filter(a => {
    if (!a.due_date) return true;
    return new Date(a.due_date).toDateString() === new Date().toDateString();
  });

  const completedToday = todaysAssignments.filter(a => 
    a.status === 'completed' || a.status === 'verified'
  ).length;

  const availablePoints = todaysAssignments.reduce((sum, a) => {
    if (a.status === 'assigned' || a.status === 'in_progress') {
      return sum + (a.chores?.base_points || 0);
    }
    return sum;
  }, 0);

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const startChore = async (assignmentId: string) => {
    setActiveTimer(assignmentId);
    setTimerSeconds(0);
    await updateAssignmentStatus(assignmentId, 'in_progress');
  };

  const completeChore = async (assignmentId: string) => {
    if (activeTimer === assignmentId) {
      setActiveTimer(null);
      const timeSpent = Math.floor(timerSeconds / 60); // Convert to minutes
      
      const assignment = myAssignments.find(a => a.id === assignmentId);
      const basePoints = assignment?.chores?.base_points || 0;
      const estimatedTime = assignment?.chores?.estimated_duration || 15;
      
      // Calculate bonus points for speed
      let bonusPoints = 0;
      if (timeSpent < estimatedTime) {
        bonusPoints = Math.round(basePoints * 0.2); // 20% bonus for completing early
      }

      await updateAssignmentStatus(assignmentId, 'completed', {
        points_earned: basePoints + bonusPoints,
        time_bonus: bonusPoints,
      });

      // Log completion in chore_completions table
      await supabase.from('chore_completions').insert({
        assignment_id: assignmentId,
        family_id: familyId,
        user_id: user?.id,
        chore_id: assignment?.chore_id,
        actual_duration: timeSpent,
        points_earned: basePoints + bonusPoints,
      });

      // Update gamification stats
      await supabase.rpc('update_user_gamification_stats', {
        p_user_id: user?.id,
        p_family_id: familyId,
        p_points_earned: basePoints + bonusPoints,
      });

      // Check for new achievements
      await checkAchievements();

      setTimerSeconds(0);
      
      toast({
        title: '🎉 Chore Completed!',
        description: `Great job! You earned ${basePoints + bonusPoints} points!`,
        duration: 5000,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelProgress = () => {
    if (!userLevel) return 0;
    const currentLevelXP = userLevel.current_level * userLevel.current_level * 100;
    const nextLevelXP = userLevel.next_level_xp;
    const progressXP = userLevel.current_xp - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    return Math.max(0, Math.min(100, (progressXP / neededXP) * 100));
  };

  const getMyRank = () => {
    const userRank = leaderboard.find(l => l.user_id === user?.id);
    return userRank?.rank || 0;
  };

  if (choreLoading || gamificationLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-primary" />
          My Daily Tasks
          <Sparkles className="h-8 w-8 text-secondary" />
        </h1>
        <p className="text-lg text-muted-foreground">
          Let's make today awesome together! 🌟
        </p>
      </div>

      {/* Gamification Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Level & XP */}
        <Card className="bg-gradient-primary text-primary-foreground shadow-glow">
          <CardContent className="p-4 text-center">
            <Crown className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Level {userLevel?.current_level || 1}</p>
            <p className="font-bold text-lg">{userLevel?.level_name || 'Rookie Helper'}</p>
            <div className="mt-2">
              <Progress value={getLevelProgress()} className="h-2" />
              <p className="text-xs mt-1 opacity-75">
                {userLevel?.current_xp || 0} XP
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Points */}
        <Card className="bg-gradient-secondary text-secondary-foreground shadow-glow">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">My Points</p>
            <p className="font-bold text-2xl">{userPoints?.current_points || 0}</p>
            <p className="text-xs opacity-75">
              +{availablePoints} available today
            </p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-gradient-accent text-accent-foreground shadow-glow">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Achievements</p>
            <p className="font-bold text-2xl">{userAchievements.length}</p>
            <p className="text-xs opacity-75">badges earned</p>
          </CardContent>
        </Card>

        {/* Family Rank */}
        <Card className="bg-gradient-card shadow-soft border-2 border-warning">
          <CardContent className="p-4 text-center">
            <Medal className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-sm text-muted-foreground">Family Rank</p>
            <p className="font-bold text-2xl text-foreground">#{getMyRank() || '?'}</p>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Tasks */}
      <Card className="bg-gradient-card shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Today's Tasks
            <Badge variant="secondary" className="ml-auto">
              {completedToday}/{todaysAssignments.length} completed
            </Badge>
          </CardTitle>
          <CardDescription>
            Complete your daily tasks to earn points and level up! 🚀
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todaysAssignments.map((assignment) => {
              const isActive = activeTimer === assignment.id;
              const isCompleted = assignment.status === 'completed' || assignment.status === 'verified';
              
              return (
                <Card 
                  key={assignment.id} 
                  className={`transition-all duration-300 ${
                    isActive ? 'ring-2 ring-primary shadow-glow' : 
                    isCompleted ? 'bg-muted/50 opacity-75' : 'hover:shadow-medium'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {assignment.chores?.title}
                          </h3>
                          <Badge 
                            variant={assignment.chores?.difficulty === 'easy' ? 'secondary' : 
                                   assignment.chores?.difficulty === 'hard' ? 'destructive' : 'default'}
                          >
                            {assignment.chores?.difficulty}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{assignment.chores?.estimated_duration}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {assignment.chores?.base_points} points
                          </span>
                        </div>

                        {isActive && (
                          <div className="text-lg font-mono text-primary flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            {formatTime(timerSeconds)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <Button disabled className="bg-secondary">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {assignment.status === 'verified' ? 'Verified!' : 'Completed!'}
                          </Button>
                        ) : isActive ? (
                          <Button 
                            onClick={() => completeChore(assignment.id)}
                            className="bg-secondary hover:bg-secondary-hover animate-pulse"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete Task
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => startChore(assignment.id)}
                            className="bg-primary hover:bg-primary-hover"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Task
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {todaysAssignments.length === 0 && (
              <div className="text-center py-8">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No tasks for today. Great job! 🎉
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {userAchievements.length > 0 && (
        <Card className="bg-gradient-card shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userAchievements.slice(0, 4).map((userAchievement) => (
                <div 
                  key={userAchievement.id} 
                  className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-2xl mb-2">
                    {userAchievement.achievements.icon || '🏆'}
                  </div>
                  <p className="font-semibold text-sm text-foreground">
                    {userAchievement.achievements.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {userAchievement.achievements.rarity}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wishlist Preview */}
      {wishlistItems.length > 0 && (
        <Card className="bg-gradient-card shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-warning" />
              My Wishlist Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wishlistItems.filter(item => !item.is_redeemed).slice(0, 2).map((item) => {
                const canAfford = (userPoints?.current_points || 0) >= item.point_cost;
                
                return (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      canAfford ? 'border-secondary bg-secondary/10' : 'border-border bg-muted/30'
                    }`}
                  >
                    <h3 className="font-semibold text-foreground">{item.item_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3" />
                        {item.point_cost} points
                      </span>
                      {canAfford && (
                        <Badge variant="secondary">Ready!</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};