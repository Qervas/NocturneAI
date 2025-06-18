import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, Calendar, User } from 'lucide-react';

interface SearchResult {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  channel_id: string;
  channel_type: string;
  channel_name: string;
  message_type: string;
  snippet: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (channelType: string, channelId: string, messageId: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onNavigateToMessage }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ie-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('ie-recent-searches', JSON.stringify(updated));
  };

  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      console.log('🔍 GlobalSearch: Empty query, clearing results');
      setResults([]);
      return;
    }

    console.log(`🔍 GlobalSearch: Starting search for "${searchQuery}"`);
    setIsSearching(true);
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20'
      });
      
      const searchUrl = `/api/v1/conversations/search?${params}`;
      console.log(`🔍 GlobalSearch: Calling API: ${searchUrl}`);
      
      const response = await fetch(searchUrl);
      console.log(`🔍 GlobalSearch: API response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 GlobalSearch: Search response data:', data);
        console.log(`🔍 GlobalSearch: Found ${data.results?.length || 0} results`);
        
        if (data.results && data.results.length > 0) {
          console.log('🔍 GlobalSearch: First result:', data.results[0]);
        }
        
        setResults(data.results || []);
        saveRecentSearch(searchQuery);
        
        console.log(`✅ GlobalSearch: Search completed successfully - ${data.results?.length || 0} results`);
      } else {
        console.error('❌ GlobalSearch: Search failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ GlobalSearch: Error details:', errorText);
        setResults([]);
      }
    } catch (error) {
      console.error('🚨 GlobalSearch: Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  // Search as you type with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log(`🔍 GlobalSearch: Auto-searching after typing: "${query}"`);
      performSearch(query);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onNavigateToMessage(result.channel_type, result.channel_id, result.id);
    onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('ie-recent-searches');
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get channel display name
  const getChannelDisplayName = (result: SearchResult) => {
    if (result.channel_type === 'dm') {
      return `DM with ${result.channel_id.replace('dm-', '')}`;
    }
    return `# ${result.channel_id}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Search Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>

        {/* Content Area */}
        <div className="max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Recent Searches</h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 rounded transition-colors"
                  >
                    {recentQuery}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-400">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </h3>
                  {results.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-blue-300">
                            {getChannelDisplayName(result)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTimestamp(result.timestamp)}</span>
                        </div>
                      </div>
                      
                      {result.sender && (
                        <div className="flex items-center space-x-1 mb-2">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">{result.sender}</span>
                        </div>
                      )}

                      <p className="text-sm text-gray-300 line-clamp-2">
                        {result.snippet || result.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : query ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No messages found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try different keywords or check your spelling
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded">Ctrl+K</kbd> to search
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch; 