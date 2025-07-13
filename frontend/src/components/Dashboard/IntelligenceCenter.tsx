import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Brain, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Users,
  Filter,
  Search,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { dynamicAgentService, DynamicAgent } from '../../services/dynamicAgentService';

interface Decision {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  agentId: string;
  agentName: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  createdAt: string;
  updatedAt: string;
  reasoning: string;
  expectedOutcome: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  targetDate: string;
  assignedAgents: string[];
  milestones: Milestone[];
  createdAt: string;
  category: 'strategic' | 'operational' | 'learning' | 'collaboration';
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  dueDate: string;
}

interface Analytics {
  decisions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    autoExecuted: number;
    approvalRate: number;
    avgConfidence: number;
    trendsData: { date: string; count: number }[];
  };
  goals: {
    total: number;
    active: number;
    completed: number;
    avgProgress: number;
    completionRate: number;
    trendsData: { date: string; progress: number }[];
  };
  intelligence: {
    totalInsights: number;
    learningEvents: number;
    collaborations: number;
    efficiency: number;
    adaptability: number;
    trendsData: { date: string; insights: number }[];
  };
}

type TabType = 'decisions' | 'goals' | 'analytics';

const IntelligenceCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('decisions');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  const loadIntelligenceData = async () => {
    setLoading(true);
    
    try {
      // Load agents first
      const agentsData = await dynamicAgentService.getAllAgents();
      setAgents(agentsData);
      
      // Generate mock decisions based on real agents
      const mockDecisions: Decision[] = agentsData.length > 0 ? [
        {
          id: 'dec-1',
          title: 'Implement new market strategy',
          description: 'Based on competitive analysis, recommend pivoting to enterprise market',
          status: 'pending',
          priority: 'high',
          agentId: agentsData[0].profile.agent_id,
          agentName: agentsData[0].profile.name,
          impact: 'high',
          confidence: 85,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reasoning: 'Market analysis shows 40% growth opportunity in enterprise segment',
          expectedOutcome: 'Increase revenue by 25% within 6 months'
        },
        {
          id: 'dec-2',
          title: 'Optimize user onboarding flow',
          description: 'UX research indicates 60% drop-off in current onboarding',
          status: 'approved',
          priority: 'medium',
          agentId: agentsData[0].profile.agent_id,
          agentName: agentsData[0].profile.name,
          impact: 'medium',
          confidence: 92,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          reasoning: 'User testing shows confusion at step 3, simplified flow reduces friction',
          expectedOutcome: 'Improve conversion rate by 15%'
        }
      ] : [];

      // Generate mock goals based on real agents
      const mockGoals: Goal[] = agentsData.length > 0 ? [
        {
          id: 'goal-1',
          title: 'Increase Market Share',
          description: 'Expand to enterprise market and increase overall market share by 20%',
          status: 'active',
          priority: 'high',
          progress: 35,
          targetDate: '2024-12-31',
          assignedAgents: [agentsData[0].profile.agent_id],
          milestones: [
            { id: 'm1', title: 'Market research complete', completed: true, completedAt: '2024-01-15', dueDate: '2024-01-15' },
            { id: 'm2', title: 'Enterprise product features', completed: false, dueDate: '2024-03-01' },
            { id: 'm3', title: 'Sales team training', completed: false, dueDate: '2024-04-01' }
          ],
          createdAt: '2024-01-01',
          category: 'strategic'
        },
        {
          id: 'goal-2',
          title: 'Improve User Experience',
          description: 'Redesign core user flows to improve satisfaction and retention',
          status: 'active',
          priority: 'medium',
          progress: 60,
          targetDate: '2024-06-30',
          assignedAgents: [agentsData[0].profile.agent_id],
          milestones: [
            { id: 'm4', title: 'User research', completed: true, completedAt: '2024-01-20', dueDate: '2024-01-20' },
            { id: 'm5', title: 'Design system update', completed: true, completedAt: '2024-02-01', dueDate: '2024-02-01' },
            { id: 'm6', title: 'Implementation', completed: false, dueDate: '2024-05-01' }
          ],
          createdAt: '2024-01-10',
          category: 'operational'
        }
      ] : [];

      const mockAnalytics: Analytics = {
        decisions: {
          total: 24,
          pending: 3,
          approved: 18,
          rejected: 2,
          autoExecuted: 1,
          approvalRate: 85,
          avgConfidence: 78,
          trendsData: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 10) + 1
          })).reverse()
        },
        goals: {
          total: 12,
          active: 8,
          completed: 4,
          avgProgress: 45,
          completionRate: 75,
          trendsData: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            progress: Math.floor(Math.random() * 100)
          })).reverse()
        },
        intelligence: {
          totalInsights: agentsData.reduce((sum, agent) => sum + agent.memory_counts.long_term + agent.memory_counts.episodic, 0),
          learningEvents: agentsData.reduce((sum, agent) => sum + agent.current_state.interaction_count, 0),
          collaborations: agentsData.reduce((sum, agent) => sum + Object.keys(agent.relationships).length, 0),
          efficiency: agentsData.length > 0 ? Math.round(agentsData.reduce((sum, agent) => sum + agent.current_state.energy, 0) / agentsData.length) : 0,
          adaptability: agentsData.length > 0 ? Math.round(agentsData.reduce((sum, agent) => sum + agent.current_state.confidence, 0) / agentsData.length) : 0,
          trendsData: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            insights: Math.floor(Math.random() * 20) + 5
          })).reverse()
        }
      };

      setDecisions(mockDecisions);
      setGoals(mockGoals);
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading intelligence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = decisions.filter(decision => {
    const matchesSearch = decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         decision.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || decision.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || decision.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || goal.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getStatusColor = (status: string, type: 'decision' | 'goal') => {
    if (type === 'decision') {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'approved': return 'bg-green-100 text-green-800 border-green-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        case 'auto_executed': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      switch (status) {
        case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high': return <ArrowUp className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'low': return <ArrowDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.profile.agent_id === agentId);
    return agent ? agent.profile.name : 'Unknown Agent';
  };

  const getAgentColor = (agentId: string) => {
    const agent = agents.find(a => a.profile.agent_id === agentId);
    if (!agent) return 'bg-gray-500';
    
    const colors = {
      'purple': 'bg-purple-500',
      'blue': 'bg-blue-500',
      'pink': 'bg-pink-500',
      'green': 'bg-green-500',
      'orange': 'bg-orange-500',
      'red': 'bg-red-500'
    };
    return colors[agent.profile.color_theme as keyof typeof colors] || 'bg-gray-500';
  };

  const renderDecisionsTab = () => (
    <div className="space-y-4">
      {filteredDecisions.map(decision => (
        <div key={decision.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getPriorityIcon(decision.priority)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{decision.title}</h3>
                <p className="text-sm text-gray-600">{decision.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(decision.status, 'decision')}`}>
                {decision.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                decision.impact === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                decision.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}>
                {decision.impact} impact
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full ${getAgentColor(decision.agentId)} flex items-center justify-center text-white text-sm font-medium`}>
                {getAgentName(decision.agentId).split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm text-gray-700">{getAgentName(decision.agentId)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Confidence: {decision.confidence}%</span>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Reasoning</h4>
            <p className="text-sm text-gray-600">{decision.reasoning}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Expected Outcome</h4>
            <p className="text-sm text-gray-600">{decision.expectedOutcome}</p>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Created: {new Date(decision.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(decision.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      
      {filteredDecisions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No decisions found matching your criteria</p>
        </div>
      )}
    </div>
  );

  const renderGoalsTab = () => (
    <div className="space-y-4">
      {filteredGoals.map(goal => (
        <div key={goal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getPriorityIcon(goal.priority)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                <p className="text-sm text-gray-600">{goal.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(goal.status, 'goal')}`}>
                {goal.status}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                goal.category === 'strategic' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                goal.category === 'operational' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                goal.category === 'learning' ? 'bg-green-100 text-green-800 border-green-200' :
                'bg-orange-100 text-orange-800 border-orange-200'
              }`}>
                {goal.category}
              </span>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
              <span>Progress</span>
              <span>{goal.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Assigned Agents</h4>
            <div className="flex space-x-2">
              {goal.assignedAgents.map(agentId => (
                <div key={agentId} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full ${getAgentColor(agentId)} flex items-center justify-center text-white text-xs font-medium`}>
                    {getAgentName(agentId).split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm text-gray-700">{getAgentName(agentId)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Milestones</h4>
            <div className="space-y-2">
              {goal.milestones.map(milestone => (
                <div key={milestone.id} className="flex items-center space-x-2">
                  <CheckCircle className={`w-4 h-4 ${milestone.completed ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={`text-sm ${milestone.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                    {milestone.title}
                  </span>
                  <span className="text-xs text-gray-400">
                    {milestone.completed ? `Completed ${new Date(milestone.completedAt!).toLocaleDateString()}` : `Due ${new Date(milestone.dueDate).toLocaleDateString()}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Created: {new Date(goal.createdAt).toLocaleDateString()}</span>
            <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      
      {filteredGoals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No goals found matching your criteria</p>
        </div>
      )}
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Decisions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.decisions.total || 0}</p>
            </div>
            <Brain className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Goals</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.goals.active || 0}</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Intelligence Insights</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.intelligence.totalInsights || 0}</p>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Efficiency Score</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.intelligence.efficiency || 0}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>
      
      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Analytics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Approval Rate</span>
              <span className="text-sm font-medium text-gray-900">{analytics?.decisions.approvalRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Confidence</span>
              <span className="text-sm font-medium text-gray-900">{analytics?.decisions.avgConfidence || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Decisions</span>
              <span className="text-sm font-medium text-gray-900">{analytics?.decisions.pending || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Analytics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="text-sm font-medium text-gray-900">{analytics?.goals.completionRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Progress</span>
              <span className="text-sm font-medium text-gray-900">{analytics?.goals.avgProgress || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Goals</span>
              <span className="text-sm font-medium text-gray-900">{analytics?.goals.active || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Intelligence Center</h1>
            <p className="text-gray-600">Monitor and manage autonomous decisions, goals, and analytics</p>
          </div>
          <button
            onClick={loadIntelligenceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'decisions', label: 'Decisions', icon: Brain },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        {(activeTab === 'decisions' || activeTab === 'goals') && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center space-x-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Statuses</option>
                  {activeTab === 'decisions' ? (
                    <>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="auto_executed">Auto Executed</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {activeTab === 'decisions' && renderDecisionsTab()}
          {activeTab === 'goals' && renderGoalsTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </div>
      </div>
    </div>
  );
};

export default IntelligenceCenter; 