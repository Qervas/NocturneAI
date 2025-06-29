import React, { useState } from 'react';
import { X, Send, Hash, MessageCircle, Forward } from 'lucide-react';
import { ChatMessage } from '../types/living-agents';
import { CHANNELS, DIRECT_MESSAGES } from '../types/channels';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage;
  onForward: (targetChannelType: string, targetChannelId: string, message: ChatMessage) => void;
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  onForward
}) => {
  const [selectedTarget, setSelectedTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  if (!isOpen) return null;

  const channels = Object.values(CHANNELS);
  const directMessages = Object.values(DIRECT_MESSAGES);

  const handleForward = () => {
    if (selectedTarget) {
      onForward(selectedTarget.type, selectedTarget.id, message);
      onClose();
      setSelectedTarget(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Forward className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Forward Message</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-gray-700">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">
              From: {message.type === 'user' ? 'You' : 'Council'} • {formatTimestamp(message.timestamp)}
            </div>
            <div className="text-sm text-gray-200 line-clamp-3">
              {message.content}
            </div>
          </div>
        </div>

        {/* Target Selection */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Forward to:</h3>
          
          {/* Channels */}
          <div className="mb-4">
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Channels</h4>
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedTarget({ type: 'channel', id: channel.id, name: channel.displayName })}
                  className={`w-full p-2 rounded-lg text-left transition-colors flex items-center space-x-2 ${
                    selectedTarget?.id === channel.id && selectedTarget?.type === 'channel'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">{channel.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{channel.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Direct Messages</h4>
            <div className="space-y-1">
              {directMessages.map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => setSelectedTarget({ type: 'dm', id: dm.id, name: dm.memberName })}
                  className={`w-full p-2 rounded-lg text-left transition-colors flex items-center space-x-2 ${
                    selectedTarget?.id === dm.id && selectedTarget?.type === 'dm'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{dm.memberName}</span>
                  <div className="ml-auto flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${dm.isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-xs text-gray-500">{dm.isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {selectedTarget ? (
              <span>Forward to: <strong>{selectedTarget.name}</strong></span>
            ) : (
              <span>Select a destination</span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={!selectedTarget}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal; 