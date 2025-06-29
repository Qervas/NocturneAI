import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Brain, 
  MessageSquare,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Zap,
  Activity,
  TrendingUp
} from 'lucide-react';

// Import dashboard components
import AutonomousDashboard from './components/Dashboard/AutonomousDashboard';
import LivingAgentDashboard from './components/Dashboard/LivingAgentDashboard';
import AgentNetworkDashboard from './components/Dashboard/AgentNetworkDashboard';
import IntelligenceCenter from './components/Dashboard/IntelligenceCenter';
import ChatWrapper from './components/ChatWrapper';

// Types
type ActiveTab = 'dashboard' | 'network' | 'intelligence' | 'agents' | 'chat';

interface SystemStatus {
  status: 'operational' | 'degraded' | 'critical';
  lastUpdated: string;
  activeAgents: number;
  processingQueue: number;
  uptime: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'operational',
    lastUpdated: new Date().toLocaleTimeString(),
    activeAgents: 5,
    processingQueue: 0,
    uptime: '2h 45m'
  });
  const [notifications, setNotifications] = useState(3);

  // Update system status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleTimeString(),
        activeAgents: Math.floor(Math.random() * 3) + 4, // 4-6 agents
        processingQueue: Math.floor(Math.random() * 3), // 0-2 items
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & Quick Actions'
    },
    {
      id: 'network',
      label: 'Agent Network',
      icon: Users,
      description: 'Interactive Agent Graph'
    },
    {
      id: 'intelligence',
      label: 'Intelligence Center',
      icon: Brain,
      description: 'Decisions, Goals & Analytics'
    },
    {
      id: 'agents',
      label: 'Living Agents',
      icon: Activity,
      description: 'Agent Management'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      description: 'Communication Interface'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AutonomousDashboard />;
      case 'network':
        return <AgentNetworkDashboard />;
      case 'intelligence':
        return <IntelligenceCenter />;
      case 'agents':
        return <LivingAgentDashboard userId="user-1" />;
      case 'chat':
        return <ChatWrapper />;
      default:
        return <AutonomousDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div>
                <h1 className="text-xl font-bold text-gradient-primary">Intelligence Empire</h1>
                <p className="text-sm text-slate-400">Living Agent Network</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* System Status */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">System Status</span>
                  <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus.status)}`}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                    <span className="text-xs font-medium capitalize">{systemStatus.status}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Last updated: {systemStatus.lastUpdated}</div>
                  <div className="flex justify-between">
                    <span>Active Agents</span>
                    <span className="text-cyan-400">{systemStatus.activeAgents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Queue</span>
                    <span className="text-slate-300">{systemStatus.processingQueue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <span className="text-green-400">{systemStatus.uptime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 group ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-slate-700/50 text-slate-400 group-hover:text-white group-hover:bg-slate-600/50'
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                  {item.id === 'intelligence' && notifications > 0 && (
                    <div className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </div>
                  )}
                </button>
              ))}
            </nav>

            {/* System Overview */}
            <div className="p-4 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 mb-3">System Overview</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-slate-300">Active Sessions</span>
                  </div>
                  <span className="text-sm font-medium text-white">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-slate-300">Processing Queue</span>
                  </div>
                  <span className="text-sm font-medium text-white">{systemStatus.processingQueue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-slate-300">Uptime</span>
                  </div>
                  <span className="text-sm font-medium text-white">{systemStatus.uptime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Top Bar */}
          <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>
                
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {navigationItems.find(item => item.id === activeTab)?.label}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {navigationItems.find(item => item.id === activeTab)?.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="hidden md:flex relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-64 pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200"
                  />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <Bell className="h-5 w-5 text-slate-400" />
                  {notifications > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </div>
                  )}
                </button>

                {/* Settings */}
                <button className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <Settings className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            {renderActiveComponent()}
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;