/**
 * Decision Management - Autonomous Decision Approval Interface
 * Advanced filtering, batch operations, and decision execution
 */

import React, { useState, useEffect } from 'react';
import { autonomousAgentService, AutonomousDecision } from '../../services/autonomousAgentService';

interface DecisionManagementProps {
  className?: string;
}

interface FilterState {
  agent: string;
  status: string;
  impact: string;
  type: string;
  timeframe: string;
}

interface BatchState {
  selectedDecisions: Set<string>;
  showBatchActions: boolean;
  batchOperation: 'approve' | 'reject' | null;
}

interface DecisionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  autoExecuted: number;
}

export const DecisionManagement: React.FC<DecisionManagementProps> = ({ className = '' }) => {
  const [decisions, setDecisions] = useState<AutonomousDecision[]>([]);
  const [filteredDecisions, setFilteredDecisions] = useState<AutonomousDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DecisionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    autoExecuted: 0
  });

  const [filters, setFilters] = useState<FilterState>({
    agent: 'all',
    status: 'all',
    impact: 'all',
    type: 'all',
    timeframe: '24h'
  });

  const [batch, setBatch] = useState<BatchState>({
    selectedDecisions: new Set(),
    showBatchActions: false,
    batchOperation: null
  });

  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);
  const [executingDecision, setExecutingDecision] = useState<string | null>(null);

  const agents = ['Sarah Chen', 'Marcus Rodriguez', 'Elena Vasquez', 'David Kim'];

  useEffect(() => {
    loadDecisions();
  }, []);

  useEffect(() => {
    filterDecisions();
  }, [decisions, filters]);

  const loadDecisions = async () => {
    setLoading(true);
    try {
      const result = await autonomousAgentService.getDecisions({});
      setDecisions(result.decisions);
      
      // Calculate stats
      const newStats = {
        total: result.decisions.length,
        pending: result.decisions.filter(d => d.status === 'pending').length,
        approved: result.decisions.filter(d => d.status === 'approved').length,
        rejected: result.decisions.filter(d => d.status === 'rejected').length,
        autoExecuted: result.decisions.filter(d => d.auto_execute).length
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error loading decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDecisions();
    setRefreshing(false);
  };

  const filterDecisions = () => {
    let filtered = [...decisions];

    // Apply filters
    if (filters.agent !== 'all') {
      filtered = filtered.filter(d => d.agent_name === filters.agent);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.status === filters.status);
    }
    if (filters.impact !== 'all') {
      filtered = filtered.filter(d => d.impact_level === filters.impact);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(d => d.decision_type === filters.type);
    }

    // Apply timeframe filter
    if (filters.timeframe !== 'all') {
      const now = new Date();
      const timeLimit = new Date();
      
      switch (filters.timeframe) {
        case '1h':
          timeLimit.setHours(now.getHours() - 1);
          break;
        case '24h':
          timeLimit.setDate(now.getDate() - 1);
          break;
        case '7d':
          timeLimit.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeLimit.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(d => new Date(d.created_at) >= timeLimit);
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (a.impact_level !== b.impact_level) {
        return priorityOrder[b.impact_level as keyof typeof priorityOrder] - priorityOrder[a.impact_level as keyof typeof priorityOrder];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredDecisions(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDecisionSelect = (decisionId: string) => {
    setBatch(prev => {
      const newSelected = new Set(prev.selectedDecisions);
      if (newSelected.has(decisionId)) {
        newSelected.delete(decisionId);
      } else {
        newSelected.add(decisionId);
      }
      return {
        ...prev,
        selectedDecisions: newSelected,
        showBatchActions: newSelected.size > 0
      };
    });
  };

  const handleSelectAll = () => {
    const pendingDecisions = filteredDecisions.filter(d => d.status === 'pending');
    setBatch(prev => ({
      ...prev,
      selectedDecisions: new Set(pendingDecisions.map(d => d.id)),
      showBatchActions: pendingDecisions.length > 0
    }));
  };

  const handleClearSelection = () => {
    setBatch({
      selectedDecisions: new Set(),
      showBatchActions: false,
      batchOperation: null
    });
  };

  const executeDecision = async (decisionId: string, action: 'approve' | 'reject') => {
    setExecutingDecision(decisionId);
    try {
      if (action === 'approve') {
        await autonomousAgentService.executeDecision(decisionId);
      }
      // For reject, we might need a separate API endpoint
      await loadDecisions();
    } catch (error) {
      console.error('Error executing decision:', error);
    } finally {
      setExecutingDecision(null);
    }
  };

  const executeBatchOperation = async (action: 'approve' | 'reject') => {
    setBatch(prev => ({ ...prev, batchOperation: action }));
    
    try {
      const promises = Array.from(batch.selectedDecisions).map(id => 
        action === 'approve' ? autonomousAgentService.executeDecision(id) : Promise.resolve()
      );
      
      await Promise.all(promises);
      await loadDecisions();
      handleClearSelection();
    } catch (error) {
      console.error('Error executing batch operation:', error);
    } finally {
      setBatch(prev => ({ ...prev, batchOperation: null }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'approved': return 'text-green-600 bg-green-100 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-100 border-red-200';
      case 'executed': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getAgentColor = (agent: string) => {
    const colors = {
      'Sarah Chen': 'bg-purple-500',
      'Marcus Rodriguez': 'bg-blue-500',
      'Elena Vasquez': 'bg-pink-500',
      'David Kim': 'bg-green-500'
    };
    return colors[agent as keyof typeof colors] || 'bg-gray-500';
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Decision Management</h1>
          <p className="text-gray-600 mt-1">Review and approve autonomous agent decisions</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {refreshing ? '🔄' : '↻'} Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Decisions</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.autoExecuted}</div>
          <div className="text-sm text-gray-600">Auto-Executed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
            <select
              value={filters.agent}
              onChange={(e) => handleFilterChange('agent', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="executed">Executed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Impact</label>
            <select
              value={filters.impact}
              onChange={(e) => handleFilterChange('impact', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Impact</option>
              <option value="high">High Impact</option>
              <option value="medium">Medium Impact</option>
              <option value="low">Low Impact</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="proactive_research">Research</option>
              <option value="initiative_proposal">Initiative</option>
              <option value="optimization_suggestion">Optimization</option>
              <option value="risk_mitigation">Risk Mitigation</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={filters.timeframe}
              onChange={(e) => handleFilterChange('timeframe', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {batch.showBatchActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-blue-800 font-medium">
                {batch.selectedDecisions.size} decisions selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => executeBatchOperation('approve')}
                disabled={batch.batchOperation === 'approve'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {batch.batchOperation === 'approve' ? 'Approving...' : '✓ Approve All'}
              </button>
              <button
                onClick={() => executeBatchOperation('reject')}
                disabled={batch.batchOperation === 'reject'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {batch.batchOperation === 'reject' ? 'Rejecting...' : '✗ Reject All'}
              </button>
              <button
                onClick={handleClearSelection}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decisions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Decisions ({filteredDecisions.length})
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-lg hover:bg-blue-200"
              >
                Select All Pending
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredDecisions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No decisions found</h3>
              <p>No decisions match your current filter criteria.</p>
            </div>
          ) : (
            filteredDecisions.map((decision) => (
              <div key={decision.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  {decision.status === 'pending' && (
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={batch.selectedDecisions.has(decision.id)}
                        onChange={() => handleDecisionSelect(decision.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Agent Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${getAgentColor(decision.agent_name)}`}>
                    {decision.agent_name.split(' ').map(n => n[0]).join('')}
                  </div>

                  {/* Decision Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{decision.agent_name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(decision.status)}`}>
                          {decision.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getImpactColor(decision.impact_level)}`}>
                          {decision.impact_level} impact
                        </span>
                        {decision.auto_execute && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            auto-executed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{formatTime(decision.created_at)}</span>
                        <span>•</span>
                        <span>Confidence: {Math.round(decision.confidence * 100)}%</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-1 capitalize">
                        {decision.decision_type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-gray-700">{decision.reasoning}</p>
                    </div>

                    {/* Resource Requirements */}
                    {decision.resource_requirements && Object.keys(decision.resource_requirements).length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Resource Requirements:</h5>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(decision.resource_requirements).map(([key, value]) => (
                            <span key={key} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {expandedDecision === decision.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Context Analysis:</span>
                            <p className="text-gray-600 mt-1">{decision.context_summary || 'No additional context available'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Expected Outcomes:</span>
                            <p className="text-gray-600 mt-1">Based on confidence level and impact assessment</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => setExpandedDecision(
                          expandedDecision === decision.id ? null : decision.id
                        )}
                        className="text-blue-600 text-sm hover:text-blue-800"
                      >
                        {expandedDecision === decision.id ? 'Hide details' : 'Show details'}
                      </button>

                      {decision.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => executeDecision(decision.id, 'reject')}
                            disabled={executingDecision === decision.id}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            ✗ Reject
                          </button>
                          <button
                            onClick={() => executeDecision(decision.id, 'approve')}
                            disabled={executingDecision === decision.id}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {executingDecision === decision.id ? 'Executing...' : '✓ Approve'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 