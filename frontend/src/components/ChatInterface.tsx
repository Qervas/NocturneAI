import React, { useEffect, useRef, useState } from 'react';
import { 
  User, 
  Brain, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  Hash, 
  MessageCircle, 
  Heart,
  Zap,
  Target,
  Activity,
  Smile,
  Meh,
  Frown,
  Coffee,
  Star,
  ThumbsUp,
  ThumbsDown,
  HelpCircle
} from 'lucide-react';
import { ActiveView } from '../types/channels';
import { ChatMessage } from '../types/living-agents';
import { livingAgentService, LivingAgent } from '../services/livingAgentService';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  activeView: ActiveView;
  interactionMode: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isProcessing, activeView, interactionMode }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contextAgents, setContextAgents] = useState<LivingAgent[]>([]);
  const [userFeedback, setUserFeedback] = useState<{[messageId: string]: 'positive' | 'negative' | null}>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadContextAgents();
  }, [activeView]);

  const loadContextAgents = async () => {
    try {
      if (activeView.type === 'dm' && activeView.agentId) {
        // For DM, load only the specific agent
        const agent = await livingAgentService.getAgent(activeView.agentId);
        setContextAgents(agent ? [agent] : []);
      } else if (activeView.type === 'channel') {
        // For channels, load agents that recently participated in this channel
        const recentAgents = getRecentChannelAgents();
        setContextAgents(recentAgents);
      }
    } catch (error) {
      console.error('Failed to load context agents:', error);
    }
  };

  const getRecentChannelAgents = (): LivingAgent[] => {
    // Get agents from recent messages in this channel
    const recentAgentIds = new Set<string>();
    const recentMessages = messages.slice(-10); // Last 10 messages
    
    recentMessages.forEach(message => {
      if (message.type === 'agent' && message.agent_id) {
        recentAgentIds.add(message.agent_id);
      }
    });

    // For now, return empty array - will be populated by mock data or API
    return [];
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMoodEmoji = (moodDescription: string) => {
    const mood = moodDescription.toLowerCase();
    if (mood.includes('happy') || mood.includes('excited')) return '😊';
    if (mood.includes('focused') || mood.includes('strategic')) return '🎯';
    if (mood.includes('creative') || mood.includes('innovative')) return '🎨';
    if (mood.includes('analytical') || mood.includes('confident')) return '🧠';
    if (mood.includes('tired') || mood.includes('stressed')) return '😴';
    if (mood.includes('energetic')) return '⚡';
    return '🤔';
  };

  const getMoodColor = (energy: number, stress: number) => {
    if (energy > 80 && stress < 20) return 'text-green-400';
    if (energy > 60 && stress < 40) return 'text-blue-400';
    if (energy < 40 || stress > 60) return 'text-orange-400';
    if (stress > 80) return 'text-red-400';
    return 'text-slate-400';
  };

  const handleUserFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setUserFeedback(prev => ({ ...prev, [messageId]: feedback }));
    
    // TODO: Send feedback to backend to help agent learn
    console.log(`User feedback for message ${messageId}: ${feedback}`);
  };

  const renderAgentMoodBar = (agent: LivingAgent) => {
    const { current_mood } = agent;
    
    return (
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getMoodEmoji(current_mood.mood_description)}</span>
            <span className="font-medium text-white">{agent.name}</span>
            <span className="text-xs text-slate-400">{agent.role}</span>
          </div>
          <span className={`text-xs font-medium ${getMoodColor(current_mood.energy, current_mood.stress)}`}>
            {current_mood.mood_description}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Energy</span>
              <span className="text-slate-300">{Math.round(current_mood.energy)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div 
                className="bg-green-400 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${current_mood.energy}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Focus</span>
              <span className="text-slate-300">{Math.round(current_mood.focus)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div 
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${current_mood.focus}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Confidence</span>
              <span className="text-slate-300">{Math.round(current_mood.confidence)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div 
                className="bg-purple-400 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${current_mood.confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stress indicator */}
        {current_mood.stress > 50 && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-orange-400">
            <AlertCircle className="h-3 w-3" />
            <span>Feeling stressed - might need encouragement</span>
          </div>
        )}
        
        {/* Social energy indicator */}
        {current_mood.social_energy < 30 && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-blue-400">
            <Coffee className="h-3 w-3" />
            <span>Low social energy - prefers focused work</span>
          </div>
        )}
      </div>
    );
  };

  const renderInteractiveActions = (message: ChatMessage) => {
    if (message.type !== 'agent' || !message.agent_response) return null;
    
    const feedback = userFeedback[message.id];
    
    return (
      <div className="flex items-center space-x-2 mt-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleUserFeedback(message.id, 'positive')}
            className={`p-1 rounded-full transition-colors ${
              feedback === 'positive' 
                ? 'bg-green-500/20 text-green-400' 
                : 'hover:bg-slate-700/50 text-slate-400 hover:text-green-400'
            }`}
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleUserFeedback(message.id, 'negative')}
            className={`p-1 rounded-full transition-colors ${
              feedback === 'negative' 
                ? 'bg-red-500/20 text-red-400' 
                : 'hover:bg-slate-700/50 text-slate-400 hover:text-red-400'
            }`}
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
        </div>
        
        <span className="text-xs text-slate-500">
          {feedback === 'positive' && '👍 Helpful response'}
          {feedback === 'negative' && '👎 Could be better'}
          {!feedback && 'Was this helpful?'}
        </span>
        
        {message.agent_response.mood_change && (
          <div className="flex items-center space-x-1 text-xs text-purple-400">
            <TrendingUp className="h-3 w-3" />
            <span>Mood updated: {message.agent_response.mood_change.reason}</span>
          </div>
        )}
      </div>
    );
  };

  const renderAgentResponse = (message: ChatMessage) => {
    if (!message.agent_response) return null;
    
    const { agent, response, processing_time, agent_state } = message.agent_response;
    
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
              {getMoodEmoji(agent.current_mood?.mood_description || 'neutral')}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-white">{agent.name}</span>
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                  {agent.role}
                </span>
                <div className={`flex items-center space-x-1 text-xs ${getMoodColor(agent.current_mood?.energy || 50, agent.current_mood?.stress || 20)}`}>
                  <Activity className="h-3 w-3" />
                  <span>{agent.current_mood?.mood_description || 'neutral'}</span>
                </div>
              </div>
              
              <div className="text-slate-200 text-sm leading-relaxed mb-3">
                {response}
              </div>

              {renderInteractiveActions(message)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    switch (message.type) {
      case 'user':
        return (
          <div className="flex items-start space-x-3 justify-end">
            <div className="max-w-3xl">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg px-4 py-3">
                <p className="text-white whitespace-pre-wrap">{message.content}</p>
              </div>
              <div className="flex items-center justify-end space-x-2 mt-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
              </div>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        );

      case 'agent':
        return (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 max-w-4xl">
              {renderAgentResponse(message)}
              <div className="flex items-center space-x-2 mt-2">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="flex justify-center">
            <div className="bg-slate-700/50 rounded-full px-4 py-2 border border-slate-600">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">{message.content}</span>
                <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Context Agent Status - Individual for current chat */}
      {contextAgents.length > 0 && (
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center space-x-2 mb-3">
            {activeView.type === 'dm' ? (
              <>
                <MessageCircle className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Agent Status</span>
                <span className="text-xs text-slate-500">Direct conversation</span>
              </>
            ) : (
              <>
                <Hash className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-300">Active Agents</span>
                <span className="text-xs text-slate-500">Channel participants</span>
              </>
            )}
          </div>
          <div className={`grid gap-3 ${
            activeView.type === 'dm' 
              ? 'grid-cols-1' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {contextAgents.map((agent: any) => renderAgentMoodBar(agent))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {activeView.type === 'channel' ? (
                <Hash className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              ) : (
                <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {activeView.type === 'channel' 
                  ? `Welcome to ${activeView.name}`
                  : `Direct message with ${activeView.name}`
                }
              </h3>
              <p className="text-slate-400 max-w-md mb-4">
                {activeView.type === 'channel' 
                  ? 'Collaborate with your living agents - they learn, grow, and develop relationships with you over time.'
                  : `Have a personal conversation with ${activeView.name}. They'll remember your preferences and adapt to your communication style.`
                }
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {activeView.type === 'dm' ? (
                  <>
                    <span className="text-xs bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                      💭 Ask for personal advice
                    </span>
                    <span className="text-xs bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30">
                      🎯 Get focused expertise
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                      🚀 "Should I build this feature?"
                    </span>
                    <span className="text-xs bg-gradient-to-r from-blue-500/20 to-green-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
                      📊 "What's the market opportunity?"
                    </span>
                    <span className="text-xs bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 px-3 py-1 rounded-full border border-orange-500/30">
                      ⚡ "How can I improve efficiency?"
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              {renderMessage(message)}
            </div>
          ))
        )}

        {isProcessing && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Brain className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3 border border-slate-600">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-slate-300">Living agents are thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;