import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface CouncilMemberCardProps {
  member: {
    name: string;
    role: string;
    color: string;
    avatar: string;
    description: string;
  };
  isActive: boolean;
}

const CouncilMemberCard: React.FC<CouncilMemberCardProps> = ({ member, isActive }) => {
  return (
    <div className="relative group">
      <div className={`
        p-3 rounded-lg border transition-all duration-200
        ${isActive 
          ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70' 
          : 'bg-slate-800/30 border-slate-700/50'
        }
      `}>
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm
            ${member.color}
          `}>
            <span>{member.avatar}</span>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white truncate">
                {member.name}
              </h3>
              {isActive ? (
                <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="h-3 w-3 text-gray-500 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-slate-300 font-medium">
              {member.role}
            </p>
          </div>
        </div>
        
        {/* Compact Status */}
        <div className="mt-2 flex items-center justify-between">
          <span className={`
            text-xs px-2 py-0.5 rounded-full
            ${isActive 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
            }
          `}>
            {isActive ? 'Online' : 'Offline'}
          </span>
          
          {isActive && (
            <div className="flex space-x-0.5">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover Tooltip */}
      <div className="absolute left-full ml-2 top-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl max-w-xs">
          <h4 className="text-sm font-medium text-white mb-1">{member.name}</h4>
          <p className="text-xs text-slate-300 mb-2">{member.role}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{member.description}</p>
        </div>
      </div>
    </div>
  );
};

export default CouncilMemberCard; 