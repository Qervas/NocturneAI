import React, { useState, useRef, useEffect } from 'react';
import { Reply, Forward, Trash2, MoreHorizontal, Copy } from 'lucide-react';
import { ChatMessage } from '../types/living-agents';

interface MessageActionsProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onCopy: (content: string) => void;
  isOwnMessage?: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  onReply,
  onForward,
  onDelete,
  onCopy
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-700 transition-all duration-150"
        title="Message actions"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-400 hover:text-white" />
      </button>

      {/* Actions Menu */}
      {isOpen && (
        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-48 py-2">
          {/* Reply */}
          <button
            onClick={() => handleAction(() => onReply(message))}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>

          {/* Forward */}
          <button
            onClick={() => handleAction(() => onForward(message))}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2"
          >
            <Forward className="w-4 h-4" />
            <span>Forward</span>
          </button>

          {/* Copy Text */}
          <button
            onClick={() => handleAction(() => onCopy(message.content))}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Text</span>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-600 my-1"></div>

          {/* Delete - Available for both user and AI messages */}
          <button
            onClick={() => handleAction(() => onDelete(message))}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Message</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageActions; 