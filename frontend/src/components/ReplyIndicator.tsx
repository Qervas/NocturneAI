import React from 'react';
import { Reply, X } from 'lucide-react';
import { ChatMessage } from '../types/living-agents';

interface ReplyIndicatorProps {
  replyingTo: ChatMessage;
  onCancelReply: () => void;
}

const ReplyIndicator: React.FC<ReplyIndicatorProps> = ({ replyingTo, onCancelReply }) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getSenderName = (message: ChatMessage) => {
    if (message.type === 'user') return 'You';
    if (message.type === 'council') return 'Council';
    return 'System';
  };

  return (
    <div className="bg-slate-700/50 border-l-4 border-blue-500 p-3 mx-4 mb-2 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <Reply className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium text-blue-300">
                Replying to {getSenderName(replyingTo)}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(replyingTo.timestamp)}
              </span>
            </div>
            <div className="text-sm text-gray-300 truncate">
              {replyingTo.content.length > 100 
                ? `${replyingTo.content.substring(0, 100)}...` 
                : replyingTo.content
              }
            </div>
          </div>
        </div>
        <button
          onClick={onCancelReply}
          className="p-1 rounded hover:bg-gray-600 transition-colors flex-shrink-0"
          title="Cancel reply"
        >
          <X className="w-3 h-3 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
};

export default ReplyIndicator; 