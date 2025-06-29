import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { ChatMessage } from '../types/living-agents';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: ChatMessage;
  isDeleting?: boolean;
}

const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  const getSenderName = () => {
    if (message.type === 'user') return 'You';
    if (message.type === 'council') return message.sender || 'Council';
    return 'System';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMessagePreview = () => {
    if (message.type === 'council' && message.council_response) {
      // For council messages, show the synthesis or first response
      return message.council_response.synthesis || 
             (message.council_response.council_responses?.[0]?.message) || 
             message.content;
    }
    return message.content;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Delete Message</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isDeleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete this message? This action cannot be undone.
          </p>

          {/* Message Preview */}
          <div className="bg-gray-800 rounded-lg p-3 mb-4 border-l-4 border-red-500">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-300">
                {getSenderName()}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            <div className="text-sm text-gray-200 line-clamp-3">
              {getMessagePreview()}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-300">
                <strong>Warning:</strong> This message will be permanently deleted and cannot be recovered.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMessageModal; 