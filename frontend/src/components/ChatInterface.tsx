import React, { useEffect, useRef } from 'react';
import { User, Brain, AlertCircle, Clock, TrendingUp, Users, Hash, MessageCircle } from 'lucide-react';
import { ChatMessage, COUNCIL_MEMBERS, CouncilMemberKey } from '../types/council';
import { ActiveView, CHANNELS, DIRECT_MESSAGES } from '../types/channels';
import ChannelMessage from './ChannelMessage';
import StrategicSynthesis from './StrategicSynthesis';
import CouncilMemberResponse from './CouncilMemberResponse';
import RecommendedActions from './RecommendedActions';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  activeView: ActiveView;
  interactionMode: string;
  onReply?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onCopy?: (content: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isProcessing, 
  activeView, 
  interactionMode,
  onReply,
  onForward,
  onDelete,
  onCopy
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderCouncilResponse = (message: ChatMessage) => {
    const response = message.council_response;
    if (!response) return null;

    return (
      <div className="space-y-4">
        {/* Enhanced Strategic Synthesis */}
        <StrategicSynthesis 
          synthesis={response.synthesis}
          processingTime={response.processing_time}
          confidenceScore={response.confidence_score}
        />

        {/* Individual Council Member Responses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-medium text-slate-200 flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-400" />
              <span>Council Member Analysis</span>
              <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">
                {response.council_responses.length} members
              </span>
            </h4>
            <span className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-600/30">
              💬 Click to expand detailed responses
            </span>
          </div>
          
          <div className="space-y-3">
            {response.council_responses.map((cr, index) => (
              <CouncilMemberResponse 
                key={index}
                response={cr}
                isInitiallyExpanded={index === 0} // First member expanded by default
              />
            ))}
          </div>
        </div>

        {/* Enhanced Recommended Actions */}
        {response.recommended_actions.length > 0 && (
          <RecommendedActions 
            actions={response.recommended_actions}
            confidenceScore={response.confidence_score}
          />
        )}
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

      case 'council':
        return (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 max-w-4xl">
              {renderCouncilResponse(message)}
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-scroll p-4 space-y-6 custom-scrollbar">
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
            <p className="text-slate-400 max-w-md">
              {activeView.type === 'channel' 
                ? CHANNELS[activeView.id]?.description || 'Channel-specific strategic discussions'
                : `Private conversation with ${activeView.name} for specialized expertise`
              }
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {activeView.type === 'dm' ? (
                <>
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    Ask for specific expertise
                  </span>
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    Get focused insights
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    "Should I build a voice interface?"
                  </span>
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    "What's the market opportunity?"
                  </span>
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                    "How should I prioritize features?"
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className="mb-6">
              <ChannelMessage
                message={message}
                channelType={activeView.type}
                channelId={activeView.id}
                interactionMode={interactionMode}
                onReply={onReply}
                onForward={onForward}
                onDelete={onDelete}
                onCopy={onCopy}
              />
            </div>
          ))}
        </div>
      )}

      {isProcessing && (
        <div className="flex items-start space-x-3 mb-6">
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
              <span className="text-sm text-slate-300">Council is deliberating...</span>
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