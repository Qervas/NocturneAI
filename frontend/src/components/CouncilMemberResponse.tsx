import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { CouncilResponse } from '../types/council';
import { COUNCIL_MEMBERS, CouncilMemberKey } from '../types/council';

// Component to format member messages with better typography
const FormattedMessage: React.FC<{ message: string }> = ({ message }) => {
  // Split message into paragraphs and format
  const formatText = (text: string) => {
    // Split by double line breaks or periods followed by space and capital letter
    const paragraphs = text
      .split(/\n\n+|\. (?=[A-Z])/g)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    return paragraphs.map((paragraph, index) => {
      // Handle different types of content
      let formattedParagraph = paragraph;
      
      // Format bold text
      formattedParagraph = formattedParagraph.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      
      // Format phase headers
      formattedParagraph = formattedParagraph.replace(/(\*\*Phase \d+[^*]*\*\*)/g, '<div class="text-blue-300 font-semibold text-base mt-4 mb-2">$1</div>');
      
      // Format bullet points
      formattedParagraph = formattedParagraph.replace(/^\* /gm, '• ');
      
      // Check if it's a section header
      const isHeader = formattedParagraph.includes('**') && formattedParagraph.length < 100;
      const isBulletPoint = formattedParagraph.startsWith('•');
      const isPhaseHeader = formattedParagraph.includes('Phase');
      
      if (isPhaseHeader) {
        return (
          <div key={index} className="mt-4 mb-2">
            <div className="bg-blue-500/10 border-l-4 border-blue-500 pl-4 py-2 rounded-r">
              <div 
                className="text-blue-300 font-semibold"
                dangerouslySetInnerHTML={{ __html: formattedParagraph }}
              />
            </div>
          </div>
        );
      } else if (isHeader) {
        return (
          <h4 
            key={index} 
            className="text-slate-100 font-medium text-base mt-4 mb-2 border-b border-slate-600/30 pb-1"
            dangerouslySetInnerHTML={{ __html: formattedParagraph }}
          />
        );
      } else if (isBulletPoint) {
        return (
          <div key={index} className="flex items-start space-x-2 my-2">
            <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
            <p 
              className="text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formattedParagraph.substring(2) }}
            />
          </div>
        );
      } else {
        return (
          <p 
            key={index} 
            className="text-slate-200 leading-relaxed mb-3"
            dangerouslySetInnerHTML={{ __html: formattedParagraph }}
          />
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      {formatText(message)}
    </div>
  );
};

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
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600/50 transition-all">
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
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
              <div className={`text-slate-200 text-sm leading-relaxed ${isExpanded ? 'bg-slate-900/20 rounded-lg p-3 mt-3 border border-slate-600/20' : ''}`}>
                {isExpanded ? (
                  <div className="max-h-96 overflow-y-auto">
                    <FormattedMessage message={response.message} />
                  </div>
                ) : (
                  <p>{previewMessage}</p>
                )}
              </div>
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
          <div className="border-t border-slate-700/50 pt-4">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-purple-300 font-medium">Suggested Actions</span>
              </div>
              <div className="space-y-2">
                {response.suggested_actions.map((action, actionIndex) => (
                  <div key={actionIndex} className="flex items-start space-x-3 group">
                    <div className="w-4 h-4 mt-0.5 border border-purple-400/50 rounded-sm flex items-center justify-center group-hover:border-purple-400 transition-colors">
                      <div className="w-1.5 h-1.5 bg-purple-400/50 rounded-full group-hover:bg-purple-400 transition-colors"></div>
                    </div>
                    <span className="text-sm text-slate-200 leading-relaxed group-hover:text-white transition-colors">
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilMemberResponse; 