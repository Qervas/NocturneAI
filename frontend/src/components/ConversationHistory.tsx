import React, { useState, useEffect } from 'react';
import { Search, Clock, MessageCircle, Hash, ChevronUp } from 'lucide-react';
import { ChatMessage } from '../types/council';
import { ActiveView } from '../types/channels';

interface ConversationHistoryProps {
  activeView: ActiveView;
  onLoadHistory: (messages: ChatMessage[]) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  activeView,
  onLoadHistory,
  isVisible,
  onToggleVisibility
}) => {
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load conversation history when view changes
  useEffect(() => {
    if (isVisible) {
      // Reset pagination when switching channels
      setCurrentPage(0);
      setHasMore(true);
      setHistoryMessages([]);
      loadConversationHistory(0, true);
    }
  }, [activeView, isVisible]);

  const loadConversationHistory = async (page = 0, isReset = false) => {
    if (loading || (!hasMore && page > 0)) return;
    
    // Set appropriate loading state
    if (page === 0 || isReset) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const limit = 25; // Increased for better UX
      const offset = page * limit;
      
      const response = await fetch(
        `/api/v1/channels/${activeView.type}/${activeView.id}/messages?limit=${limit}&before=${offset > 0 ? 'some_message_id' : ''}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.messages && Array.isArray(data.messages)) {
          const historyMessages: ChatMessage[] = data.messages.map((msg: any) => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            sender: msg.sender,
            agent_name: msg.agent_name,
            agent_role: msg.agent_role,
            workflow_step: msg.workflow_step,
            council_response: msg.council_response,
            // Handle other message properties
            reply_to: msg.reply_to,
            forwarded_from: msg.forwarded_from
          }));
          
          if (isReset || page === 0) {
            setHistoryMessages(historyMessages);
          } else {
            setHistoryMessages(prev => [...prev, ...historyMessages]);
          }
          
          setHasMore(historyMessages.length === limit);
          setCurrentPage(page);
          setTotalMessages(data.total_messages || historyMessages.length + historyMessages.length);
          
          console.log(`📜 Loaded ${historyMessages.length} messages (page ${page}) for ${activeView.type}:${activeView.id}`);
        } else {
          console.error('Invalid data format');
        }
      } else {
        console.error('Failed to load conversation history:', response.status);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
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
        limit: '20'
      });

      const response = await fetch(`/api/v1/conversations/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search response:', data); // Debug log
        setSearchResults(data.results || []);
      } else {
        console.error('Failed to search conversations:', response.status, response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching conversations:', error);
      setSearchResults([]);
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
    if (!isLoadingMore && hasMore) {
      loadConversationHistory(currentPage + 1, false);
    }
  };

  // Auto-load more when scrolling near bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && hasMore && !isLoadingMore && !loading) {
      loadMoreHistory();
    }
  };

  const loadHistoryIntoChat = () => {
    if (historyMessages.length > 0) {
      // Convert to ChatMessage format with proper IntelligenceResponse structure
      const chatMessages: ChatMessage[] = historyMessages.map(msg => {
        const baseMessage: ChatMessage = {
          id: msg.id,
          type: msg.type as 'user' | 'council' | 'system' | 'forwarded',
          content: msg.content,
          timestamp: msg.timestamp,
          sender: msg.sender
        };

        // Convert council_response if it exists
        if (msg.council_response && msg.council_response.council_responses) {
          baseMessage.council_response = {
            query: msg.content,
            council_responses: msg.council_response.council_responses.map(cr => ({
              member_name: cr.member_name,
              role: { value: cr.role } as any, // Convert string to enum-like object
              message: cr.message,
              confidence_level: parseFloat(cr.confidence_level?.toString()) || 0.8,
              reasoning: cr.reasoning,
              suggested_actions: cr.suggested_actions,
              timestamp: cr.timestamp
            })),
            synthesis: msg.content, // Use message content as synthesis for history
            recommended_actions: [],
            confidence_score: 0.8,
            processing_time: 0,
            timestamp: msg.timestamp,
            response_type: activeView.type === 'dm' ? 'individual' : 'council',
            channel_id: activeView.id,
            channel_type: activeView.type
          };
        }

        return baseMessage;
      });
      
      onLoadHistory(chatMessages);
      console.log(`🔄 Loaded ${chatMessages.length} messages into active chat`);
    }
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
      <div className="flex-1 overflow-y-auto custom-scrollbar" onScroll={handleScroll}>
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
              Recent Messages ({historyMessages.length}
              {totalMessages > historyMessages.length && ` of ${totalMessages}`})
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
              <span className="ml-2 text-sm text-slate-400">Loading messages...</span>
            </div>
          ) : historyMessages.length > 0 ? (
            <div className="space-y-2">
              {historyMessages.map((message) => (
                <div
                  key={message.id}
                  className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-300">
                      {message.type === 'user' ? 'You' : message.sender || 'Council'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-3">{message.content}</p>
                </div>
              ))}

              {/* Load More Button / Loading Indicator */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  {isLoadingMore ? (
                    <div className="flex items-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                      <span className="ml-2 text-xs text-slate-400">Loading more...</span>
                    </div>
                  ) : (
                    <button
                      onClick={loadMoreHistory}
                      className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-slate-700/30 rounded transition-colors"
                    >
                      Load More Messages
                    </button>
                  )}
                </div>
              )}

              {!hasMore && historyMessages.length > 0 && (
                <div className="text-center py-2">
                  <span className="text-xs text-slate-500">
                    📜 All messages loaded ({historyMessages.length} total)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversation history yet</p>
              <p className="text-xs">Start chatting to build your history!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory; 