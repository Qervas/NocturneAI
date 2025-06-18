import React, { useState, useEffect } from 'react';
import { Search, Clock, MessageCircle, Hash, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage } from '../types/council';
import { ActiveView } from '../types/channels';

interface ConversationHistoryProps {
  activeView: ActiveView;
  onLoadHistory: (messages: ChatMessage[]) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

interface HistoryMessage {
  id: string;
  type: 'user' | 'council' | 'system';
  content: string;
  sender?: string;
  timestamp: string;
  interaction_mode?: string;
  council_response?: {
    council_responses: Array<{
      member_name: string;
      role: string;
      message: string;
      confidence_level: string;
      reasoning: string;
      suggested_actions: string[];
      timestamp: string;
    }>;
  };
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  activeView,
  onLoadHistory,
  isVisible,
  onToggleVisibility
}) => {
  const [historyMessages, setHistoryMessages] = useState<HistoryMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Load conversation history when view changes
  useEffect(() => {
    if (isVisible) {
      loadConversationHistory();
    }
  }, [activeView, isVisible]);

  const loadConversationHistory = async (page = 0) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const limit = 20;
      const offset = page * limit;
      
      const response = await fetch(
        `/api/v1/conversations/${activeView.type}/${activeView.id}/history?limit=${limit}&offset=${offset}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (page === 0) {
          setHistoryMessages(data.messages || []);
        } else {
          setHistoryMessages(prev => [...prev, ...(data.messages || [])]);
        }
        
        setHasMore(data.messages?.length === limit);
        setCurrentPage(page);
      } else {
        console.error('Failed to load conversation history');
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchConversations = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        channel_id: activeView.id,
        channel_type: activeView.type,
        limit: '10'
      });

      const response = await fetch(`/api/v1/conversations/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        console.error('Failed to search conversations');
      }
    } catch (error) {
      console.error('Error searching conversations:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const loadMoreHistory = () => {
    if (!loading && hasMore) {
      loadConversationHistory(currentPage + 1);
    }
  };

  const convertToMessageFormat = (historyMsg: HistoryMessage): ChatMessage => {
    const baseMessage: ChatMessage = {
      id: historyMsg.id,
      type: historyMsg.type,
      content: historyMsg.content,
      timestamp: historyMsg.timestamp,
      sender: historyMsg.sender
    };

    if (historyMsg.council_response) {
      baseMessage.council_response = {
        query: historyMsg.content,
        council_responses: historyMsg.council_response.council_responses.map(cr => ({
          member_name: cr.member_name,
          role: cr.role,
          message: cr.message,
          confidence_level: parseFloat(cr.confidence_level) || 0.8,
          reasoning: cr.reasoning,
          suggested_actions: cr.suggested_actions,
          timestamp: cr.timestamp
        })),
        synthesis: '', // Will be filled from the response
        recommended_actions: [],
        confidence_score: 0.8,
        processing_time: 0,
        timestamp: historyMsg.timestamp,
        response_type: activeView.type === 'dm' ? 'individual' : 'council',
        channel_id: activeView.id,
        channel_type: activeView.type
      };
    }

    return baseMessage;
  };

  const loadHistoryIntoChat = () => {
    const chatMessages = historyMessages.map(convertToMessageFormat);
    onLoadHistory(chatMessages);
  };

  if (!isVisible) {
    return null; // Button will be in header instead
  }

  return (
    <div className="fixed right-4 top-16 bottom-4 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">History</h3>
          {activeView.type === 'channel' ? (
            <Hash className="h-4 w-4 text-slate-400" />
          ) : (
            <MessageCircle className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-sm text-slate-300">{activeView.name}</span>
        </div>
        <button
          onClick={onToggleVisibility}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-600">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchConversations()}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
        
        {searchQuery && (
          <button
            onClick={searchConversations}
            disabled={searchLoading}
            className="mt-2 w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div className="p-3 border-b border-slate-600">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Search Results</h4>
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-2">
                  <p className="text-sm text-slate-200 truncate">{result.content}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTimestamp(result.timestamp)} • {result.type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Messages */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-300">
              Recent Messages ({historyMessages.length})
            </h4>
            {historyMessages.length > 0 && (
              <button
                onClick={loadHistoryIntoChat}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors"
              >
                Load in Chat
              </button>
            )}
          </div>

          {loading && currentPage === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            </div>
          ) : historyMessages.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyMessages.map((message) => (
                <div key={message.id} className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {message.type === 'user' ? 'You' : 
                       message.type === 'council' ? 'Council' : 'System'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-200 line-clamp-3">
                    {message.content}
                  </p>
                  
                  {message.council_response && (
                    <div className="mt-2 pt-2 border-t border-slate-600">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-purple-400" />
                        <span className="text-xs text-purple-400">
                          {message.council_response.council_responses.length} members responded
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {message.interaction_mode && (
                    <div className="mt-1">
                      <span className="inline-block text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                        {message.interaction_mode.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={loadMoreHistory}
                  disabled={loading}
                  className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory; 