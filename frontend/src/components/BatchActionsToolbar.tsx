import React from 'react';
import { CheckSquare, Square, X, Trash2, Send, CheckCheck } from 'lucide-react';

interface BatchActionsToolbarProps {
  isVisible: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleMultiSelect: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchDelete: () => void;
  onBatchForward: () => void;
}

const BatchActionsToolbar: React.FC<BatchActionsToolbarProps> = ({
  isVisible,
  selectedCount,
  totalCount,
  onToggleMultiSelect,
  onSelectAll,
  onDeselectAll,
  onBatchDelete,
  onBatchForward
}) => {
  if (!isVisible) return null;

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="bg-gray-800 border-t border-gray-700 p-3 flex items-center justify-between">
      {/* Selection info and controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-sm text-gray-300">
          <CheckSquare className="h-4 w-4 mr-2 text-blue-400" />
          {selectedCount} of {totalCount} selected
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
          >
            {allSelected ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Deselect All
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4 mr-1" />
                Select All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        {selectedCount > 0 && (
          <>
            <button
              onClick={onBatchForward}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4 mr-2" />
              Forward ({selectedCount})
            </button>
            
            <button
              onClick={onBatchDelete}
              className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedCount})
            </button>
          </>
        )}
        
        <button
          onClick={onToggleMultiSelect}
          className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <X className="h-4 w-4 mr-2" />
          Exit
        </button>
      </div>
    </div>
  );
};

export default BatchActionsToolbar; 