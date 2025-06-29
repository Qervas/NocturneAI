/**
 * Chat Wrapper - Complete Chat Experience
 * Integrates ChatInterface with input controls and state management
 * Supports both Fixed Council Members and Living Agents
 */

import React, { useState, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, Sparkles, History, X } from 'lucide-react';
import ChatInterface from './ChatInterface';
import ConversationHistory from './ConversationHistory';
import { ChatMessage } from '../types/living-agents';
import { ActiveView } from '../types/channels';
import { livingAgentService } from '../services/livingAgentService';
import { channelService } from '../services/channelService';
import Sidebar from './Sidebar';

interface ChatWrapperProps {
  className?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar?: string;
  type: 'council' | 'living';
  status: 'active' | 'inactive';
  mood?: string;
}

export const ChatWrapper: React.FC<ChatWrapperProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>({
    type: 'channel',
    id: '',
    name: 'Loading...'
  });
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [allAgents, setAllAgents] = useState<AgentInfo[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load agents and conversation history on mount
  useEffect(() => {
    loadAllAgents();
    loadConversationHistory();
    initializeActiveView();
  }, []);

  const initializeActiveView = () => {
    // Load the first available channel as default
    const channels = channelService.getChannels();
    if (channels.length > 0) {
      setActiveView({
        type: 'channel',
        id: channels[0].id,
        name: channels[0].displayName,
        channelData: channels[0]
      });
    }
  };

  const loadAllAgents = async () => {
    try {
      // Load living agents
      const livingAgentsData = await livingAgentService.getUserAgents('user-1');
      
      // Convert living agents to AgentInfo format with specialized colors/avatars
      const livingAgentInfos: AgentInfo[] = livingAgentsData.map(agent => {
        // Assign colors and avatars based on role
        let color = 'indigo';
        let avatar = '🤖';
        
        if (agent.role.includes('Product Strategy')) {
          color = 'purple';
          avatar = '👩‍💼';
        } else if (agent.role.includes('Market Intelligence')) {
          color = 'blue';
          avatar = '👨‍💼';
        } else if (agent.role.includes('UX Design')) {
          color = 'pink';
          avatar = '👩‍🎨';
        } else if (agent.role.includes('Operations')) {
          color = 'green';
          avatar = '👨‍💻';
        }
        
        return {
          id: agent.agent_id,
          name: agent.name,
          role: agent.role,
          color: color,
          avatar: avatar,
          type: 'living',
          status: 'active',
          mood: agent.current_mood.mood_description
        };
      });

      // All agents are now living agents
      setAllAgents(livingAgentInfos);
      
    } catch (error) {
      console.error('Failed to load agents:', error);
      // Fallback to empty array if living agents fail to load
      setAllAgents([]);
    }
  };

  const loadConversationHistory = async () => {
    try {
      // Try to load from localStorage or API
      const savedMessages = localStorage.getItem('intelligence-empire-chat-history');
      if (savedMessages) {
        const parsedMessages: ChatMessage[] = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const saveMessageToHistory = (message: ChatMessage) => {
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    
    // Save to localStorage
    try {
      localStorage.setItem('intelligence-empire-chat-history', JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to save message to history:', error);
    }
  };

  const handleSendMessageDirect = async (content: string) => {
    if (!content.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      sender: 'user',
      agent_name: 'You',
      type: 'user'
    };

    // Add user message immediately
    saveMessageToHistory(userMessage);
    setIsProcessing(true);

    try {
      if (activeView.type === 'channel') {
        // Council Discussion - use mock responses for now
        await handleCouncilMessage(content.trim());
      } else if (activeView.type === 'dm' && activeView.name) {
        // Direct Message - route based on agent type
        await handleDirectMessage(activeView.name, content.trim());
      } else {
        throw new Error('Invalid active view configuration');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message with better UX
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        content: 'I apologize, but I encountered a temporary issue processing your message. I\'m working on a response using my backup systems.',
        timestamp: new Date().toISOString(),
        sender: 'system',
        agent_name: 'System',
        type: 'system'
      };
      saveMessageToHistory(errorMessage);
      
      // Provide a mock response as fallback
      setTimeout(() => {
        const fallbackResponse = getMockResponse(content.trim());
        const fallbackMessage: ChatMessage = {
          id: `msg-${Date.now()}-fallback`,
          content: fallbackResponse,
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agent_name: activeView.type === 'dm' ? activeView.name : 'AI Council',
          agent_role: activeView.type === 'dm' ? 'AI Assistant' : 'Collaborative Intelligence',
          type: 'agent'
        };
        saveMessageToHistory(fallbackMessage);
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    await handleSendMessageDirect(inputMessage);
    setInputMessage('');
  };

  const handleCouncilMessage = async (message: string) => {
    // Mock council response for now - will be replaced with actual API
    setTimeout(() => {
      const councilResponse = getCouncilMockResponse(message);
      const agentMessage: ChatMessage = {
        id: `msg-${Date.now()}-council`,
        content: councilResponse,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agent_name: 'AI Council',
        agent_role: 'Collaborative Intelligence',
        type: 'agent'
      };
      saveMessageToHistory(agentMessage);
    }, 1000);
  };

  const handleDirectMessage = async (agentName: string, message: string) => {
    // Find the agent to determine if it's living or council
    const agent = allAgents.find(a => a.name === agentName);
    
    try {
      if (agent?.type === 'living') {
        // Try Living Agent API call first
        const response = await livingAgentService.interactWithAgent(agent.id, 'user-1', {
          user_input: message,
          context: {}
        });
        
        if (response.success && response.response) {
          const agentMessage: ChatMessage = {
            id: `msg-${Date.now()}-${agentName}`,
            content: response.response,
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agent_name: agentName,
            agent_role: agent.role,
            type: 'agent'
          };
          saveMessageToHistory(agentMessage);
          return; // Success, exit early
        }
      }
    } catch (error) {
      console.log('Living agent API unavailable, using mock response');
    }
    
    // Fallback to mock response
    setTimeout(() => {
      const mockResponse = getMockAgentResponse(agentName, message);
      const agentMessage: ChatMessage = {
        id: `msg-${Date.now()}-${agentName}`,
        content: mockResponse,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agent_name: agentName,
        agent_role: agent?.role || 'AI Assistant',
        type: 'agent'
      };
      saveMessageToHistory(agentMessage);
    }, 1000);
  };

  const getMockResponse = (message: string): string => {
    const responses = [
      `That's an interesting perspective on "${message.substring(0, 30)}...". Let me analyze this from multiple angles and provide you with strategic insights.`,
      `I understand you're asking about "${message.substring(0, 30)}...". Based on current trends and best practices, here's my recommendation.`,
      `Great question about "${message.substring(0, 30)}...". I'll help you explore the possibilities and identify the best path forward.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getCouncilMockResponse = (message: string): string => {
    const responses = [
      `🤝 **Council Consensus**: After collaborative analysis of your question about "${message.substring(0, 40)}...", we've reached a strategic recommendation. Our combined expertise suggests focusing on user-centric solutions with data-driven validation.`,
      `💡 **Strategic Synthesis**: The council has deliberated on "${message.substring(0, 40)}..." and identified key opportunities. We recommend a multi-phase approach that balances innovation with risk management.`,
      `🎯 **Unified Response**: Your inquiry about "${message.substring(0, 40)}..." has been analyzed from product, market, design, and operational perspectives. Here's our consolidated strategic guidance.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getMockAgentResponse = (agentName: string, message: string): string => {
    const responses = {
      'Sarah Chen': `🎯 **Product Strategy Insight**: Regarding "${message.substring(0, 40)}...", I recommend focusing on user value and data-driven frameworks. Let's prioritize features based on impact metrics and business objectives. Consider conducting user interviews to validate assumptions.`,
      'Marcus Rodriguez': `📊 **Market Intelligence**: About "${message.substring(0, 40)}...", I see significant market opportunities. Current trends show 23% growth in this sector. Key competitors are focusing on automation, but there's a gap in personalized experiences we could exploit.`,
      'Elena Vasquez': `🎨 **UX Design Perspective**: For "${message.substring(0, 40)}...", I'm thinking user-centered design. Let's create intuitive interfaces with accessibility at the core. I suggest prototyping with real users and iterating based on behavioral insights.`,
      'David Kim': `⚙️ **Operations Analysis**: Regarding "${message.substring(0, 40)}...", I love systematic approaches. Let's build scalable processes with proper monitoring. I recommend starting with MVP, measuring key metrics, and optimizing based on performance data.`,
      'Alex Thompson': `🤖 **Personal Assistant**: About "${message.substring(0, 40)}...", I'm here to coordinate and synthesize insights. Based on team discussions, I suggest a balanced approach that considers all stakeholder perspectives while maintaining focus on your core objectives.`
    };
    
    return responses[agentName as keyof typeof responses] || `🤖 Hello! I'm ${agentName}. Thanks for your message about "${message.substring(0, 40)}...". I'm here to help with my expertise. How can I assist you further?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageSelect = (messageId: string) => {
    if (isMultiSelectMode) {
      const newSelected = new Set(selectedMessages);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      setSelectedMessages(newSelected);
    }
  };

  const handleReply = (message: ChatMessage) => {
    setInputMessage(`@${message.agent_name} `);
  };

  const handleForward = (message: ChatMessage) => {
    console.log('Forward message:', message);
  };

  const handleDelete = (message: ChatMessage) => {
    const updatedMessages = messages.filter(msg => msg.id !== message.id);
    setMessages(updatedMessages);
    localStorage.setItem('intelligence-empire-chat-history', JSON.stringify(updatedMessages));
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Message copied to clipboard');
    });
  };

  const switchToAgent = (agentName: string) => {
    setActiveView({
      type: 'dm',
      id: agentName.toLowerCase().replace(' ', '-'),
      name: agentName
    });
  };

  const switchToCouncil = () => {
    setActiveView({
      type: 'channel',
      id: 'general',
      name: 'Council Discussion'
    });
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const handleLoadHistory = () => {
    // Reload conversation history
    loadConversationHistory();
  };

  return (
    <div className={`flex h-full ${className} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}>
      {/* Chat Sidebar for Channels/DMs */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        connectionStatus="connected"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex-shrink-0 bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {activeView.name}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {activeView.type === 'channel' ? 'Channel Discussion' : 'Direct Agent Communication'}
                  </p>
                </div>
              </div>
            </div>
            {/* Chat Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleHistory}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                title="View conversation history"
              >
                <History className="h-5 w-5 text-slate-400 hover:text-white" />
              </button>
            </div>
          </div>
        </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          isProcessing={isProcessing}
          activeView={activeView}
          interactionMode="enhanced"
          isMultiSelectMode={isMultiSelectMode}
          selectedMessages={selectedMessages}
          onSelect={handleMessageSelect}
          onReply={handleReply}
          onForward={handleForward}
          onDelete={handleDelete}
          onCopy={handleCopy}
        />
      </div>

      {/* Futuristic Input Area */}
      <div className="flex-shrink-0 bg-slate-800/50 backdrop-blur-xl border-t border-slate-700/50 p-4">
        {/* Quick Actions */}
        <div className="flex space-x-2 mb-3 overflow-x-auto">
          <button
            onClick={() => setInputMessage('What are the biggest opportunities for our product?')}
            className="px-3 py-1 text-xs bg-slate-700/50 text-slate-300 rounded-full hover:bg-slate-600/50 transition-colors whitespace-nowrap"
          >
            💡 Opportunities
          </button>
          <button
            onClick={() => setInputMessage('What risks should we be aware of?')}
            className="px-3 py-1 text-xs bg-slate-700/50 text-slate-300 rounded-full hover:bg-slate-600/50 transition-colors whitespace-nowrap"
          >
            ⚠️ Risk Analysis
          </button>
          <button
            onClick={() => setInputMessage('How should we prioritize our next features?')}
            className="px-3 py-1 text-xs bg-slate-700/50 text-slate-300 rounded-full hover:bg-slate-600/50 transition-colors whitespace-nowrap"
          >
            🎯 Prioritization
          </button>
          <button
            onClick={() => setInputMessage(`What's your expert opinion on...`)}
            className="px-3 py-1 text-xs bg-slate-700/50 text-slate-300 rounded-full hover:bg-slate-600/50 transition-colors whitespace-nowrap"
          >
            🧠 Expert Opinion
          </button>
          <button
            onClick={() => setInputMessage(`Can you analyze...`)}
            className="px-3 py-1 text-xs bg-slate-700/50 text-slate-300 rounded-full hover:bg-slate-600/50 transition-colors whitespace-nowrap"
          >
            📊 Analysis
          </button>
        </div>

        {/* Input Area */}
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${activeView.type === 'channel' ? 'Council' : activeView.name}...`}
              className="w-full p-4 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 backdrop-blur-sm"
              rows={1}
              style={{ minHeight: '56px', maxHeight: '120px' }}
            />
            
            {/* Input Actions */}
            <div className="absolute right-3 bottom-3 flex items-center space-x-2">
              <button className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-600/50">
                <Paperclip className="h-4 w-4" />
                  </button>
              <button className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-600/50">
                <Smile className="h-4 w-4" />
                  </button>
              <button className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-600/50">
                <Mic className="h-4 w-4" />
                  </button>
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="mt-2 text-xs text-slate-500 text-center">
          Press Enter to send • Shift + Enter for new line • Click <History className="inline h-3 w-3" /> for history
        </div>
      </div>

      {/* Floating History Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-full max-h-[90vh] bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl flex flex-col">
            {/* History Header */}
            <div className="flex-shrink-0 bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 rounded-t-2xl">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">📚 Conversation History</h2>
                    <p className="text-sm text-slate-400">Browse past conversations and interactions</p>
                  </div>
                </div>
                <button
                  onClick={toggleHistory}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400 hover:text-white" />
              </button>
              </div>
            </div>

            {/* History Content */}
            <div className="flex-1 overflow-hidden">
              <ConversationHistory 
                activeView={activeView}
                onLoadHistory={handleLoadHistory}
                isVisible={true}
                onToggleVisibility={toggleHistory}
              />
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 

export default ChatWrapper; 