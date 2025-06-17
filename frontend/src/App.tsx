import React, { useState, useEffect, useRef } from 'react';
import { Send, Crown, Brain, Users, Zap } from 'lucide-react';
import { 
  ChatMessage, 
  IntelligenceResponse, 
  WebSocketMessage, 
  ConnectionState,
  COUNCIL_MEMBERS,
  CouncilMemberKey 
} from './types/council';
import CouncilMemberCard from './components/CouncilMemberCard';
import ChatInterface from './components/ChatInterface';
import './App.css';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    setConnectionState(prev => ({ ...prev, status: 'connecting' }));
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/council';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setConnectionState({
        status: 'connected',
        lastConnected: new Date().toISOString(),
        reconnectAttempts: 0
      });
      
      addSystemMessage('🚀 Connected to Intelligence Empire Council');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      setConnectionState(prev => ({ 
        ...prev, 
        status: 'disconnected',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      
      addSystemMessage('❌ Disconnected from Intelligence Empire Council');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (connectionState.reconnectAttempts < 5) {
          connectWebSocket();
        }
      }, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionState(prev => ({ ...prev, status: 'error' }));
    };
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection':
        addSystemMessage(message.message || 'Connected to council');
        break;
        
      case 'processing':
        setIsProcessing(true);
        addSystemMessage('🧠 Your council is analyzing your query...');
        break;
        
      case 'response':
        setIsProcessing(false);
        if (message.data) {
          addCouncilResponse(message.data);
        }
        break;
        
      case 'error':
        setIsProcessing(false);
        addSystemMessage(`❌ Error: ${message.message}`);
        break;
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const addCouncilResponse = (response: IntelligenceResponse) => {
    const councilMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'council',
      content: response.synthesis,
      timestamp: response.timestamp,
      council_response: response
    };
    setMessages(prev => [...prev, councilMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'query',
        message: inputMessage,
        timestamp: new Date().toISOString()
      }));
    } else {
      // Fallback to REST API
      await sendRestQuery(inputMessage);
    }

    setInputMessage('');
    setIsProcessing(true);
  };

  const sendRestQuery = async (message: string) => {
    try {
      const response = await fetch('/api/v1/council/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        addCouncilResponse(data.response);
      } else {
        addSystemMessage(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      addSystemMessage(`❌ Network error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState.status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-8 w-8 text-yellow-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Intelligence Empire
                </h1>
                <p className="text-sm text-slate-400">Your Personal AI Council</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {connectionState.status.charAt(0).toUpperCase() + connectionState.status.slice(1)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-slate-400">
                <Users className="h-4 w-4" />
                <span className="text-sm">4 Council Members</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Council Members Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Brain className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold">AI Council</h2>
              </div>
              
              <div className="space-y-4">
                {Object.entries(COUNCIL_MEMBERS).map(([key, member]) => (
                  <CouncilMemberCard
                    key={key}
                    member={member}
                    isActive={connectionState.status === 'connected'}
                  />
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Status: <span className={getConnectionStatusColor()}>
                    {connectionState.status}
                  </span></p>
                  {connectionState.lastConnected && (
                    <p>Connected: {new Date(connectionState.lastConnected).toLocaleTimeString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 h-[70vh] flex flex-col">
              
              {/* Chat Header */}
              <div className="border-b border-slate-700 p-4">
                <h3 className="text-lg font-semibold">Council Session</h3>
                <p className="text-sm text-slate-400">
                  Ask strategic questions and get expert analysis from your AI council
                </p>
              </div>

              {/* Chat Messages */}
              <ChatInterface messages={messages} isProcessing={isProcessing} />

              {/* Input Area */}
              <div className="border-t border-slate-700 p-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask your AI council for strategic guidance..."
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={3}
                      disabled={isProcessing}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isProcessing}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-slate-400">
                  Press Enter to send • Shift+Enter for new line
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 