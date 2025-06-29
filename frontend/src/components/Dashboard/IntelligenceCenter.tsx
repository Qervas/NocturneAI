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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  const loadIntelligenceData = async () => {
    setLoading(true);
    
    // Mock data - replace with actual API calls
    const mockDecisions: Decision[] = [
      {
        id: 'dec-1',
        title: 'Implement new market strategy',
        description: 'Based on competitive analysis, recommend pivoting to enterprise market',
        status: 'pending',
        priority: 'high',
        agentId: 'sarah',
        agentName: 'Sarah Chen',
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
        agentId: 'elena',
        agentName: 'Elena Vasquez',
        impact: 'medium',
        confidence: 92,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        reasoning: 'User testing shows confusion at step 3, simplified flow reduces friction',
        expectedOutcome: 'Improve conversion rate by 15%'
      }
    ];

    const mockGoals: Goal[] = [
      {
        id: 'goal-1',
        title: 'Increase Market Share',
        description: 'Expand to enterprise market and increase overall market share by 20%',
        status: 'active',
        priority: 'high',
        progress: 35,
        targetDate: '2024-12-31',
        assignedAgents: ['sarah', 'marcus'],
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
        assignedAgents: ['elena'],
        milestones: [
          { id: 'm4', title: 'User research', completed: true, completedAt: '2024-01-20', dueDate: '2024-01-20' },
          { id: 'm5', title: 'Design system update', completed: true, completedAt: '2024-02-01', dueDate: '2024-02-01' },
          { id: 'm6', title: 'Implementation', completed: false, dueDate: '2024-05-01' }
        ],
        createdAt: '2024-01-10',
        category: 'operational'
      }
    ];

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
          progress: Math.floor(Math.random() * 20) + 30
        })).reverse()
      },
      intelligence: {
        totalInsights: 156,
        learningEvents: 89,
        collaborations: 34,
        efficiency: 82,
        adaptability: 76,
        trendsData: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          insights: Math.floor(Math.random() * 15) + 5
        })).reverse()
      }
    };

    setDecisions(mockDecisions);
    setGoals(mockGoals);
    setAnalytics(mockAnalytics);
    setLoading(false);
  };

  const getStatusColor = (status: string, type: 'decision' | 'goal') => {
    if (type === 'decision') {
      switch (status) {
        case 'pending': return 'text-yellow-400 bg-yellow-400/10';
        case 'approved': return 'text-green-400 bg-green-400/10';
        case 'rejected': return 'text-red-400 bg-red-400/10';
        case 'auto_executed': return 'text-blue-400 bg-blue-400/10';
        default: return 'text-gray-400 bg-gray-400/10';
      }
    } else {
      switch (status) {
        case 'active': return 'text-green-400 bg-green-400/10';
        case 'completed': return 'text-blue-400 bg-blue-400/10';
        case 'paused': return 'text-yellow-400 bg-yellow-400/10';
        case 'cancelled': return 'text-red-400 bg-red-400/10';
        default: return 'text-gray-400 bg-gray-400/10';
      }
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <ArrowUp className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'low': return <ArrowDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredDecisions = decisions.filter(decision => {
    const matchesSearch = decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         decision.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || decision.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || decision.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || goal.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 backdrop-blur-xl rounded-2xl p-6 text-white border border-indigo-500/20 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-gradient-primary">🧠 Intelligence Center</h1>
        <p className="text-indigo-100">Unified dashboard for decisions, goals, and analytics</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-2">
        <div className="flex space-x-2">
          {[
            { id: 'decisions', label: 'Decisions', icon: Target, count: decisions.length },
            { id: 'goals', label: 'Goals', icon: CheckCircle, count: goals.length },
            { id: 'analytics', label: 'Analytics', icon: BarChart3, count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-slate-600/50'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {(activeTab === 'decisions' || activeTab === 'goals') && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">All Status</option>
              {activeTab === 'decisions' ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="auto_executed">Auto-Executed</option>
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
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          {filteredDecisions.map(decision => (
            <div key={decision.id} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getPriorityIcon(decision.priority)}
                    <h3 className="text-lg font-semibold text-white">{decision.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(decision.status, 'decision')}`}>
                      {decision.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-300 mb-3">{decision.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Agent:</span>
                      <span className="text-white ml-2">{decision.agentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Impact:</span>
                      <span className={`ml-2 capitalize ${
                        decision.impact === 'high' ? 'text-red-400' :
                        decision.impact === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>{decision.impact}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-white ml-2">{decision.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Created:</span>
                      <span className="text-white ml-2">{new Date(decision.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-white mb-2">Reasoning</h4>
                <p className="text-slate-300 text-sm">{decision.reasoning}</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Expected Outcome</h4>
                <p className="text-slate-300 text-sm">{decision.expectedOutcome}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          {filteredGoals.map(goal => (
            <div key={goal.id} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getPriorityIcon(goal.priority)}
                    <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status, 'goal')}`}>
                      {goal.status}
                    </span>
                  </div>
                  <p className="text-slate-300 mb-3">{goal.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white">{goal.progress}%</span>
                    </div>
                    <div className="bg-slate-700 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-slate-400">Category:</span>
                      <span className="text-white ml-2 capitalize">{goal.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Date:</span>
                      <span className="text-white ml-2">{new Date(goal.targetDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Assigned:</span>
                      <span className="text-white ml-2">{goal.assignedAgents.length} agents</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Milestones */}
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Milestones</h4>
                <div className="space-y-2">
                  {goal.milestones.map(milestone => (
                    <div key={milestone.id} className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        milestone.completed ? 'bg-green-500' : 'bg-slate-600'
                      }`}>
                        {milestone.completed && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`flex-1 ${milestone.completed ? 'text-slate-400 line-through' : 'text-slate-300'}`}>
                        {milestone.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {milestone.completed ? 
                          `Completed ${new Date(milestone.completedAt!).toLocaleDateString()}` :
                          `Due ${new Date(milestone.dueDate).toLocaleDateString()}`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Decision Analytics */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-cyan-400" />
              Decision Analytics
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{analytics.decisions.total}</div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{analytics.decisions.pending}</div>
                  <div className="text-xs text-slate-400">Pending</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{analytics.decisions.approvalRate}%</div>
                  <div className="text-xs text-slate-400">Approval Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{analytics.decisions.avgConfidence}%</div>
                  <div className="text-xs text-slate-400">Avg Confidence</div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal Analytics */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              Goal Analytics
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{analytics.goals.total}</div>
                  <div className="text-xs text-slate-400">Total Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{analytics.goals.active}</div>
                  <div className="text-xs text-slate-400">Active</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{analytics.goals.avgProgress}%</div>
                  <div className="text-xs text-slate-400">Avg Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{analytics.goals.completionRate}%</div>
                  <div className="text-xs text-slate-400">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence Analytics */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-400" />
              Intelligence Analytics
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{analytics.intelligence.totalInsights}</div>
                  <div className="text-xs text-slate-400">Total Insights</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{analytics.intelligence.learningEvents}</div>
                  <div className="text-xs text-slate-400">Learning Events</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{analytics.intelligence.efficiency}%</div>
                  <div className="text-xs text-slate-400">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{analytics.intelligence.adaptability}%</div>
                  <div className="text-xs text-slate-400">Adaptability</div>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Trends Chart */}
          <div className="md:col-span-2 lg:col-span-3 bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
              Intelligence Trends (Last 7 Days)
            </h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Interactive charts will be available here</p>
                <p className="text-sm">Showing trends for decisions, goals, and intelligence metrics</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligenceCenter; 