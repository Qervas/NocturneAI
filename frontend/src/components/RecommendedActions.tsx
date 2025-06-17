import React, { useState } from 'react';
import { Target, CheckCircle, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface RecommendedActionsProps {
  actions: string[];
  confidenceScore: number;
}

const RecommendedActions: React.FC<RecommendedActionsProps> = ({ actions, confidenceScore }) => {
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleAction = (index: number) => {
    const newCompleted = new Set(completedActions);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedActions(newCompleted);
  };

  const getPriorityColor = (index: number) => {
    // First action is highest priority
    if (index === 0) return 'border-red-500/30 bg-red-500/5';
    if (index === 1) return 'border-orange-500/30 bg-orange-500/5';
    if (index === 2) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-blue-500/30 bg-blue-500/5';
  };

  const getPriorityLabel = (index: number) => {
    if (index === 0) return { label: 'HIGH', color: 'text-red-400 bg-red-500/20' };
    if (index === 1) return { label: 'MEDIUM', color: 'text-orange-400 bg-orange-500/20' };
    if (index === 2) return { label: 'MEDIUM', color: 'text-yellow-400 bg-yellow-500/20' };
    return { label: 'LOW', color: 'text-blue-400 bg-blue-500/20' };
  };

  if (actions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-blue-500/20">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Recommended Next Steps</h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <span>Priority-ranked actions</span>
                  <span>•</span>
                  <span>Confidence: {(confidenceScore * 100).toFixed(0)}%</span>
                  <span>•</span>
                  <span>{completedActions.size}/{actions.length} completed</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-sm text-slate-300">
                {isExpanded ? 'Collapse' : 'Expand'}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Actions List */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {actions.map((action, index) => {
            const isCompleted = completedActions.has(index);
            const priority = getPriorityLabel(index);
            
            return (
              <div
                key={index}
                className={`rounded-lg border p-4 transition-all ${
                  isCompleted 
                    ? 'border-green-500/30 bg-green-500/5 opacity-60' 
                    : getPriorityColor(index)
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => toggleAction(index)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'border-green-500 bg-green-500'
                        : 'border-slate-500 hover:border-blue-400'
                    }`}
                  >
                    {isCompleted && <CheckCircle className="h-3 w-3 text-white" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          Action #{index + 1}
                        </span>
                      </div>
                      
                      {!isCompleted && (
                        <div className="flex items-center space-x-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                    
                    <p className={`text-sm leading-relaxed ${
                      isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'
                    }`}>
                      {action}
                    </p>
                    
                    {!isCompleted && (
                      <div className="flex items-center space-x-2 mt-2 text-xs text-blue-400">
                        <ArrowRight className="h-3 w-3" />
                        <span>Click to mark as completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Progress Bar */}
          <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-300">Progress</span>
              <span className="text-slate-400">
                {completedActions.size} of {actions.length} actions completed
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedActions.size / actions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendedActions; 