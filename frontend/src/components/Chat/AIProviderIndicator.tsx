import React from 'react';
import { Cpu, Cloud, Zap } from 'lucide-react';

interface AIProviderIndicatorProps {
  provider?: 'ollama' | 'openai' | 'anthropic' | 'unknown';
  isProcessing?: boolean;
}

const AIProviderIndicator: React.FC<AIProviderIndicatorProps> = ({ 
  provider = 'ollama', 
  isProcessing = false 
}) => {
  const getProviderInfo = () => {
    switch (provider) {
      case 'ollama':
        return {
          icon: <Cpu className="h-3 w-3" />,
          label: 'Local AI',
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          description: 'Private, Local Processing'
        };
      case 'openai':
        return {
          icon: <Cloud className="h-3 w-3" />,
          label: 'OpenAI',
          color: 'text-blue-400',
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/30',
          description: 'Cloud API'
        };
      case 'anthropic':
        return {
          icon: <Cloud className="h-3 w-3" />,
          label: 'Claude',
          color: 'text-purple-400',
          bg: 'bg-purple-500/20',
          border: 'border-purple-500/30',
          description: 'Cloud API'
        };
      default:
        return {
          icon: <Zap className="h-3 w-3" />,
          label: 'AI',
          color: 'text-slate-400',
          bg: 'bg-slate-500/20',
          border: 'border-slate-500/30',
          description: 'Intelligence Engine'
        };
    }
  };

  const providerInfo = getProviderInfo();

  return (
    <div className={`inline-flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full border ${providerInfo.bg} ${providerInfo.border} ${providerInfo.color}`}>
      <div className={isProcessing ? 'animate-spin' : ''}>
        {providerInfo.icon}
      </div>
      <span>{providerInfo.label}</span>
      {provider === 'ollama' && (
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" title="Local AI Active" />
      )}
    </div>
  );
};

export default AIProviderIndicator; 