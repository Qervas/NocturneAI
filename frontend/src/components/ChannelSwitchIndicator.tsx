import React, { useState, useEffect } from 'react';
import { Hash, MessageCircle, Users, Zap, ArrowRight } from 'lucide-react';
import { ActiveView, CHANNELS } from '../types/channels';

interface ChannelSwitchIndicatorProps {
  activeView: ActiveView;
  previousView?: ActiveView;
  connectionStatus: string;
}

const ChannelSwitchIndicator: React.FC<ChannelSwitchIndicatorProps> = ({ 
  activeView, 
  previousView, 
  connectionStatus 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (previousView && (previousView.id !== activeView.id || previousView.type !== activeView.type)) {
      setShowTransition(true);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowTransition(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [activeView, previousView]);

  const getChannelIcon = (view: ActiveView) => {
    if (view.type === 'channel') {
      const channel = CHANNELS[view.id];
      return channel ? channel.icon : '🏛️';
    } else {
      return '💬';
    }
  };

  const getChannelDescription = (view: ActiveView) => {
    if (view.type === 'channel') {
      const channel = CHANNELS[view.id];
      return channel ? channel.description : 'Channel discussion';
    } else {
      return 'Direct message conversation';
    }
  };

  const getChannelColor = (view: ActiveView) => {
    if (view.type === 'channel') {
      const channel = CHANNELS[view.id];
      return channel ? channel.color : 'text-purple-400';
    } else {
      return 'text-blue-400';
    }
  };

  if (!isVisible || !showTransition) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-lg p-4 shadow-xl max-w-sm">
        <div className="flex items-center space-x-3">
          {/* Previous View */}
          {previousView && (
            <div className="flex items-center space-x-2 text-slate-400">
              {previousView.type === 'channel' ? (
                <Hash className="h-4 w-4" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{previousView.name}</span>
            </div>
          )}

          {/* Transition Arrow */}
          <ArrowRight className="h-4 w-4 text-slate-500" />

          {/* Current View */}
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getChannelIcon(activeView)}</span>
            <div>
              <div className={`text-sm font-medium ${getChannelColor(activeView)}`}>
                {activeView.name}
              </div>
              <div className="text-xs text-slate-400">
                {getChannelDescription(activeView)}
              </div>
            </div>
          </div>
        </div>

        {/* Context Info */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <Users className="h-3 w-3" />
              <span>
                {activeView.type === 'channel' 
                  ? `${CHANNELS[activeView.id]?.primaryMembers.length || 0} experts`
                  : '1-on-1 conversation'
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-green-400">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelSwitchIndicator; 