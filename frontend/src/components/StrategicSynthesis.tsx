import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Target, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

interface StrategicSynthesisProps {
  synthesis: string;
  processingTime: number;
  confidenceScore: number;
}

const StrategicSynthesis: React.FC<StrategicSynthesisProps> = ({ 
  synthesis, 
  processingTime, 
  confidenceScore 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse the synthesis text into structured sections
  const parseSynthesis = (text: string) => {
    const sections: Array<{ title: string; content: string[]; type: string }> = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection = { title: '', content: [] as string[], type: 'default' };
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect section headers (bold text or numbered sections)
      if (trimmedLine.includes('**') && trimmedLine.length < 100) {
        // Save previous section if it has content
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        
        // Start new section
        const title = trimmedLine.replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
        const type = getSecretType(title);
        currentSection = { title, content: [], type };
      } else if (trimmedLine) {
        // Add content to current section
        currentSection.content.push(trimmedLine);
      }
    }
    
    // Add final section
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const getSecretType = (title: string): string => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('framework') || titleLower.includes('strategy')) return 'framework';
    if (titleLower.includes('conflict') || titleLower.includes('tension')) return 'warning';
    if (titleLower.includes('theme') || titleLower.includes('agreement')) return 'success';
    if (titleLower.includes('synthesis') || titleLower.includes('executive')) return 'highlight';
    if (titleLower.includes('phase') || titleLower.includes('step')) return 'action';
    return 'default';
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'framework': return <Target className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'highlight': return <Lightbulb className="h-4 w-4" />;
      case 'action': return <CheckCircle className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'framework': return 'border-blue-500/30 bg-blue-500/5 text-blue-300';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300';
      case 'success': return 'border-green-500/30 bg-green-500/5 text-green-300';
      case 'highlight': return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
      case 'action': return 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300';
      default: return 'border-slate-600/50 bg-slate-700/20 text-slate-300';
    }
  };

  const sections = parseSynthesis(synthesis);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-600/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-slate-600/50">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Strategic Synthesis</h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <span>Analysis time: {processingTime.toFixed(2)}s</span>
                  <span>•</span>
                  <span>Confidence: {(confidenceScore * 100).toFixed(0)}%</span>
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

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {sections.length > 0 ? (
            sections.map((section, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 ${getSectionColor(section.type)}`}
              >
                {section.title && (
                  <div className="flex items-center space-x-2 mb-3">
                    {getSectionIcon(section.type)}
                    <h4 className="font-medium text-sm">{section.title}</h4>
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  {section.content.map((line, lineIndex) => {
                    // Format bullet points and special text
                    const formattedLine = line
                      .replace(/^\*\s+/, '• ')
                      .replace(/^\-\s+/, '• ')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    
                    return (
                      <p
                        key={lineIndex}
                        className="leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formattedLine }}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // Fallback for unstructured text
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {synthesis}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StrategicSynthesis; 