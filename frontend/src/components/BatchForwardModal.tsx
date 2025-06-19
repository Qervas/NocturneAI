import React, { useState } from 'react';
import { Send, X, Hash, MessageCircle } from 'lucide-react';
import { CHANNELS, DIRECT_MESSAGES } from '../types/channels';

interface BatchForwardModalProps {
  isOpen: boolean;
  messageCount: number;
  onForward: (targetChannelType: string, targetChannelId: string) => void;
  onCancel: () => void;
}

const BatchForwardModal: React.FC<BatchForwardModalProps> = ({
  isOpen,
  messageCount,
  onForward,
  onCancel
}) => {
  const [selectedTarget, setSelectedTarget] = useState<{type: string, id: string, name: string} | null>(null);

  if (!isOpen) return null;

  const handleForward = () => {
    if (selectedTarget) {
      onForward(selectedTarget.type, selectedTarget.id);
    }
  };

  const channels = Object.values(CHANNELS);
  const directMessages = Object.values(DIRECT_MESSAGES);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Send className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Forward Messages</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Forward {messageCount} selected message{messageCount > 1 ? 's' : ''} to:
          </p>

          {/* Channel Selection */}
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {/* Channels */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                Channels
              </h4>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedTarget({
                      type: 'channel',
                      id: channel.id,
                      name: channel.displayName
                    })}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedTarget?.type === 'channel' && selectedTarget?.id === channel.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{channel.icon}</span>
                      <span>{channel.displayName}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{channel.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <MessageCircle className="h-4 w-4 mr-1" />
                Direct Messages
              </h4>
              <div className="space-y-1">
                {directMessages.map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => setSelectedTarget({
                      type: 'dm',
                      id: dm.id,
                      name: dm.memberName
                    })}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedTarget?.type === 'dm' && selectedTarget?.id === dm.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${dm.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                      <span>{dm.memberName}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedTarget}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="h-4 w-4 mr-2" />
            Forward {messageCount} Message{messageCount > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchForwardModal; 