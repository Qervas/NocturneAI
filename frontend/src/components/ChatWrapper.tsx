/**
 * Chat System - Clean & Simple
 * Group chat with all agents and direct messages
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, Brain, User, Bot, Sparkles, Plus, Hash, X } from 'lucide-react';
import { dynamicAgentService, DynamicAgent } from '../services/dynamicAgentService';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  agentName?: string;
  agentRole?: string;
  agentId?: string;
  timestamp: string;
  isGroupChat?: boolean;
}

interface ChatView {
  type: 'group' | 'dm';
  id: string;
  name: string;
  agentId?: string;
}

export const ChatWrapper: React.FC = () => {
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<ChatView>({ type: 'group', id: 'council', name: 'Council Chat' });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
    loadMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadMessages();
  }, [currentView]);

  const loadAgents = async () => {
    try {
      const agentList = await dynamicAgentService.getAllAgents();
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadMessages = () => {
    const storageKey = `chat_messages_${currentView.type}_${currentView.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  };

  const saveMessages = (newMessages: ChatMessage[]) => {
    const storageKey = `chat_messages_${currentView.type}_${currentView.id}`;
    localStorage.setItem(storageKey, JSON.stringify(newMessages));
  };

  const addMessage = (message: ChatMessage) => {
    const newMessages = [...messages, message];
    setMessages(newMessages);
    saveMessages(newMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      isGroupChat: currentView.type === 'group'
    };

    addMessage(userMessage);
    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    try {
      if (currentView.type === 'group') {
        await handleGroupMessage(messageContent);
      } else {
        await handleDirectMessage(messageContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: 'Sorry, there was an error processing your message. Please try again.',
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      addMessage(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGroupMessage = async (content: string) => {
    try {
      const response = await dynamicAgentService.multiAgentInteraction({
        message: content,
        context: { channel: 'group_chat' }
      });

      if (response.success) {
        // Add synthesis message
        const synthesisMessage: ChatMessage = {
          id: `synthesis_${Date.now()}`,
          content: response.result.synthesis,
          sender: 'agent',
          agentName: 'Council',
          agentRole: 'Collective Intelligence',
          timestamp: new Date().toISOString(),
          isGroupChat: true
        };
        addMessage(synthesisMessage);

        // Add individual responses
        response.result.individual_responses.forEach((resp, index) => {
          const responseMessage: ChatMessage = {
            id: `agent_${Date.now()}_${index}`,
            content: resp.response,
            sender: 'agent',
            agentName: resp.agent_name,
            agentRole: resp.agent_role,
            timestamp: new Date().toISOString(),
            isGroupChat: true
          };
          addMessage(responseMessage);
        });
      }
    } catch (error) {
      console.error('Group chat error:', error);
      throw error;
    }
  };

  const handleDirectMessage = async (content: string) => {
    if (!currentView.agentId) return;

    try {
      const response = await dynamicAgentService.interactWithAgent(currentView.agentId, {
        message: content,
        context: { channel: 'direct_message' }
      });

      if (response.success) {
        const agentMessage: ChatMessage = {
          id: `agent_${Date.now()}`,
          content: response.response,
          sender: 'agent',
          agentName: response.agent_name,
          agentRole: response.agent_role,
          agentId: currentView.agentId,
          timestamp: new Date().toISOString(),
          isGroupChat: false
        };
        addMessage(agentMessage);
      }
    } catch (error) {
      console.error('Direct message error:', error);
      throw error;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const switchToGroup = () => {
    setCurrentView({ type: 'group', id: 'council', name: 'Council Chat' });
  };

  const switchToAgent = (agent: DynamicAgent) => {
    setCurrentView({
      type: 'dm',
      id: agent.profile.agent_id,
      name: agent.profile.name,
      agentId: agent.profile.agent_id
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAgentColor = (agentName: string) => {
    const colors = ['from-purple-500 to-pink-500', 'from-blue-500 to-cyan-500', 'from-green-500 to-teal-500', 'from-orange-500 to-red-500'];
    const hash = agentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.sender === 'user') {
      return (
        <div className="flex items-start space-x-3 justify-end">
          <div className="max-w-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl px-4 py-3 shadow-lg">
              <p className="text-white whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex items-center justify-end mt-1">
              <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
            </div>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      );
    }

    if (message.sender === 'agent') {
      return (
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 bg-gradient-to-r ${getAgentColor(message.agentName || 'Agent')} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 max-w-2xl">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-700/50 shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-white">{message.agentName}</span>
                {message.agentRole && (
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded-full">
                    {message.agentRole}
                  </span>
                )}
              </div>
              <p className="text-slate-200 whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex items-center mt-1">
              <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (message.sender === 'system') {
      return (
        <div className="flex justify-center">
          <div className="bg-slate-700/30 rounded-full px-4 py-2 border border-slate-600/50">
            <span className="text-sm text-slate-300">{message.content}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} transition-all duration-300 bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col`}>
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold text-white ${sidebarOpen ? 'block' : 'hidden'}`}>Chats</h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5 text-slate-400" /> : <Plus className="h-5 w-5 text-slate-400" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Group Chat */}
          <div className="p-2">
            <button
              onClick={switchToGroup}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                currentView.type === 'group' ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-slate-700/30'
              }`}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 text-left">
                  <div className="font-medium text-white">Council Chat</div>
                  <div className="text-xs text-slate-400">All agents</div>
                </div>
              )}
            </button>
          </div>

          {/* Direct Messages */}
          {sidebarOpen && (
            <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
              Direct Messages
            </div>
          )}
          <div className="p-2 space-y-1">
            {agents.map(agent => (
              <button
                key={agent.profile.agent_id}
                onClick={() => switchToAgent(agent)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  currentView.agentId === agent.profile.agent_id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-700/30'
                }`}
              >
                <div className={`w-10 h-10 bg-gradient-to-r ${getAgentColor(agent.profile.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-medium">{agent.profile.avatar_emoji || '🤖'}</span>
                </div>
                {sidebarOpen && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">{agent.profile.name}</div>
                    <div className="text-xs text-slate-400 truncate">{agent.profile.role}</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 p-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${
              currentView.type === 'group' ? 'from-purple-500 to-pink-500' : getAgentColor(currentView.name)
            } rounded-full flex items-center justify-center`}>
              {currentView.type === 'group' ? (
                <Users className="h-5 w-5 text-white" />
              ) : (
                <MessageCircle className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{currentView.name}</h2>
              <p className="text-sm text-slate-400">
                {currentView.type === 'group' ? 'Group conversation with all agents' : 'Direct message'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${
                  currentView.type === 'group' ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-cyan-500'
                } rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {currentView.type === 'group' ? 'Start a Council Discussion' : `Chat with ${currentView.name}`}
                </h3>
                <p className="text-slate-400 max-w-md">
                  {currentView.type === 'group' 
                    ? 'Get insights from all your agents working together'
                    : 'Have a focused conversation with your specialist'
                  }
                </p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id}>
                {renderMessage(message)}
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex items-center space-x-2 text-slate-400">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse animation-delay-200"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse animation-delay-400"></div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/50 backdrop-blur-xl border-t border-slate-700/50 p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${currentView.type === 'group' ? 'council' : currentView.name}...`}
                className="w-full p-4 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                rows={1}
                style={{ minHeight: '56px', maxHeight: '120px' }}
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 rounded-2xl transition-all duration-200 flex items-center justify-center min-w-[56px] h-14"
            >
              <Send className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWrapper; 