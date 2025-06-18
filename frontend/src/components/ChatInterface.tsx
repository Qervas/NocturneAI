import React, { useEffect, useRef } from 'react';
import { Brain, Hash, MessageCircle } from 'lucide-react';
import { ChatMessage } from '../types/council';
import { ActiveView, CHANNELS } from '../types/channels';
import ChannelMessage from './ChannelMessage';

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