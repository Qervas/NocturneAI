import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { INTERACTION_MODES, InteractionMode } from '../types/interaction';

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
  const [isOpen, setIsOpen] = useState(false);
  const currentMode = INTERACTION_MODES[selectedMode];

  const handleModeSelect = (modeId: string) => {
    onModeChange(modeId);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm transition-colors"
        >
          <span className="text-base">{currentMode.icon}</span>
          <span className="text-slate-200">{currentMode.name}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[200px]">
            <div className="p-2 space-y-1">
              {Object.values(INTERACTION_MODES).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    mode.id === selectedMode 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{mode.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-xs opacity-70">{mode.description}</div>
                    </div>
                    {mode.id === selectedMode && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-slate-300">Interaction Mode:</span>
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-700/30 rounded-full border border-slate-600/50">
          <span className="text-base">{currentMode.icon}</span>
          <span className="text-sm text-slate-200">{currentMode.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.values(INTERACTION_MODES).map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeSelect(mode.id)}
            className={`p-3 rounded-lg border transition-all ${
              mode.id === selectedMode
                ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
            }`}
          >
            <div className="text-center">
              <div className="text-lg mb-1">{mode.icon}</div>
              <div className="text-xs font-medium">{mode.name}</div>
              <div className="text-xs opacity-70 mt-1">{mode.description}</div>
              
              {/* Mode indicators */}
              <div className="flex justify-center space-x-1 mt-2">
                {mode.hasActions && (
                  <div className="w-2 h-2 bg-green-400 rounded-full" title="Includes Actions" />
                )}
                {mode.hasStrategicSynthesis && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full" title="Includes Synthesis" />
                )}
                <div className={`w-2 h-2 rounded-full ${
                  mode.responseStyle === 'casual' ? 'bg-yellow-400' :
                  mode.responseStyle === 'structured' ? 'bg-purple-400' : 'bg-slate-400'
                }`} title={`${mode.responseStyle} style`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Mode description */}
      <div className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded-lg border border-slate-700">
        <div className="font-medium text-slate-300 mb-1">Current Mode: {currentMode.name}</div>
        <div>{currentMode.description}</div>
        <div className="flex items-center space-x-4 mt-2 text-xs">
          <span className={`flex items-center space-x-1 ${currentMode.hasActions ? 'text-green-400' : 'text-slate-500'}`}>
            <div className={`w-2 h-2 rounded-full ${currentMode.hasActions ? 'bg-green-400' : 'bg-slate-500'}`} />
            <span>Actions</span>
          </span>
          <span className={`flex items-center space-x-1 ${currentMode.hasStrategicSynthesis ? 'text-blue-400' : 'text-slate-500'}`}>
            <div className={`w-2 h-2 rounded-full ${currentMode.hasStrategicSynthesis ? 'bg-blue-400' : 'bg-slate-500'}`} />
            <span>Synthesis</span>
          </span>
          <span className="flex items-center space-x-1 text-slate-400">
            <div className={`w-2 h-2 rounded-full ${
              currentMode.responseStyle === 'casual' ? 'bg-yellow-400' :
              currentMode.responseStyle === 'structured' ? 'bg-purple-400' : 'bg-slate-400'
            }`} />
            <span>{currentMode.responseStyle}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default InteractionModeSelector; 