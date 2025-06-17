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
        p-4 rounded-lg border transition-all duration-200
        ${isActive 
          ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70' 
          : 'bg-slate-800/30 border-slate-700/50'
        }
      `}>
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white font-medium
            ${member.color}
          `}>
            <span className="text-lg">{member.avatar}</span>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white truncate">
                {member.name}
              </h3>
              {isActive ? (
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-500 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-sm text-slate-300 font-medium">
              {member.role}
            </p>
            
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {member.description}
            </p>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`
            text-xs font-medium px-2 py-1 rounded-full
            ${isActive 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
            }
          `}>
            {isActive ? 'Online' : 'Offline'}
          </span>
          
          {isActive && (
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover Tooltip */}
      <div className="absolute left-full ml-2 top-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl max-w-xs">
          <h4 className="font-medium text-white mb-1">{member.name}</h4>
          <p className="text-sm text-slate-300 mb-2">{member.role}</p>
          <p className="text-xs text-slate-400">{member.description}</p>
        </div>
      </div>
    </div>
  );
};

export default CouncilMemberCard; 