import React from 'react';
import { LivingAgent } from '../services/livingAgentService';
import { ChatMessage } from '../types/living-agents';
import { INTERACTION_MODES } from '../types/interaction';
import { Hash, MessageCircle, User, Clock, Activity, TrendingUp } from 'lucide-react';

interface ChannelMessageProps {
  message: ChatMessage;
  channelType: 'channel' | 'dm';
  channelId: string;
  interactionMode?: string;
}

const ChannelMessage: React.FC<ChannelMessageProps> = ({ message, channelType, channelId, interactionMode = 'casual_chat' }) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
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

  if (message.type === 'user') {
    const messageClass = channelType === 'dm' ? 'dm-message' : 'channel-message';
    
    return (
      <div className={`flex items-start space-x-3 p-3 ${messageClass}`}>
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-white">You</span>
            <span className={`channel-indicator ${channelId}`}>
              {channelType === 'channel' ? `#${channelId}` : 'DM'}
            </span>
            <span className="text-xs text-slate-400">{formatTimestamp(message.timestamp)}</span>
          </div>
          <p className={`message-content ${channelType === 'dm' ? 'text-slate-100 font-medium' : 'text-slate-200'} text-sm leading-relaxed`}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    return (
      <div className="flex items-center justify-center p-3">
        <div className="bg-slate-800/50 rounded-lg px-3 py-1">
          <span className="text-xs text-slate-400">{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.type === 'agent' && message.agent_response) {
    const { agent, response, processing_time, agent_state, mood_change } = message.agent_response;
    const isDM = channelType === 'dm';
    const mode = INTERACTION_MODES[interactionMode];

    return (
      <div className="space-y-4 p-4 bg-slate-800/20 rounded-lg">
        {/* Response Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {channelType === 'channel' ? (
              <Hash className="h-4 w-4 text-slate-400" />
            ) : (
              <MessageCircle className="h-4 w-4 text-slate-400" />
            )}
            <span className="text-sm font-medium text-slate-300">
              {isDM ? 'Direct Response' : 'Agent Response'}
            </span>
            <span className="text-xs text-slate-500">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
          {/* Interaction Mode Indicator */}
          <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded-full">
            <span className="text-xs">{mode?.icon || '💬'}</span>
            <span className="text-xs text-slate-400">{mode?.name || 'Chat'}</span>
          </div>
        </div>

        {/* Agent Response */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                {getMoodEmoji(agent.current_mood.mood_description)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-white">{agent.name}</span>
                  <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    {agent.role}
                  </span>
                  <div className={`flex items-center space-x-1 text-xs ${getMoodColor(agent.current_mood.energy, agent.current_mood.stress)}`}>
                    <Activity className="h-3 w-3" />
                    <span>{agent.current_mood.mood_description}</span>
                  </div>
                </div>
                
                <div className="text-slate-200 text-sm leading-relaxed mb-3">
                  {response}
                </div>

                {/* Mood change indicator */}
                {mood_change && (
                  <div className="mt-2 flex items-center space-x-2 text-xs text-purple-400 bg-purple-500/10 rounded-lg p-2">
                    <TrendingUp className="h-3 w-3" />
                    <span>Mood updated: {mood_change.reason}</span>
                  </div>
                )}

                {/* Processing time */}
                {processing_time && (
                  <div className="mt-2 flex items-center space-x-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>Processed in {processing_time.toFixed(2)}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mode-specific footer info */}
        {mode?.responseStyle === 'casual' && (
          <div className="text-xs text-slate-500 italic">
            💬 Casual conversation mode - responses are conversational and brief
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ChannelMessage;