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
import { dynamicAgentService, DynamicAgent } from '../../services/dynamicAgentService';

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
  const [loading, setLoading] = useState(true);

  // Initialize network data
  useEffect(() => {
    initializeNetwork();
  }, []);

  // Update network periodically
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(updateNetwork, 2000 / timeSpeed);
      return () => clearInterval(interval);
    }
  }, [timeSpeed, isPlaying]);

  // Canvas drawing
  useEffect(() => {
    if (canvasRef.current) {
      drawNetwork();
    }
  }, [agents, connections, selectedAgent, showConnections, showActivities]);

  const initializeNetwork = async () => {
    setLoading(true);
    try {
      const dynamicAgents = await dynamicAgentService.getAllAgents();
      
      // Convert dynamic agents to network nodes
      const networkNodes: AgentNode[] = dynamicAgents.map((agent, index) => ({
        id: agent.profile.agent_id,
        name: agent.profile.name,
        role: agent.profile.role,
        x: 300 + (index * 200) % 600,
        y: 200 + (index * 150) % 400,
        status: agent.current_state.is_active ? 'active' : 'idle',
        currentTask: agent.autonomous_goals[0] || 'Available',
        energy: Math.round(agent.current_state.energy),
        connections: Object.keys(agent.relationships),
        avatar: agent.profile.avatar_emoji,
        color: getColorFromTheme(agent.profile.color_theme),
        lastActivity: agent.current_state.last_interaction ? formatLastActivity(agent.current_state.last_interaction) : 'Never'
      }));

      setAgents(networkNodes);
      generateConnections(networkNodes);
      generateInitialEvents(networkNodes);
    } catch (error) {
      console.error('Error initializing network:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorFromTheme = (theme: string): string => {
    const colors = {
      'purple': '#8b5cf6',
      'blue': '#3b82f6',
      'pink': '#ec4899',
      'green': '#10b981',
      'orange': '#f59e0b',
      'red': '#ef4444'
    };
    return colors[theme as keyof typeof colors] || '#6b7280';
  };

  const formatLastActivity = (timestamp: string): string => {
    const now = new Date();
    const lastActivity = new Date(timestamp);
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const generateConnections = (networkNodes: AgentNode[]) => {
    const mockConnections: AgentConnection[] = [];
    
    networkNodes.forEach(agent => {
      agent.connections.forEach(connectedId => {
        const connectedAgent = networkNodes.find(a => a.id === connectedId);
        if (connectedAgent && !mockConnections.find(c => 
          (c.fromAgent === agent.id && c.toAgent === connectedId) ||
          (c.fromAgent === connectedId && c.toAgent === agent.id)
        )) {
          mockConnections.push({
            id: `${agent.id}-${connectedId}`,
            fromAgent: agent.id,
            toAgent: connectedId,
            type: 'collaboration',
            strength: Math.random() * 0.5 + 0.5,
            activity: 'Information sharing',
            timestamp: new Date().toISOString(),
            isActive: Math.random() > 0.7
          });
        }
      });
    });

    setConnections(mockConnections);
  };

  const generateInitialEvents = (networkNodes: AgentNode[]) => {
    const mockEvents: NetworkEvent[] = [];
    
    networkNodes.forEach((agent, index) => {
      mockEvents.push({
        id: `event-${index}`,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        type: 'task_start',
        agentId: agent.id,
        description: `${agent.name} started working on ${agent.currentTask}`,
        priority: 'medium'
      });
    });

    setEvents(mockEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const updateNetwork = () => {
    if (!isPlaying) return;

    setAgents(prevAgents => 
      prevAgents.map(agent => ({
        ...agent,
        energy: Math.max(0, Math.min(100, agent.energy + (Math.random() - 0.5) * 5)),
        status: Math.random() > 0.8 ? 
          (['active', 'busy', 'idle', 'collaborating'] as const)[Math.floor(Math.random() * 4)] : 
          agent.status
      }))
    );

    // Add new events occasionally
    if (Math.random() > 0.7) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      if (randomAgent) {
        const newEvent: NetworkEvent = {
          id: `event-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: (['task_start', 'collaboration', 'communication', 'decision'] as const)[Math.floor(Math.random() * 4)],
          agentId: randomAgent.id,
          description: `${randomAgent.name} ${getRandomActivity()}`,
          priority: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)]
        };

        setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
      }
    }
  };

  const getRandomActivity = () => {
    const activities = [
      'completed a task',
      'started collaborating',
      'shared insights',
      'made a decision',
      'requested assistance',
      'provided feedback'
    ];
    return activities[Math.floor(Math.random() * activities.length)];
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
          ctx.strokeStyle = connection.isActive ? '#3b82f6' : '#6b7280';
          ctx.lineWidth = connection.strength * 3;
          ctx.stroke();
        }
      });
    }

    // Draw agents
    agents.forEach(agent => {
      const isSelected = selectedAgent?.id === agent.id;
      const radius = isSelected ? 30 : 25;

      // Draw agent circle
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = agent.color;
      ctx.fill();

      // Draw status ring
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = getStatusColor(agent.status);
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw avatar
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText(agent.avatar, agent.x, agent.y + 7);

      // Draw name
      ctx.font = '12px Arial';
      ctx.fillStyle = '#374151';
      ctx.fillText(agent.name, agent.x, agent.y + radius + 15);

      // Draw energy bar
      const barWidth = 40;
      const barHeight = 4;
      const barX = agent.x - barWidth / 2;
      const barY = agent.y + radius + 25;

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = agent.energy > 60 ? '#10b981' : agent.energy > 30 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, (agent.energy / 100) * barWidth, barHeight);
    });

    // Draw activity indicators
    if (showActivities) {
      agents.forEach(agent => {
        if (agent.status === 'active' || agent.status === 'collaborating') {
          const pulseRadius = 35 + Math.sin(Date.now() / 200) * 5;
          ctx.beginPath();
          ctx.arc(agent.x, agent.y, pulseRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = agent.color + '40';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'idle': return '#6b7280';
      case 'collaborating': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedAgent = agents.find(agent => {
      const distance = Math.sqrt(Math.pow(x - agent.x, 2) + Math.pow(y - agent.y, 2));
      return distance <= 30;
    });

    setSelectedAgent(clickedAgent || null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4 text-green-500" />;
      case 'busy': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'idle': return <Pause className="w-4 h-4 text-gray-500" />;
      case 'collaborating': return <Share2 className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredEvents = events.filter(event => 
    filterType === 'all' || event.type === filterType
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
            <h1 className="text-2xl font-bold text-gray-900">Agent Network Dashboard</h1>
            <p className="text-gray-600">Real-time visualization of agent interactions and activities</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Speed:</span>
              <select
                value={timeSpeed}
                onChange={(e) => setTimeSpeed(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isPlaying ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={initializeNetwork}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Visualization */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Network Visualization</h2>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showConnections}
                  onChange={(e) => setShowConnections(e.target.checked)}
                  className="rounded"
                />
                <span>Connections</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showActivities}
                  onChange={(e) => setShowActivities(e.target.checked)}
                  className="rounded"
                />
                <span>Activities</span>
              </label>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-pointer bg-gray-50"
            />
          </div>
          
          {selectedAgent && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                {selectedAgent.avatar} {selectedAgent.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Role:</span>
                  <span className="ml-2 text-gray-900">{selectedAgent.role}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 flex items-center space-x-1">
                    {getStatusIcon(selectedAgent.status)}
                    <span className="capitalize">{selectedAgent.status}</span>
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Energy:</span>
                  <span className="ml-2 text-gray-900">{selectedAgent.energy}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Task:</span>
                  <span className="ml-2 text-gray-900">{selectedAgent.currentTask}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Network Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Total Agents</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{agents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Active Agents</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {agents.filter(a => a.status === 'active').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-600">Connections</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{connections.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Avg Energy</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.energy, 0) / agents.length) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Types</option>
                <option value="task_start">Task Start</option>
                <option value="collaboration">Collaboration</option>
                <option value="communication">Communication</option>
                <option value="decision">Decision</option>
              </select>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEvents.map(event => {
                const agent = agents.find(a => a.id === event.agentId);
                return (
                  <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {agent ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: agent.color }}>
                          {agent.avatar}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.description}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(event.priority)}`}>
                          {event.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentNetworkDashboard; 