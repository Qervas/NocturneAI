import React from 'react';
import { INTERACTION_PROFILES } from '../types/interaction';
import { ChatMessage } from '../types/council';
import CouncilMemberResponse from './CouncilMemberResponse';
import StrategicSynthesis from './StrategicSynthesis';
import RecommendedActions from './RecommendedActions';
import MessageActions from './MessageActions';
import { Hash, MessageCircle, User, Reply, Forward, CheckSquare, Square } from 'lucide-react';

interface ChannelMessageProps {
  message: ChatMessage;
  channelType: 'channel' | 'dm';
  channelId: string;
  interactionMode?: string;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: (messageId: string) => void;
  onReply?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onCopy?: (content: string) => void;
}

const ChannelMessage: React.FC<ChannelMessageProps> = ({ 
  message, 
  channelType, 
  channelId, 
  interactionMode = 'casual_chat',
  isMultiSelectMode = false,
  isSelected = false,
  onSelect,
  onReply,
  onForward,
  onDelete,
  onCopy
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getCouncilResponseText = (response: any) => {
    let text = '';
    
    // Add synthesis if available
    if (response.synthesis) {
      text += `Council Synthesis:\n${response.synthesis}\n\n`;
    }
    
    // Add individual member responses
    if (response.council_responses && response.council_responses.length > 0) {
      text += 'Council Member Responses:\n';
      response.council_responses.forEach((cr: any) => {
        text += `\n${cr.member_name} (${cr.role}):\n${cr.message}\n`;
        if (cr.suggested_actions && cr.suggested_actions.length > 0) {
          text += `Actions: ${cr.suggested_actions.join(', ')}\n`;
        }
      });
    }
    
    // Add recommended actions
    if (response.recommended_actions && response.recommended_actions.length > 0) {
      text += `\nRecommended Actions:\n• ${response.recommended_actions.join('\n• ')}\n`;
    }
    
    return text.trim();
  };

  if (message.type === 'user' || message.type === 'forwarded' || message.type === 'agent') {
    const messageClass = channelType === 'dm' ? 'dm-message' : 'channel-message';
    const isForwarded = message.type === 'forwarded';
    const isAgent = message.type === 'agent';
    
    return (
      <div className={`group hover:bg-slate-800/30 transition-colors ${messageClass}`}>
        {/* Reply Context */}
        {message.reply_to && (
          <div className="px-3 pt-2">
            <div className="border-l-2 border-gray-500 pl-3 py-1 bg-gray-800/50 rounded-r">
              <div className="flex items-center space-x-1 text-xs text-gray-400 mb-1">
                <Reply className="w-3 h-3" />
                <span>Replying to {message.reply_to.sender}</span>
              </div>
              <div className="text-xs text-gray-300 truncate">
                {message.reply_to.content}
              </div>
            </div>
          </div>
        )}

        {/* Forwarded Context */}
        {message.forwarded_from && (
          <div className="px-3 pt-2">
            <div className="border-l-2 border-blue-500 pl-3 py-1 bg-blue-900/20 rounded-r">
              <div className="flex items-center space-x-1 text-xs text-blue-400 mb-1">
                <Forward className="w-3 h-3" />
                <span>Forwarded from {message.forwarded_from.channel_name}</span>
                <span className="text-xs text-gray-500 ml-2">• No AI response</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3 p-3">
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <button
              onClick={() => onSelect?.(message.id)}
              className="mt-1 p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-400" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}
          
          <div className={`w-8 h-8 ${
            isForwarded 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
              : isAgent
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
          } rounded-full flex items-center justify-center`}>
            {isForwarded ? (
              <Forward className="h-4 w-4 text-white" />
            ) : isAgent ? (
              <span className="text-white text-xs font-bold">
                {message.agent_name?.charAt(0) || 'AI'}
              </span>
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-white">
                {isForwarded 
                  ? `${message.forwarded_from?.original_sender} (forwarded)` 
                  : isAgent
                    ? message.agent_name
                    : 'You'
                }
              </span>
              {isAgent && message.agent_role && (
                <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">
                  {message.agent_role}
                </span>
              )}
            <span className={`channel-indicator ${channelId}`}>
              {channelType === 'channel' ? `#${channelId}` : 'DM'}
            </span>
            <span className="text-xs text-slate-400">{formatTimestamp(message.timestamp)}</span>
          </div>
            <p className={`message-content ${channelType === 'dm' 
                ? 'text-slate-100 font-medium' 
                : 'text-slate-200'
            } text-sm leading-relaxed ${isForwarded ? 'italic' : ''}`}>
            {message.content}
          </p>
          </div>
          
          {/* Message Actions */}
          {(onReply || onForward || onDelete || onCopy) && (
            <div className="flex items-center space-x-1">
              <MessageActions
                message={message}
                onReply={onReply || (() => {})}
                onForward={onForward || (() => {})}
                onDelete={onDelete || (() => {})}
                onCopy={onCopy || (() => {})}
                isOwnMessage={!isForwarded && !isAgent} // Agent messages are not "own" messages
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Special handling for synthesis and action messages (workflow steps)
  if (message.type === 'synthesis' || message.type === 'actions') {
    const isSynthesis = message.type === 'synthesis';
    
    return (
      <div className={`group hover:bg-slate-800/30 transition-colors`}>
        <div className="flex items-start space-x-3 p-3">
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <button
              onClick={() => onSelect?.(message.id)}
              className="mt-1 p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-400" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}
          
          <div className={`w-8 h-8 ${
            isSynthesis 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
              : 'bg-gradient-to-r from-orange-500 to-red-500'
          } rounded-full flex items-center justify-center`}>
            <span className="text-white text-xs">
              {isSynthesis ? '🧠' : '🎯'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-white">
                {isSynthesis ? '🧠 Master Intelligence' : '🎯 Action Items'}
              </span>
              <span className={`channel-indicator ${channelId}`}>
                {channelType === 'channel' ? `#${channelId}` : 'DM'}
              </span>
              <span className="text-xs text-slate-400">{formatTimestamp(message.timestamp)}</span>
            </div>
            <div className={`message-content ${
              isSynthesis 
                ? 'bg-purple-900/20 border border-purple-500/30 rounded-lg p-3'
                : 'bg-orange-900/20 border border-orange-500/30 rounded-lg p-3'
            } text-sm leading-relaxed`}>
              {isSynthesis ? (
                <div className="text-slate-200">{message.content}</div>
              ) : (
                <div className="text-slate-200">
                  {message.content.split('\n').map((action, idx) => (
                    <div key={idx} className="flex items-start space-x-2 mb-1">
                      <span className="text-orange-400">•</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Message Actions */}
          {(onReply || onForward || onDelete || onCopy) && (
            <div className="flex items-center space-x-1">
              <MessageActions
                message={message}
                onReply={onReply || (() => {})}
                onForward={onForward || (() => {})}
                onDelete={onDelete || (() => {})}
                onCopy={onCopy || (() => {})}
                isOwnMessage={false}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    // System messages now go to debug console, don't render in chat
    return null;
  }

    if (message.type === 'council' && message.council_response) {
    const response = message.council_response;
    const isDM = channelType === 'dm';
    const isIndividualResponse = response.response_type === 'individual';
    const mode = INTERACTION_PROFILES[interactionMode];

    // Individual DM Response - simpler, more personal layout
    if (isIndividualResponse && isDM) {
      const councilMember = response.council_responses[0];
      if (!councilMember) return null;

      return (
        <div className="group hover:bg-slate-800/30 transition-colors">
          {/* Reply Context */}
          {message.reply_to && (
            <div className="px-3 pt-2">
              <div className="border-l-2 border-gray-500 pl-3 py-1 bg-gray-800/50 rounded-r">
                <div className="flex items-center space-x-1 text-xs text-gray-400 mb-1">
                  <Reply className="w-3 h-3" />
                  <span>Replying to {message.reply_to.sender}</span>
                </div>
                <div className="text-xs text-gray-300 truncate">
                  {message.reply_to.content}
                </div>
              </div>
            </div>
          )}

          {/* Forwarded Context */}
          {message.forwarded_from && (
            <div className="px-3 pt-2">
              <div className="border-l-2 border-blue-500 pl-3 py-1 bg-blue-900/20 rounded-r">
                <div className="flex items-center space-x-1 text-xs text-blue-400 mb-1">
                  <Forward className="w-3 h-3" />
                  <span>Forwarded from {message.forwarded_from.channel_name}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            {/* Multi-select checkbox */}
            {isMultiSelectMode && (
              <button
                onClick={() => onSelect?.(message.id)}
                className="mt-1 p-1 hover:bg-gray-700 rounded transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-400" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}

            <div className="flex-1 space-y-3 p-4 bg-slate-800/30 rounded-lg border-l-4 border-blue-500">
            {/* Individual Response Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  {councilMember.member_name} responds
                </span>
                <span className="text-xs text-slate-500">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Mode Indicator */}
                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded-full">
                  <span className="text-xs">{mode.icon}</span>
                  <span className="text-xs text-slate-400">{mode.name}</span>
                </div>

                {/* Message Actions */}
                {(onReply || onForward || onDelete || onCopy) && (
                  <MessageActions
                    message={message}
                    onReply={onReply || (() => {})}
                    onForward={onForward || (() => {})}
                    onDelete={onDelete || (() => {})}
                    onCopy={onCopy ? () => onCopy(getCouncilResponseText(response)) : (() => {})}
                    isOwnMessage={false}
                  />
                )}
              </div>
            </div>

          {/* Individual Response Content */}
          <div className="prose prose-slate max-w-none">
            <div className="text-slate-200 leading-relaxed">
              {response.synthesis}
            </div>
          </div>

          {/* Individual Actions (if any) */}
          {mode?.abilities?.includes('actions') && response.recommended_actions && response.recommended_actions.length > 0 && (
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-sm font-medium text-blue-300 mb-2">Suggested next steps:</div>
              <ul className="space-y-1">
                {response.recommended_actions.map((action, index) => (
                  <li key={index} className="text-sm text-slate-300 flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personal touch for casual chat */}
          {mode?.abilities?.includes('conversational') && (
            <div className="text-xs text-slate-500 italic">
              💬 Personal conversation with {councilMember.member_name}
            </div>
          )}
            </div>
          </div>
        </div>
      );
    }

    // Council Response - full council layout (original logic)
    return (
      <div className="group hover:bg-slate-800/30 transition-colors">
        {/* Reply Context */}
        {message.reply_to && (
          <div className="px-3 pt-2">
            <div className="border-l-2 border-gray-500 pl-3 py-1 bg-gray-800/50 rounded-r">
              <div className="flex items-center space-x-1 text-xs text-gray-400 mb-1">
                <Reply className="w-3 h-3" />
                <span>Replying to {message.reply_to.sender}</span>
              </div>
              <div className="text-xs text-gray-300 truncate">
                {message.reply_to.content}
              </div>
            </div>
          </div>
        )}

        {/* Forwarded Context */}
        {message.forwarded_from && (
          <div className="px-3 pt-2">
            <div className="border-l-2 border-blue-500 pl-3 py-1 bg-blue-900/20 rounded-r">
              <div className="flex items-center space-x-1 text-xs text-blue-400 mb-1">
                <Forward className="w-3 h-3" />
                <span>Forwarded from {message.forwarded_from.channel_name}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3">
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <button
              onClick={() => onSelect?.(message.id)}
              className="mt-1 p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-400" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}

          <div className="flex-1 space-y-4 p-4 bg-slate-800/20 rounded-lg">
        {/* Response Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {channelType === 'channel' ? (
              <Hash className="h-4 w-4 text-slate-400" />
            ) : (
              <MessageCircle className="h-4 w-4 text-slate-400" />
            )}
            <span className="text-sm font-medium text-slate-300">
              {isDM ? 'Direct Response' : 'Channel Discussion'}
            </span>
            <span className="text-xs text-slate-500">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
            <div className="flex items-center space-x-2">
          {/* Interaction Mode Indicator */}
          <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded-full">
            <span className="text-xs">{mode.icon}</span>
            <span className="text-xs text-slate-400">{mode.name}</span>
              </div>

              {/* Message Actions */}
              {(onReply || onForward || onDelete || onCopy) && (
                <MessageActions
                  message={message}
                  onReply={onReply || (() => {})}
                  onForward={onForward || (() => {})}
                  onDelete={onDelete || (() => {})}
                  onCopy={onCopy ? () => onCopy(getCouncilResponseText(response)) : (() => {})}
                  isOwnMessage={false}
                />
              )}
          </div>
        </div>

        {/* Council Member Responses */}
        {response.council_responses.map((councilResponse, index) => (
          <CouncilMemberResponse
            key={`${councilResponse.member_name}-${index}`}
            response={councilResponse}
          />
        ))}

        {/* Strategic Synthesis - based on interaction mode */}
        {mode?.abilities?.includes('synthesis') && !isDM && response.council_responses.length > 1 && (
          <StrategicSynthesis 
            synthesis={response.synthesis}
            processingTime={response.processing_time || 0}
            confidenceScore={response.confidence_score || 0}
          />
        )}

        {/* Recommended Actions - based on interaction mode */}
        {mode?.abilities?.includes('actions') && response.recommended_actions && response.recommended_actions.length > 0 && (
          <RecommendedActions 
            actions={response.recommended_actions}
            confidenceScore={response.confidence_score || 0}
          />
        )}

        {/* Mode-specific footer info */}
        {mode?.abilities?.includes('conversational') && (
          <div className="text-xs text-slate-500 italic">
            💬 Conversational mode - natural, engaging dialogue
          </div>
        )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ChannelMessage; 