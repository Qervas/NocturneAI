import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Zap, 
  MessageSquare, 
  Share2, 
  Activity, 
  Brain,
  Target,
  Clock,
  Play,
  Pause,
  Settings,
  Plus,
  Filter,
  Search,
  RotateCcw
} from 'lucide-react';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  status: 'active' | 'busy' | 'idle' | 'collaborating';
  currentTask: string;
  energy: number;
  connections: string[];
  avatar: string;
  color: string;
  lastActivity: string;
}

interface AgentConnection {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'collaboration' | 'communication' | 'data_sharing' | 'mentoring';
  strength: number;
  activity: string;
  timestamp: string;
  isActive: boolean;
}

interface NetworkEvent {
  id: string;
  timestamp: string;
  type: 'task_start' | 'collaboration' | 'communication' | 'task_complete' | 'decision';
  agentId: string;
  description: string;
  relatedAgents?: string[];
  priority: 'low' | 'medium' | 'high';
}

const AgentNetworkDashboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [showConnections, setShowConnections] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  // Initialize mock network data
  useEffect(() => {
    initializeNetwork();
    const interval = setInterval(updateNetwork, 2000 * timeSpeed);
    return () => clearInterval(interval);
  }, [timeSpeed]);

  // Canvas drawing
  useEffect(() => {
    if (canvasRef.current) {
      drawNetwork();
    }
  }, [agents, connections, selectedAgent, showConnections, showActivities]);

  const initializeNetwork = () => {
    const mockAgents: AgentNode[] = [
      {
        id: 'sarah',
        name: 'Sarah Chen',
        role: 'Product Strategy',
        x: 300,
        y: 200,
        status: 'active',
        currentTask: 'Analyzing market trends',
        energy: 85,
        connections: ['marcus', 'elena'],
        avatar: '👩‍💼',
        color: '#8b5cf6',
        lastActivity: '2 min ago'
      },
      {
        id: 'marcus',
        name: 'Marcus Rodriguez',
        role: 'Market Intelligence',
        x: 500,
        y: 150,
        status: 'collaborating',
        currentTask: 'Competitive analysis with Sarah',
        energy: 92,
        connections: ['sarah', 'david'],
        avatar: '👨‍💼',
        color: '#3b82f6',
        lastActivity: 'now'
      },
      {
        id: 'elena',
        name: 'Elena Vasquez',
        role: 'UX Design',
        x: 200,
        y: 350,
        status: 'busy',
        currentTask: 'Creating wireframes',
        energy: 78,
        connections: ['sarah', 'alex'],
        avatar: '👩‍🎨',
        color: '#ec4899',
        lastActivity: '5 min ago'
      },
      {
        id: 'david',
        name: 'David Kim',
        role: 'Operations',
        x: 600,
        y: 300,
        status: 'active',
        currentTask: 'Process optimization',
        energy: 88,
        connections: ['marcus', 'alex'],
        avatar: '👨‍💻',
        color: '#10b981',
        lastActivity: '1 min ago'
      },
      {
        id: 'alex',
        name: 'Alex Thompson',
        role: 'Coordinator',
        x: 400,
        y: 400,
        status: 'idle',
        currentTask: 'Monitoring network',
        energy: 95,
        connections: ['elena', 'david', 'sarah'],
        avatar: '🤖',
        color: '#f59e0b',
        lastActivity: '3 min ago'
      }
    ];

    const mockConnections: AgentConnection[] = [
      {
        id: 'sarah-marcus',
        fromAgent: 'sarah',
        toAgent: 'marcus',
        type: 'collaboration',
        strength: 0.9,
        activity: 'Market strategy discussion',
        timestamp: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'elena-sarah',
        fromAgent: 'elena',
        toAgent: 'sarah',
        type: 'communication',
        strength: 0.7,
        activity: 'Design feedback',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        isActive: false
      },
      {
        id: 'alex-all',
        fromAgent: 'alex',
        toAgent: 'david',
        type: 'data_sharing',
        strength: 0.6,
        activity: 'Status updates',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        isActive: false
      }
    ];

    const mockEvents: NetworkEvent[] = [
      {
        id: 'event-1',
        timestamp: new Date().toISOString(),
        type: 'collaboration',
        agentId: 'sarah',
        description: 'Started collaboration with Marcus on market analysis',
        relatedAgents: ['marcus'],
        priority: 'high'
      },
      {
        id: 'event-2',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'task_complete',
        agentId: 'elena',
        description: 'Completed user research synthesis',
        priority: 'medium'
      },
      {
        id: 'event-3',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'decision',
        agentId: 'david',
        description: 'Approved process optimization proposal',
        priority: 'high'
      }
    ];

    setAgents(mockAgents);
    setConnections(mockConnections);
    setEvents(mockEvents);
  };

  const updateNetwork = () => {
    if (!isPlaying) return;

    setAgents(prev => prev.map(agent => ({
      ...agent,
      energy: Math.max(60, Math.min(100, agent.energy + (Math.random() - 0.5) * 10)),
      status: Math.random() > 0.7 ? 
        (['active', 'busy', 'collaborating', 'idle'][Math.floor(Math.random() * 4)] as any) : 
        agent.status
    })));

    // Add new events occasionally
    if (Math.random() > 0.8) {
      const newEvent: NetworkEvent = {
        id: `event-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: ['task_start', 'communication', 'task_complete'][Math.floor(Math.random() * 3)] as any,
        agentId: agents[Math.floor(Math.random() * agents.length)]?.id || 'sarah',
        description: [
          'Started new analysis task',
          'Shared insights with team',
          'Completed milestone',
          'Initiated collaboration'
        ][Math.floor(Math.random() * 4)],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 19)]); // Keep last 20 events
    }
  };

  const drawNetwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    if (showConnections) {
      connections.forEach(connection => {
        const fromAgent = agents.find(a => a.id === connection.fromAgent);
        const toAgent = agents.find(a => a.id === connection.toAgent);
        
        if (fromAgent && toAgent) {
          ctx.beginPath();
          ctx.moveTo(fromAgent.x, fromAgent.y);
          ctx.lineTo(toAgent.x, toAgent.y);
          
          if (connection.isActive) {
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
          } else {
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
          }
          
          ctx.stroke();
          
          // Draw connection label
          const midX = (fromAgent.x + toAgent.x) / 2;
          const midY = (fromAgent.y + toAgent.y) / 2;
          
          if (connection.isActive) {
            ctx.fillStyle = '#00d4ff';
            ctx.font = '12px Inter';
            ctx.fillText(connection.activity, midX, midY - 10);
          }
        }
      });
    }

    // Draw agents
    agents.forEach(agent => {
      const isSelected = selectedAgent?.id === agent.id;
      
      // Agent circle
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, isSelected ? 35 : 30, 0, 2 * Math.PI);
      ctx.fillStyle = agent.color;
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Status indicator
      const statusColors = {
        active: '#10b981',
        busy: '#f59e0b',
        idle: '#6b7280',
        collaborating: '#ec4899'
      };
      
      ctx.beginPath();
      ctx.arc(agent.x + 20, agent.y - 20, 6, 0, 2 * Math.PI);
      ctx.fillStyle = statusColors[agent.status];
      ctx.fill();
      
      // Agent name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(agent.name.split(' ')[0], agent.x, agent.y + 50);
      
      // Current task bubble
      if (showActivities && agent.currentTask) {
        const taskText = agent.currentTask;
        const textWidth = ctx.measureText(taskText).width;
        const bubbleWidth = Math.min(textWidth + 20, 200);
        const bubbleHeight = 30;
        const bubbleX = agent.x - bubbleWidth / 2;
        const bubbleY = agent.y - 80;
        
        // Task bubble
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 15);
        ctx.fill();
        
        // Task text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          taskText.length > 25 ? taskText.substring(0, 25) + '...' : taskText,
          agent.x,
          bubbleY + 20
        );
      }
      
      // Energy bar
      const barWidth = 40;
      const barHeight = 4;
      const barX = agent.x - barWidth / 2;
      const barY = agent.y + 60;
      
      ctx.fillStyle = '#374151';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      ctx.fillStyle = agent.energy > 80 ? '#10b981' : agent.energy > 60 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, (barWidth * agent.energy) / 100, barHeight);
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked agent
    const clickedAgent = agents.find(agent => {
      const distance = Math.sqrt((x - agent.x) ** 2 + (y - agent.y) ** 2);
      return distance <= 35;
    });

    setSelectedAgent(clickedAgent || null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4 text-green-400" />;
      case 'busy': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'collaborating': return <Users className="h-4 w-4 text-pink-400" />;
      case 'idle': return <Pause className="h-4 w-4 text-gray-400" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-xl rounded-2xl p-6 text-white border border-blue-500/20 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gradient-primary">🕸️ Agent Network</h1>
            <p className="text-blue-100">Interactive visualization of your AI agent ecosystem</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800/50 rounded-xl p-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">{agents.filter(a => a.status === 'active').length} Active</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-800/50 rounded-xl p-3">
              <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
              <span className="text-sm">{connections.filter(c => c.isActive).length} Collaborating</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Network Canvas */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Network Graph</h2>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg transition-colors ${
                    isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={() => setShowConnections(!showConnections)}
                  className={`p-2 rounded-lg transition-colors ${
                    showConnections ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  <Share2 className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setShowActivities(!showActivities)}
                  className={`p-2 rounded-lg transition-colors ${
                    showActivities ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                
                <button
                  onClick={initializeNetwork}
                  className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="relative bg-slate-900/50 rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onClick={handleCanvasClick}
                className="w-full h-full cursor-pointer"
              />
              
              {/* Legend */}
              <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 text-sm">
                <div className="text-white font-medium mb-2">Status Legend</div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-slate-300">Busy</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                    <span className="text-slate-300">Collaborating</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-slate-300">Idle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Selected Agent Info */}
          {selectedAgent && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Agent Details</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedAgent.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-white">{selectedAgent.name}</div>
                    <div className="text-sm text-slate-400">{selectedAgent.role}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedAgent.status)}
                  <span className="text-sm text-slate-300 capitalize">{selectedAgent.status}</span>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">Current Task</div>
                  <div className="text-sm text-white">{selectedAgent.currentTask}</div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">Energy Level</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          selectedAgent.energy > 80 ? 'bg-green-400' : 
                          selectedAgent.energy > 60 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${selectedAgent.energy}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-400">{selectedAgent.energy}%</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">Connected To</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.connections.map(connId => {
                      const connectedAgent = agents.find(a => a.id === connId);
                      return connectedAgent ? (
                        <span key={connId} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                          {connectedAgent.name.split(' ')[0]}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Events */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Events</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {events.slice(0, 10).map(event => (
                <div key={event.id} className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-xs font-medium ${getPriorityColor(event.priority)}`}>
                      {event.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">{event.description}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {agents.find(a => a.id === event.agentId)?.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Network Stats */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Network Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Agents</span>
                <span className="text-white font-medium">{agents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Connections</span>
                <span className="text-white font-medium">{connections.filter(c => c.isActive).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Energy</span>
                <span className="text-white font-medium">
                  {Math.round(agents.reduce((acc, a) => acc + a.energy, 0) / agents.length)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Events Today</span>
                <span className="text-white font-medium">{events.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentNetworkDashboard; 