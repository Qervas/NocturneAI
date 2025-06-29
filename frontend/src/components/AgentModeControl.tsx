import React, { useState, useEffect } from 'react';
import { Moon, Zap, Rocket, Activity, Users } from 'lucide-react';
import { agentNetworkService, NetworkStatus } from '../services/agentNetworkService';
import { COUNCIL_MEMBERS } from '../types/council';

interface AgentModeControlProps {
  isOpen: boolean;
  onClose: () => void;
}

const AgentModeControl: React.FC<AgentModeControlProps> = ({ isOpen, onClose }) => {
  const [agentModes, setAgentModes] = useState<Record<string, string>>({});
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAgentModes();
      loadNetworkStatus();
    }
  }, [isOpen]);

  const loadAgentModes = async () => {
    try {
      const modes = await agentNetworkService.getAgentModes();
      setAgentModes(modes);
    } catch (error) {
      console.error('Failed to load agent modes:', error);
    }
  };

  const loadNetworkStatus = async () => {
    try {
      const status = await agentNetworkService.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to load network status:', error);
    }
  };

  const handleModeChange = async (agentName: string, mode: 'passive' | 'active' | 'autonomous') => {
    setLoading(true);
    try {
      const success = await agentNetworkService.setAgentMode(agentName, mode);
      if (success) {
        setAgentModes(prev => ({ ...prev, [agentName]: mode }));
      }
    } catch (error) {
      console.error('Failed to change agent mode:', error);
    }
    setLoading(false);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'passive': return <Moon className="h-4 w-4" />;
      case 'active': return <Zap className="h-4 w-4" />;
      case 'autonomous': return <Rocket className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'passive': return 'text-slate-400 bg-slate-600/20';
      case 'active': return 'text-yellow-400 bg-yellow-600/20';
      case 'autonomous': return 'text-red-400 bg-red-600/20';
      default: return 'text-gray-400 bg-gray-600/20';
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'passive': return 'Only responds when directly asked';
      case 'active': return 'Monitors conversations and proactively participates';
      case 'autonomous': return 'Full autonomy - initiates conversations (Future)';
      default: return 'Unknown mode';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Agent Mode Control</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Network Status */}
        {networkStatus && (
          <div className="p-4 border-b border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Monitoring</div>
                <div className={`font-medium ${networkStatus.monitoring_enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {networkStatus.monitoring_enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Conversations</div>
                <div className="text-white font-medium">{networkStatus.active_conversations}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Participations</div>
                <div className="text-white font-medium">{networkStatus.recent_participations}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Active Agents</div>
                <div className="text-yellow-400 font-medium">
                  {Object.values(networkStatus.agent_modes).filter(mode => mode === 'active').length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Controls */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {Object.entries(COUNCIL_MEMBERS).map(([key, member]) => {
              const currentMode = agentModes[member.name] || 'active';
              
              return (
                <div key={key} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${member.color}`}>
                        <span className="text-lg">{member.avatar}</span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{member.name}</div>
                        <div className="text-sm text-gray-400">{member.role}</div>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getModeColor(currentMode)}`}>
                      {getModeIcon(currentMode)}
                      <span className="capitalize">{currentMode}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {getModeDescription(currentMode)}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleModeChange(member.name, 'passive')}
                      disabled={loading || currentMode === 'passive'}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                        currentMode === 'passive'
                          ? 'bg-slate-600 text-slate-300'
                          : 'bg-gray-700 text-gray-300 hover:bg-slate-600 hover:text-slate-300'
                      }`}
                    >
                      <Moon className="h-3 w-3" />
                      <span>Passive</span>
                    </button>

                    <button
                      onClick={() => handleModeChange(member.name, 'active')}
                      disabled={loading || currentMode === 'active'}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                        currentMode === 'active'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-yellow-600 hover:text-white'
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      <span>Active</span>
                    </button>

                    <button
                      onClick={() => handleModeChange(member.name, 'autonomous')}
                      disabled={loading || currentMode === 'autonomous'}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                        currentMode === 'autonomous'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                      } opacity-50 cursor-not-allowed`}
                      title="Autonomous mode coming soon"
                    >
                      <Rocket className="h-3 w-3" />
                      <span>Autonomous</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-2">
            💡 <strong>Active Mode:</strong> Agents monitor conversations and jump in when their expertise is relevant
          </div>
          <div className="text-xs text-gray-500">
            🚀 <strong>Coming Soon:</strong> Autonomous mode will enable agents to initiate conversations independently
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentModeControl; 