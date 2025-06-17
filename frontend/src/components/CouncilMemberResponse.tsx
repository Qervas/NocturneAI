import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { CouncilResponse } from '../types/council';
import { COUNCIL_MEMBERS, CouncilMemberKey } from '../types/council';

interface CouncilMemberResponseProps {
  response: CouncilResponse;
  isInitiallyExpanded?: boolean;
}

const CouncilMemberResponse: React.FC<CouncilMemberResponseProps> = ({ 
  response, 
  isInitiallyExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  
  const memberKey = response.member_name.toLowerCase() as CouncilMemberKey;
  const memberInfo = COUNCIL_MEMBERS[memberKey];
  
  if (!memberInfo) return null;

  // Truncate message for preview
  const previewMessage = response.message.length > 150 
    ? response.message.substring(0, 150) + '...'
    : response.message;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
              ${memberInfo.color}
            `}>
              {memberInfo.avatar}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white">{response.member_name}</span>
                  <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    {memberInfo.role}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>{(response.confidence_level * 100).toFixed(0)}%</span>
                </div>
              </div>
              
              {/* Preview or Full Message */}
              <p className="text-slate-200 text-sm leading-relaxed">
                {isExpanded ? response.message : previewMessage}
              </p>
            </div>
          </div>
          
          <button className="ml-2 p-1 hover:bg-slate-600/50 rounded">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && response.suggested_actions.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-slate-700/50 pt-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Suggested Actions</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5">
              {response.suggested_actions.map((action, actionIndex) => (
                <li key={actionIndex} className="flex items-start space-x-2">
                  <span className="text-slate-500 mt-0.5 flex-shrink-0">•</span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilMemberResponse; 