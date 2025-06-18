import React from 'react';
import { MessageCircle, Target, Zap, Lightbulb, FileText } from 'lucide-react';
import { INTERACTION_MODES } from '../types/interaction';

interface InteractionModeSelectorProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
  compact?: boolean;
}

const InteractionModeSelector: React.FC<InteractionModeSelectorProps> = ({ 
  selectedMode, 
  onModeChange, 
  compact = false 
}) => {
  const modes = Object.entries(INTERACTION_MODES);

  if (compact) {
    return (
      <div className="flex items-center space-x-1 bg-slate-700/30 rounded-lg p-1">
        {modes.map(([key, mode]) => {
          const isSelected = selectedMode === key;
          const IconComponent = getIcon(mode.icon);
          
          return (
                <button
              key={key}
              onClick={() => onModeChange(key)}
              className={`
                flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200
                ${isSelected 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
                }
              `}
              title={mode.description}
            >
              <IconComponent className="h-3 w-3" />
              <span className="hidden sm:inline">{mode.name}</span>
                </button>
          );
        })}
      </div>
    );
  }

  // Full mode selector (for settings/preferences)
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Interaction Mode
      </label>
      <div className="grid grid-cols-1 gap-2">
        {modes.map(([key, mode]) => {
          const isSelected = selectedMode === key;
          const IconComponent = getIcon(mode.icon);
          
          return (
          <button
              key={key}
              onClick={() => onModeChange(key)}
              className={`
                flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200
                ${isSelected 
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'
                }
              `}
          >
              <IconComponent className="h-5 w-5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">{mode.name}</div>
                <div className="text-sm opacity-70">{mode.description}</div>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to get icon component
const getIcon = (iconString: string) => {
  switch (iconString) {
    case '💬': return MessageCircle;
    case '🎯': return Target;
    case '⚡': return Zap;
    case '🧠': return Lightbulb;
    case '📋': return FileText;
    default: return MessageCircle;
  }
};

export default InteractionModeSelector; 