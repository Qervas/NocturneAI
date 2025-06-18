import React, { useState, useEffect, useRef } from 'react';
import { Send, Crown, Brain, Users, Zap, Hash, MessageCircle, Clock, Search, Terminal } from 'lucide-react';
import { 
  ChatMessage, 
  IntelligenceResponse, 
  WebSocketMessage, 
  ConnectionState,
  COUNCIL_MEMBERS,
  CouncilMemberKey 
} from './types/council';
import { CHANNELS, DIRECT_MESSAGES, ActiveView } from './types/channels';
import { INTERACTION_MODES } from './types/interaction';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ChannelSwitchIndicator from './components/ChannelSwitchIndicator';
import InteractionModeSelector from './components/InteractionModeSelector';
import ConversationHistory from './components/ConversationHistory';
import AIProviderIndicator from './components/Chat/AIProviderIndicator';
import GlobalSearch from './components/GlobalSearch';
import DebugConsole from './components/DebugConsole';
import ForwardMessageModal from './components/ForwardMessageModal';
import ReplyIndicator from './components/ReplyIndicator';
import { usePersistedMessages } from './hooks/usePersistedState';
import DeleteMessageModal from './components/DeleteMessageModal';
import './App.css';
import './styles/scrollbar.css';

interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
}

const App: React.FC = () => {
  // Channel-specific message history with localStorage persistence
  const [channelMessages, setChannelMessages] = usePersistedMessages();
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    // Restore last active channel from localStorage
    try {
      const saved = localStorage.getItem('ie-active-view');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to restore active view:', error);
    }
    // Default to general channel
    return {
      type: 'channel',
      id: 'general',
      name: '# general'
    };
  });
  const [previousView, setPreviousView] = useState<ActiveView | undefined>(undefined);
  const [interactionMode, setInteractionMode] = useState<string>('casual_chat');
  const [showHistory, setShowHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  // Debug logging functions
  const addDebugLog = (level: DebugLogEntry['level'], source: string, message: string) => {
    const logEntry: DebugLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level,
      source,
      message
    };
    
    setDebugLogs(prev => [...prev, logEntry]);
    console.log(`[${source}] ${message}`);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  // Get messages for current active view (filter out system messages)
  const getCurrentMessages = (): ChatMessage[] => {
    const channelKey = getChannelKey(activeView.type, activeView.id);
    const messages = channelMessages[channelKey] || [];
    // Filter out system messages as they now go to debug console
    return messages.filter(msg => msg.type !== 'system');
  };
  
  // Generate consistent channel key
  const getChannelKey = (type: string, id: string): string => {
    return `${type}-${id}`;
  };
  
  // Add message to specific channel
  const addMessageToChannel = (message: ChatMessage, channelKey?: string) => {
    const targetKey = channelKey || getChannelKey(activeView.type, activeView.id);
    console.log(`Adding message to channel: ${targetKey}`, message.type);
    setChannelMessages(prev => ({
      ...prev,
      [targetKey]: [...(prev[targetKey] || []), message]
    }));
  };
  
  // Handle view changes (channel switching)
  const handleViewChange = (newView: ActiveView) => {
    const oldKey = getChannelKey(activeView.type, activeView.id);
    const newKey = getChannelKey(newView.type, newView.id);
    console.log(`Switching from ${oldKey} to ${newKey}`);
    setPreviousView(activeView);
    setActiveView(newView);
    setIsProcessing(false); // Reset processing state when switching channels
    
    // Save current channel to localStorage
    try {
      localStorage.setItem('ie-active-view', JSON.stringify(newView));
    } catch (error) {
      console.warn('Failed to save active view:', error);
    }
  };

  // Auto-load conversation history when switching channels
  useEffect(() => {
    const loadChannelHistory = async () => {
      const channelKey = getChannelKey(activeView.type, activeView.id);
      
      // Only load if we don't have messages for this channel
      if (!channelMessages[channelKey] || channelMessages[channelKey].length === 0) {
        try {
          const response = await fetch(
            `/api/v1/conversations/${activeView.type}/${activeView.id}/history?limit=20`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
              // Convert history messages to ChatMessage format
              const historyMessages: ChatMessage[] = data.messages.map((msg: any) => ({
                id: msg.id,
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp,
                sender: msg.sender,
                council_response: msg.council_response
              }));
              
              setChannelMessages(prev => ({
                ...prev,
                [channelKey]: historyMessages
              }));
              
              console.log(`Auto-loaded ${historyMessages.length} messages for ${channelKey}`);
            }
          }
        } catch (error) {
          console.error('Failed to auto-load conversation history:', error);
        }
      }
    };

    loadChannelHistory();
  }, [activeView]);

  // Initialize WebSocket connection and load all conversations on startup
  useEffect(() => {
    cleanupOldSystemMessages();
    connectWebSocket();
    loadAllConversationsOnStartup();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Clean up old system messages from localStorage
  const cleanupOldSystemMessages = () => {
    setChannelMessages(prev => {
      const cleaned: Record<string, ChatMessage[]> = {};
      Object.keys(prev).forEach(channelKey => {
        // Remove system messages from all channels
        cleaned[channelKey] = prev[channelKey].filter(msg => msg.type !== 'system');
      });
      addDebugLog('info', 'Cleanup', 'Removed old system messages from chat history');
      return cleaned;
    });
  };

  // Load all conversations on app startup for offline availability
  const loadAllConversationsOnStartup = async () => {
    console.log('🔄 Loading all conversations on startup...');
    setIsInitialLoading(true);
    
    try {
      // Load all known channels and DMs
      const allChannels = [
        ...Object.values(CHANNELS).map(ch => ({ type: 'channel' as const, id: ch.id, name: ch.name })),
        ...Object.values(DIRECT_MESSAGES).map(dm => ({ type: 'dm' as const, id: dm.id, name: dm.memberName }))
      ];

      // Load each channel's history in parallel
      const loadPromises = allChannels.map(async (channel) => {
        const channelKey = getChannelKey(channel.type, channel.id);
        
        // Skip if we already have messages for this channel
        if (channelMessages[channelKey] && channelMessages[channelKey].length > 0) {
          return;
        }

        try {
          const response = await fetch(
            `/api/v1/conversations/${channel.type}/${channel.id}/history?limit=100`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
              const historyMessages: ChatMessage[] = data.messages.map((msg: any) => ({
                id: msg.id,
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp,
                sender: msg.sender,
                council_response: msg.council_response
              }));
              
              setChannelMessages(prev => ({
                ...prev,
                [channelKey]: historyMessages
              }));
              
              console.log(`✅ Loaded ${historyMessages.length} messages for ${channelKey}`);
            }
          }
        } catch (error) {
          console.warn(`❌ Failed to load ${channelKey}:`, error);
        }
      });

      await Promise.all(loadPromises);
      console.log('✅ All conversations loaded on startup');
      
    } catch (error) {
      console.error('❌ Failed to load conversations on startup:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const connectWebSocket = () => {
    setConnectionState(prev => ({ ...prev, status: 'connecting' }));
    
    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000/ws/council';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setConnectionState({
        status: 'connected',
        lastConnected: new Date().toISOString(),
        reconnectAttempts: 0
      });
      
      addDebugLog('info', 'WebSocket', 'Connected to Intelligence Empire Council');
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
      
      addDebugLog('warning', 'WebSocket', 'Disconnected from Intelligence Empire Council');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (connectionState.reconnectAttempts < 5) {
          addDebugLog('info', 'WebSocket', 'Attempting to reconnect...');
          connectWebSocket();
        } else {
          addDebugLog('error', 'WebSocket', 'Max reconnection attempts reached');
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
        addDebugLog('info', 'WebSocket', message.message || 'Connected to council');
        break;
        
      case 'processing':
        setIsProcessing(true);
        addDebugLog('debug', 'AI', 'Council is analyzing query...');
        break;
        
      case 'response':
        setIsProcessing(false);
        if (message.data) {
          // Update the user message with the database ID if available
          if ((message.data as any).user_message_id) {
            const targetChannelKey = getTargetChannelKey(message.data);
            setChannelMessages(prev => {
              const updated = { ...prev };
              // Find the most recent user message in the target channel and update its ID
              if (updated[targetChannelKey]) {
                const messages = updated[targetChannelKey];
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].type === 'user' && messages[i].content === (message.data as any).query) {
                    messages[i] = { ...messages[i], id: (message.data as any).user_message_id };
                    break;
                  }
                }
              }
              return updated;
            });
            addDebugLog('info', 'Messages', `WebSocket: Updated user message ID to database ID: ${(message.data as any).user_message_id}`);
          }
          
          // Route response to correct channel
          const targetChannelKey = getTargetChannelKey(message.data);
          addDebugLog('debug', 'Routing', `Response routed to: ${targetChannelKey}`);
          addCouncilResponseToChannel(message.data, targetChannelKey);
        }
        break;
        
      case 'error':
        setIsProcessing(false);
        addDebugLog('error', 'WebSocket', message.message || 'Unknown error');
        break;
    }
  };

  // Get target channel key from response data
  const getTargetChannelKey = (response: IntelligenceResponse): string => {
    if (response.channel_id && response.channel_type) {
      // Use the exact channel info from backend
      return getChannelKey(response.channel_type, response.channel_id);
    }
    // Fallback to current active view
    return getChannelKey(activeView.type, activeView.id);
  };

  // System messages now go to debug console instead of chat

  const addCouncilResponse = (response: IntelligenceResponse) => {
    const councilMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'council',
      content: response.synthesis,
      timestamp: response.timestamp,
      council_response: response
    };
    addMessageToChannel(councilMessage);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    // Add user message to current channel (with temporary ID that will be updated)
    const tempMessageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: tempMessageId,
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      reply_to: replyingTo ? {
        message_id: replyingTo.id,
        content: replyingTo.content,
        sender: replyingTo.type === 'user' ? 'You' : replyingTo.sender || 'Council',
        timestamp: replyingTo.timestamp
      } : undefined
    };
    addMessageToChannel(userMessage);
    addDebugLog('debug', 'Messages', `Added user message with temporary ID: ${tempMessageId}`);
    
    addDebugLog('debug', 'Chat', `Sending ${replyingTo ? 'reply' : 'message'} to ${activeView.type}/${activeView.id}`);
    
    // Clear reply state
    if (replyingTo) {
      setReplyingTo(null);
    }

    // Determine target members based on active view
    let requestedMembers: string[] | undefined;
    
    if (activeView.type === 'channel') {
      const channel = CHANNELS[activeView.id];
      if (channel) {
        requestedMembers = channel.primaryMembers;
      }
    } else if (activeView.type === 'dm') {
      // For DMs, extract member key from DM id
      const memberKey = activeView.id.replace('dm-', '');
      requestedMembers = [memberKey];
    }

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const wsMessage: any = {
        type: 'query',
        message: inputMessage,
        requested_members: requestedMembers,
        channel: activeView.id,
        interaction_mode: interactionMode,
        timestamp: new Date().toISOString()
      };
      
      // Include reply context if replying to a message
      if (replyingTo) {
        wsMessage.reply_context = {
          original_message_id: replyingTo.id,
          original_content: replyingTo.content,
          original_sender: replyingTo.type === 'user' ? 'User' : replyingTo.sender || 'Council',
          original_timestamp: replyingTo.timestamp
        };
        addDebugLog('debug', 'Chat', `Including reply context for message ${replyingTo.id}`);
      }
      
      wsRef.current.send(JSON.stringify(wsMessage));
    } else {
      // Fallback to REST API
      await sendRestQuery(inputMessage, requestedMembers);
    }

    setInputMessage('');
    setIsProcessing(true);
  };

  const sendRestQuery = async (message: string, requestedMembers?: string[]) => {
    try {
      const requestBody: any = { 
        message,
        interaction_mode: interactionMode,
        channel_id: activeView.id,  // Include channel context
        requested_members: requestedMembers
      };
      
      // Include reply context if replying to a message
      if (replyingTo) {
        requestBody.reply_context = {
          original_message_id: replyingTo.id,
          original_content: replyingTo.content,
          original_sender: replyingTo.type === 'user' ? 'User' : replyingTo.sender || 'Council',
          original_timestamp: replyingTo.timestamp
        };
        addDebugLog('debug', 'Chat', `REST API including reply context for message ${replyingTo.id}`);
      }

      const response = await fetch('/api/v1/council/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        // Update the user message with the database ID
        if (data.response.user_message_id) {
          const currentChannelKey = getChannelKey(activeView.type, activeView.id);
          setChannelMessages(prev => {
            const updated = { ...prev };
            // Find the most recent user message in the current channel and update its ID
            if (updated[currentChannelKey]) {
              const messages = updated[currentChannelKey];
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].type === 'user' && messages[i].content === message) {
                  messages[i] = { ...messages[i], id: data.response.user_message_id };
                  break;
                }
              }
            }
            return updated;
          });
          addDebugLog('info', 'Messages', `Updated user message ID to database ID: ${data.response.user_message_id}`);
        }
        
        // Route response to correct channel with database ID
        const targetChannelKey = getTargetChannelKey(data.response);
        console.log(`REST response routing to: ${targetChannelKey}`);
        addCouncilResponseToChannel(data.response, targetChannelKey);
      } else {
        addDebugLog('error', 'API', data.error || 'Unknown error');
      }
    } catch (error) {
      addDebugLog('error', 'Network', `API request failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const addCouncilResponseToChannel = (response: IntelligenceResponse, channelKey?: string) => {
    const councilMessage: ChatMessage = {
      id: (response as any).council_message_id || Date.now().toString(), // Use database ID if available
      type: 'council',
      content: response.synthesis,
      timestamp: response.timestamp,
      council_response: response
    };
    
    // Use specified channel or current active view
    const targetKey = channelKey || getChannelKey(activeView.type, activeView.id);
    console.log(`Adding council response to: ${targetKey}`);
    addMessageToChannel(councilMessage, targetKey);
  };

  // Handle loading history from ConversationHistory component
  const handleLoadHistory = (historyMessages: ChatMessage[]) => {
    const channelKey = getChannelKey(activeView.type, activeView.id);
    
    // Replace current messages with history
    setChannelMessages(prev => ({
      ...prev,
      [channelKey]: historyMessages
    }));
    
    console.log(`Loaded ${historyMessages.length} messages from history for ${channelKey}`);
  };

  // Navigate to specific message in search results
  const handleNavigateToMessage = (channelType: string, channelId: string, messageId: string) => {
    console.log(`Navigating to message ${messageId} in ${channelType}/${channelId}`);
    
    // Switch to the target channel
    const newView: ActiveView = {
      type: channelType as 'channel' | 'dm',
      id: channelId,
      name: channelType === 'dm' ? 
        Object.values(DIRECT_MESSAGES).find(dm => dm.id === channelId)?.memberName || channelId :
        Object.values(CHANNELS).find(ch => ch.id === channelId)?.displayName || `# ${channelId}`
    };
    
    handleViewChange(newView);
    
    // TODO: Scroll to specific message when message highlighting is implemented
    // For now, just switching to the channel is sufficient
  };

  // Message action handlers
  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingTo(message);
    addDebugLog('debug', 'UI', `Replying to message: ${message.content.substring(0, 50)}...`);
  };

  const handleForwardMessage = (message: ChatMessage) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    addDebugLog('debug', 'UI', `Opening forward modal for message: ${message.content.substring(0, 50)}...`);
  };

  const handleDeleteMessage = (message: ChatMessage) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
    addDebugLog('debug', 'UI', `Opening delete modal for message: ${message.content.substring(0, 50)}...`);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;

    setIsDeleting(true);
    
    try {
      // Remove message from UI immediately (Discord-style deletion)
      setChannelMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(channelKey => {
          updated[channelKey] = updated[channelKey].filter(msg => msg.id !== messageToDelete.id);
        });
        return updated;
      });
      
      addDebugLog('info', 'Messages', `Message ${messageToDelete.id} removed from UI`);
      
      // Call backend API to delete message
      const response = await fetch(`/api/v1/messages/${messageToDelete.id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // Message not found in database - likely a temporary message that wasn't saved yet
          // Just keep the UI deletion and log a warning
          addDebugLog('warning', 'Messages', `Message ${messageToDelete.id} not found in database - treating as temporary message`);
        } else {
          throw new Error(`Failed to delete message: ${response.statusText}`);
        }
      } else {
        const result = await response.json();
        addDebugLog('info', 'Messages', `Message deleted successfully: ${result.message}`);
      }
      
      // Close modal and reset state (whether backend deletion succeeded or message was temporary)
      setShowDeleteModal(false);
      setMessageToDelete(null);
      
    } catch (error) {
      // Restore message to UI if backend deletion failed
      setChannelMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(channelKey => {
          // Only restore if the message isn't already there
          const messageExists = updated[channelKey].some(msg => msg.id === messageToDelete.id);
          if (!messageExists) {
            // Find the original position and restore the message
            updated[channelKey].push(messageToDelete);
            // Sort by timestamp to maintain order
            updated[channelKey].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          }
        });
        return updated;
      });
      
      addDebugLog('error', 'Messages', `Failed to delete message, restored to UI: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteMessage = () => {
    setShowDeleteModal(false);
    setMessageToDelete(null);
    addDebugLog('debug', 'UI', 'Delete cancelled');
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      addDebugLog('info', 'UI', `Message copied to clipboard (${content.length} chars)`);
    }).catch(() => {
      addDebugLog('error', 'UI', 'Failed to copy message to clipboard');
    });
  };

  const handleForwardToChannel = (targetChannelType: string, targetChannelId: string, message: ChatMessage) => {
    if (!message) return;
    
    // Create forwarded message
    const forwardedMessage: ChatMessage = {
      id: Date.now().toString() + '_forwarded',
      type: 'user',
      content: message.content,
      timestamp: new Date().toISOString(),
      forwarded_from: {
        channel_id: activeView.id,
        channel_type: activeView.type,
        channel_name: activeView.name,
        original_sender: message.type === 'user' ? 'You' : message.sender || 'Council',
        original_timestamp: message.timestamp
      }
    };
    
    // Add to target channel
    const targetChannelKey = getChannelKey(targetChannelType, targetChannelId);
    addMessageToChannel(forwardedMessage, targetChannelKey);
    
    // Get target channel name for logging
    const targetName = targetChannelType === 'dm' ? 
      Object.values(DIRECT_MESSAGES).find(dm => dm.id === targetChannelId)?.memberName :
      Object.values(CHANNELS).find(ch => ch.id === targetChannelId)?.displayName;
    
    addDebugLog('info', 'Messages', `Message forwarded to ${targetName}`);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    addDebugLog('debug', 'UI', 'Reply cancelled');
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
        <div className="max-w-[95vw] mx-auto px-4 py-3">
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
              {/* Search Button */}
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center space-x-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Search all conversations (Ctrl+K)"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Search</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs text-slate-500 bg-slate-700 border border-slate-600 rounded">
                  ⌘K
                </kbd>
              </button>

              {/* Debug Console Button */}
              <button
                onClick={() => setShowDebugConsole(!showDebugConsole)}
                className="flex items-center space-x-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Toggle debug console"
              >
                <Terminal className="h-4 w-4" />
                <span className="text-sm">Debug</span>
                {debugLogs.length > 0 && (
                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {debugLogs.length}
                  </span>
                )}
              </button>

              <AIProviderIndicator 
                provider="ollama"
                isProcessing={isProcessing}
              />
              
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

      {/* Discord/Slack Style Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
                 <Sidebar 
           activeView={activeView}
           onViewChange={handleViewChange}
           connectionStatus={connectionState.status}
           channelMessages={channelMessages}
         />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-800/30">
          {/* Channel/DM Header */}
          <div className="h-12 border-b border-slate-700 flex items-center px-4 bg-slate-800/50">
            <div className="flex items-center space-x-2">
              {activeView.type === 'channel' ? (
                <>
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-white">{activeView.name.replace('# ', '')}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    {CHANNELS[activeView.id]?.description}
                  </span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-white">{activeView.name}</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full ml-2" />
                  <span className="text-xs text-slate-400">Online</span>
                </>
              )}
            </div>
            
            <div className="ml-auto flex items-center space-x-4">
              {/* History Toggle Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 hover:bg-slate-600 rounded-lg transition-colors"
                title="Toggle Conversation History"
              >
                <Clock className="h-4 w-4 text-slate-300" />
                <span className="text-xs text-slate-300">History</span>
              </button>
              
              <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
                <Zap className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {connectionState.status.charAt(0).toUpperCase() + connectionState.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <ChatInterface
            messages={getCurrentMessages()}
            isProcessing={isProcessing}
            activeView={activeView}
            interactionMode={interactionMode}
            onReply={handleReplyToMessage}
            onForward={handleForwardMessage}
            onDelete={handleDeleteMessage}
            onCopy={handleCopyMessage}
          />

          {/* Reply Indicator */}
          {replyingTo && (
            <ReplyIndicator
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
            />
          )}

          {/* Input Area */}
          <div className="border-t border-slate-700 p-4 bg-slate-800/50">
            <div className="flex space-x-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    activeView.type === 'channel' 
                      ? `Message #${activeView.name.replace('# ', '')}...`
                      : `Message @${activeView.name}...`
                  }
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={1}
                  disabled={isProcessing}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Press Enter to send • Shift+Enter for new line
              </div>
              <div className="flex items-center space-x-3">
                {/* Compact Interaction Mode Selector */}
                <InteractionModeSelector
                  selectedMode={interactionMode}
                  onModeChange={setInteractionMode}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Channel Switch Indicator */}
        <ChannelSwitchIndicator
          activeView={activeView}
          previousView={previousView}
          connectionStatus={connectionState.status}
        />
        
        {/* Conversation History Panel */}
        <ConversationHistory
          activeView={activeView}
          onLoadHistory={handleLoadHistory}
          isVisible={showHistory}
          onToggleVisibility={() => setShowHistory(!showHistory)}
        />
      </div>

      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigateToMessage={handleNavigateToMessage}
      />

      {/* Debug Console */}
      <DebugConsole
        isVisible={showDebugConsole}
        onToggle={() => setShowDebugConsole(!showDebugConsole)}
        logs={debugLogs}
        onClearLogs={clearDebugLogs}
      />

      {/* Forward Message Modal */}
      {messageToForward && (
        <ForwardMessageModal
          isOpen={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setMessageToForward(null);
          }}
          message={messageToForward}
          onForward={handleForwardToChannel}
        />
      )}

      {/* Delete Message Modal */}
      {messageToDelete && (
        <DeleteMessageModal
          isOpen={showDeleteModal}
          onClose={cancelDeleteMessage}
          onConfirm={confirmDeleteMessage}
          message={messageToDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Initial Loading Overlay */}
      {isInitialLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-8 max-w-md text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Loading Intelligence Empire</h3>
            <p className="text-slate-400">Synchronizing all conversations...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App; 