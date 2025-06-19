import React from 'react';
import { Trash2, X } from 'lucide-react';

interface BatchDeleteModalProps {
  isOpen: boolean;
  messageCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  isOpen,
  messageCount,
  isDeleting,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trash2 className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Delete Messages</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            Are you sure you want to delete {messageCount} selected message{messageCount > 1 ? 's' : ''}?
          </p>
          <p className="text-gray-400 text-sm">
            This action cannot be undone. The message{messageCount > 1 ? 's' : ''} will be permanently removed from the conversation.
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              `Delete ${messageCount} Message${messageCount > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchDeleteModal; 