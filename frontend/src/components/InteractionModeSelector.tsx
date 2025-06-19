import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Target, Zap, Lightbulb, FileText, Brain, Sparkles, CheckSquare, BarChart3, Users, Bot, Moon, Rocket } from 'lucide-react';
import { INTERACTION_PROFILES, AGENT_ABILITIES } from '../types/interaction';

interface InteractionModeSelectorProps {
  selectedProfile: string;
  enabledAbilities: string[];
  onProfileChange: (profile: string) => void;
  onAbilitiesChange: (abilities: string[]) => void;
  compact?: boolean;
}

const InteractionModeSelector: React.FC<InteractionModeSelectorProps> = ({ 
  selectedProfile, 
  enabledAbilities,
  onProfileChange,
  onAbilitiesChange,
  compact = false 
}) => {
  const [showCustomAbilities, setShowCustomAbilities] = useState(false);
  const customPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const profiles = Object.entries(INTERACTION_PROFILES);

  const handleProfileSelect = (profileId: string) => {
    onProfileChange(profileId);
    
    // If not auto mode, set the profile's default abilities
    const profile = INTERACTION_PROFILES[profileId];
    if (!profile.isAutoMode) {
      onAbilitiesChange(profile.abilities);
    } else {
      onAbilitiesChange([]); // Auto mode - let AI decide
    }
  };

  const toggleAbility = (abilityId: string) => {
    const newAbilities = enabledAbilities.includes(abilityId)
      ? enabledAbilities.filter(id => id !== abilityId)
      : [...enabledAbilities, abilityId];
    onAbilitiesChange(newAbilities);
    
    // Switch to custom mode when manually adjusting abilities
    if (selectedProfile !== 'custom') {
      onProfileChange('custom');
    }
  };

  // Close custom panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customPanelRef.current && 
          triggerRef.current && 
          !customPanelRef.current.contains(event.target as Node) &&
          !triggerRef.current.contains(event.target as Node)) {
        setShowCustomAbilities(false);
      }
    };

    if (showCustomAbilities) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomAbilities]);

  if (compact) {
    return (
      <div className="relative flex items-center space-x-2 bg-slate-700/30 rounded-lg p-1">
        {/* Auto Mode Button - Always visible and prominent */}
        <button
          onClick={() => handleProfileSelect('auto_mode')}
          className={`
            flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium transition-all duration-200
            ${selectedProfile === 'auto_mode' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
              : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
            }
          `}
          title="Let agents intelligently choose their computational approach"
        >
          <Bot className="h-3 w-3" />
          <span className="hidden sm:inline">Auto</span>
        </button>
        
        {/* Computational Mode Buttons */}
        <button
          onClick={() => handleProfileSelect('passive_mode')}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200
            ${selectedProfile === 'passive_mode' 
              ? 'bg-slate-600 text-white shadow-lg' 
              : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
            }
          `}
          title="Low computational power - quick responses"
        >
          <Moon className="h-3 w-3" />
          <span className="hidden sm:inline">Passive</span>
        </button>
        
        <button
          onClick={() => handleProfileSelect('active_mode')}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200
            ${selectedProfile === 'active_mode' 
              ? 'bg-yellow-600 text-white shadow-lg' 
              : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
            }
          `}
          title="Medium computational power - balanced analysis"
        >
          <Zap className="h-3 w-3" />
          <span className="hidden sm:inline">Active</span>
        </button>
        
        <button
          onClick={() => handleProfileSelect('autonomous_mode')}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200
            ${selectedProfile === 'autonomous_mode' 
              ? 'bg-red-600 text-white shadow-lg' 
              : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
            }
          `}
          title="High computational power - full autonomy"
        >
          <Rocket className="h-3 w-3" />
          <span className="hidden sm:inline">Autonomous</span>
        </button>
        
        {/* Custom Abilities Toggle */}
        <button
          ref={triggerRef}
          onClick={() => setShowCustomAbilities(!showCustomAbilities)}
          className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-slate-300 hover:bg-slate-600/50 hover:text-white transition-all duration-200"
          title="Customize agent abilities"
        >
          <Sparkles className="h-3 w-3" />
          <span className="hidden sm:inline">Custom</span>
        </button>
        
        {/* Custom Abilities Panel - Fixed positioning */}
        {showCustomAbilities && (
          <div 
            ref={customPanelRef}
            className="absolute top-full right-0 mt-2 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[100] min-w-80 max-w-96"
            style={{
              transform: 'translateX(-100%)',
              marginRight: '100%'
            }}
          >
            <h4 className="text-sm font-medium text-slate-200 mb-2">Agent Abilities</h4>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {Object.entries(AGENT_ABILITIES).map(([key, ability]) => (
                <button
                  key={key}
                  onClick={() => toggleAbility(key)}
                  className={`
                    flex items-center space-x-2 p-2 rounded text-xs transition-all duration-200
                    ${enabledAbilities.includes(key)
                      ? 'bg-purple-600/30 border border-purple-500 text-purple-300'
                      : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-600/50'
                    }
                  `}
                >
                  <span>{ability.icon}</span>
                  <span>{ability.name}</span>
                </button>
              ))}
            </div>
            
            {/* Computational Level Indicator */}
            <div className="mt-3 pt-3 border-t border-slate-600">
              <div className="text-xs text-slate-400 mb-1">Computational Level</div>
              <div className="flex items-center space-x-2">
                {selectedProfile === 'passive_mode' && (
                  <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded-full text-xs">💤 Low Power</span>
                )}
                {selectedProfile === 'active_mode' && (
                  <span className="px-2 py-1 bg-yellow-600 text-white rounded-full text-xs">⚡ Medium Power</span>
                )}
                {selectedProfile === 'autonomous_mode' && (
                  <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs">🚀 High Power</span>
                )}
                {selectedProfile === 'auto_mode' && (
                  <span className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs">🤖 AI Controlled</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode selector (for settings/preferences)
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Agent Computational Mode
        </label>
        <div className="grid grid-cols-1 gap-2">
          {profiles.map(([key, profile]) => {
            const isSelected = selectedProfile === key;
            const IconComponent = getIcon(profile.icon);
            
            return (
              <button
                key={key}
                onClick={() => handleProfileSelect(key)}
                className={`
                  flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200
                  ${isSelected 
                    ? profile.isAutoMode
                      ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500 text-purple-300'
                      : profile.computationalLevel === 'passive'
                        ? 'bg-slate-600/20 border-slate-500 text-slate-300'
                        : profile.computationalLevel === 'active'
                          ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300'
                          : 'bg-red-600/20 border-red-500 text-red-300'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'
                  }
                `}
              >
                <IconComponent className="h-5 w-5 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-medium flex items-center space-x-2">
                    <span>{profile.name}</span>
                    {profile.isAutoMode && <span className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 px-2 py-0.5 rounded-full">AI Powered</span>}
                    {profile.computationalLevel && !profile.isAutoMode && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        profile.computationalLevel === 'passive' ? 'bg-slate-600 text-slate-300' :
                        profile.computationalLevel === 'active' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {profile.computationalLevel === 'passive' ? '💤 Low' :
                         profile.computationalLevel === 'active' ? '⚡ Medium' : '🚀 High'} Power
                      </span>
                    )}
                  </div>
                  <div className="text-sm opacity-70">{profile.description}</div>
                  {!profile.isAutoMode && (
                    <div className="text-xs mt-1 flex flex-wrap gap-1">
                      {profile.abilities.map(abilityId => (
                        <span key={abilityId} className="bg-slate-600/50 px-1.5 py-0.5 rounded">
                          {AGENT_ABILITIES[abilityId]?.icon} {AGENT_ABILITIES[abilityId]?.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Custom Abilities Section */}
      {selectedProfile !== 'auto_mode' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Active Abilities
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(AGENT_ABILITIES).map(([key, ability]) => (
              <button
                key={key}
                onClick={() => toggleAbility(key)}
                className={`
                  flex items-center space-x-2 p-2 rounded border text-sm transition-all duration-200
                  ${enabledAbilities.includes(key)
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500'
                  }
                `}
              >
                <span>{ability.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{ability.name}</div>
                  <div className="text-xs opacity-70">{ability.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get icon component
const getIcon = (iconString: string) => {
  switch (iconString) {
    case '🤖': return Bot;
    case '💤': return Moon;
    case '⚡': return Zap;
    case '🚀': return Rocket;
    case '💬': return MessageCircle;
    case '🎯': return Target;
    case '💡': return Lightbulb;
    case '🧠': return Brain;
    case '📋': return FileText;
    case '📊': return BarChart3;
    case '🎨': return Sparkles;
    case '🤝': return Users;
    case '✅': return CheckSquare;
    default: return MessageCircle;
  }
};

export default InteractionModeSelector; 