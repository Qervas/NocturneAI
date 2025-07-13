/**
 * Decision Management - Simplified Agent Decision Interface
 * Dashboard for monitoring agent decisions and actions
 */

import React, { useState, useEffect } from 'react';
import { dynamicAgentService, DynamicAgent } from '../../services/dynamicAgentService';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DecisionManagementProps {
  className?: string;
}

interface MockDecision {
  id: string;
  title: string;
  description: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'approved' | 'rejected';
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  reasoning: string;
  timestamp: string;
  type: string;
}

interface DecisionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const DecisionManagement: React.FC<DecisionManagementProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<DynamicAgent[]>([]);
  const [decisions, setDecisions] = useState<MockDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<DecisionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const agentsData = await dynamicAgentService.getAllAgents();
      setAgents(agentsData);
      
      // Generate mock decisions based on real agents
      const mockDecisions: MockDecision[] = agentsData.flatMap((agent, index) => [
        {
          id: `dec-${agent.profile.agent_id}-1`,
          title: 'Optimize workflow process',
          description: `Proposed optimization to improve efficiency in ${agent.profile.role} tasks`,
          agentId: agent.profile.agent_id,
          agentName: agent.profile.name,
                     status: (index % 3 === 0 ? 'pending' : index % 3 === 1 ? 'approved' : 'rejected') as 'pending' | 'approved' | 'rejected',
          impact: (['low', 'medium', 'high'] as const)[index % 3],
          confidence: Math.floor(Math.random() * 30) + 70,
          reasoning: `Based on analysis of current ${agent.profile.role} workflows, this optimization could improve efficiency by 15-25%.`,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          type: 'process_optimization'
        },
        {
          id: `dec-${agent.profile.agent_id}-2`,
          title: 'Resource allocation adjustment',
          description: `Suggested reallocation of resources for ${agent.profile.role} activities`,
          agentId: agent.profile.agent_id,
          agentName: agent.profile.name,
                     status: (index % 2 === 0 ? 'pending' : 'approved') as 'pending' | 'approved',
          impact: (['medium', 'high'] as const)[index % 2],
          confidence: Math.floor(Math.random() * 20) + 80,
          reasoning: `Current resource allocation analysis shows potential for 20% improvement in ${agent.profile.role} productivity.`,
          timestamp: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),
          type: 'resource_management'
        }
      ]);

      setDecisions(mockDecisions);
      updateStats(mockDecisions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (decisions: MockDecision[]) => {
    const stats = {
      total: decisions.length,
      pending: decisions.filter(d => d.status === 'pending').length,
      approved: decisions.filter(d => d.status === 'approved').length,
      rejected: decisions.filter(d => d.status === 'rejected').length
    };
    setStats(stats);
  };

  const filteredDecisions = decisions.filter(decision => {
    const matchesAgent = filterAgent === 'all' || decision.agentId === filterAgent;
    const matchesStatus = filterStatus === 'all' || decision.status === filterStatus;
    return matchesAgent && matchesStatus;
  });

  const handleDecisionAction = async (decisionId: string, action: 'approve' | 'reject') => {
    setDecisions(prev => 
      prev.map(decision => 
        decision.id === decisionId 
          ? { ...decision, status: action === 'approve' ? 'approved' : 'rejected' }
          : decision
      )
    );
    
    // Update stats
    const updatedDecisions = decisions.map(decision => 
      decision.id === decisionId 
        ? { ...decision, status: action === 'approve' ? 'approved' : 'rejected' }
        : decision
    );
    updateStats(updatedDecisions);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAgentColor = (agentId: string) => {
    const agent = agents.find(a => a.profile.agent_id === agentId);
    if (!agent) return 'bg-gray-500';
    
    const colors = {
      'purple': 'bg-purple-500',
      'blue': 'bg-blue-500',
      'pink': 'bg-pink-500',
      'green': 'bg-green-500',
      'orange': 'bg-orange-500',
      'red': 'bg-red-500'
    };
    return colors[agent.profile.color_theme as keyof typeof colors] || 'bg-gray-500';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Decision Management</h1>
            <p className="text-gray-600">Monitor and manage agent decisions and recommendations</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Decisions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-wrap items-center space-x-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Agent:</span>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent.profile.agent_id} value={agent.profile.agent_id}>
                  {agent.profile.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Decisions List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Decisions</h2>
        
        {filteredDecisions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No decisions found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map(decision => (
              <div key={decision.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{decision.title}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(decision.status)}`}>
                        {decision.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getImpactColor(decision.impact)}`}>
                        {decision.impact} impact
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{decision.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full ${getAgentColor(decision.agentId)} flex items-center justify-center text-white text-xs`}>
                          {decision.agentName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{decision.agentName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatTime(decision.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Confidence: {decision.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {decision.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDecisionAction(decision.id, 'approve')}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecisionAction(decision.id, 'reject')}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedDecision(expandedDecision === decision.id ? null : decision.id)}
                      className="px-2 py-1 text-gray-500 hover:text-gray-700"
                    >
                      {expandedDecision === decision.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {expandedDecision === decision.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Reasoning</h4>
                    <p className="text-gray-700 text-sm">{decision.reasoning}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 