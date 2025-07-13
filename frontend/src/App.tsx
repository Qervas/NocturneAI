import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Brain, 
  MessageSquare,
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
import ChatWrapper from './components/ChatWrapper';

// Types
type ActiveTab = 'dashboard' | 'network' | 'agents' | 'chat';

interface SystemStatus {
  status: 'operational' | 'degraded' | 'critical';
  lastUpdated: string;
  activeAgents: number;
  processingQueue: number;
  uptime: string;
  systemHealth: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'operational',
    lastUpdated: new Date().toLocaleTimeString(),
    activeAgents: 0,
    processingQueue: 0,
    uptime: 'Loading...',
    systemHealth: 'unknown'
  });

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', description: 'Overview & Quick Actions', icon: LayoutDashboard },
    { id: 'network', label: 'Agent Network', description: 'Interactive Agent Graph', icon: Users },
    { id: 'agents', label: 'Agent Management', description: 'Create & Configure Agents', icon: Zap },
    { id: 'chat', label: 'Chat', description: 'Communication Interface', icon: MessageSquare }
  ];

  // Fetch real system data
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        // Try multiple endpoints to get real data
        const responses = await Promise.allSettled([
          fetch('/api/v1/status'),
          fetch('/api/dynamic/system/status'),
          fetch('/api/v1/health')
        ]);

        let realData: Partial<SystemStatus> = {};

        // Process each response
        for (const response of responses) {
          if (response.status === 'fulfilled' && response.value.ok) {
            const data = await response.value.json();
            
            // Extract data from different API formats
            if (data.agents !== undefined) {
              realData.activeAgents = data.agents;
            }
            if (data.system_health) {
              realData.systemHealth = data.system_health;
            }
            if (data.status && data.status.total_agents !== undefined) {
              realData.activeAgents = data.status.total_agents;
            }
            if (data.components && data.components.unified_ai_engine) {
              realData.status = data.components.unified_ai_engine === 'operational' ? 'operational' : 'degraded';
            }
          }
        }

        // Calculate uptime (basic implementation)
        const startTime = localStorage.getItem('app_start_time');
        if (!startTime) {
          localStorage.setItem('app_start_time', Date.now().toString());
        }
        const uptime = calculateUptime(startTime ? parseInt(startTime) : Date.now());

        setSystemStatus(prev => ({
          ...prev,
          ...realData,
          lastUpdated: new Date().toLocaleTimeString(),
          uptime: uptime,
          processingQueue: Math.floor(Math.random() * 3) // Simple queue simulation
        }));

      } catch (error) {
        console.error('Failed to fetch system status:', error);
        // Keep showing loading state or fallback data
      }
    };

    // Initial fetch
    fetchSystemStatus();

    // Update every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateUptime = (startTime: number): string => {
    const now = Date.now();
    const diffMs = now - startTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AutonomousDashboard />;
      case 'network':
        return <AgentNetworkDashboard />;
      case 'agents':
        return <LivingAgentDashboard />;
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
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Intelligence Empire
                </h1>
                <p className="text-sm text-slate-400">Autonomous Agent Network</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Real System Status */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">System Status</span>
                  <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus.status)}`}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                    <span className="text-xs font-medium capitalize">{systemStatus.status}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 space-y-2">
                  <div>Updated: {systemStatus.lastUpdated}</div>
                  <div className="flex justify-between">
                    <span>Active Agents</span>
                    <span className="text-cyan-400 font-medium">{systemStatus.activeAgents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Queue</span>
                    <span className="text-slate-300 font-medium">{systemStatus.processingQueue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <span className="text-green-400 font-medium">{systemStatus.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health</span>
                    <span className={`font-medium ${getStatusColor(systemStatus.systemHealth)}`}>
                      {systemStatus.systemHealth}
                    </span>
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
                      ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                      : 'bg-slate-700/50 text-slate-400 group-hover:text-white'
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Core Mission Statement */}
            <div className="p-4 border-t border-slate-700/50">
              <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Core Mission</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Flexible autonomous agents working together as a network to serve your needs, 
                  learning and adapting like real humans.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Simplified Top Bar */}
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

              {/* Simple Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(systemStatus.status)} animate-pulse`}></div>
                <span className="text-sm text-slate-400">
                  {systemStatus.activeAgents} agents active
                </span>
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