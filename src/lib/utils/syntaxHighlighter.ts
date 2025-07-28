// Simple syntax highlighter for code blocks
// Supports basic highlighting for common programming languages

interface HighlightRule {
  pattern: RegExp;
  replacement: string;
  className: string;
}

const syntaxRules: Record<string, HighlightRule[]> = {
  javascript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await)\b/g, replacement: '<span class="keyword">$1</span>', className: 'keyword' },
    { pattern: /\b(true|false|null|undefined)\b/g, replacement: '<span class="literal">$1</span>', className: 'literal' },
    { pattern: /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, replacement: '<span class="string">$1$2$1</span>', className: 'string' },
    { pattern: /\b(\d+(?:\.\d+)?)\b/g, replacement: '<span class="number">$1</span>', className: 'number' },
    { pattern: /(\/\/.*$)/gm, replacement: '<span class="comment">$1</span>', className: 'comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, replacement: '<span class="comment">$1</span>', className: 'comment' }
  ],
  python: [
    { pattern: /\b(def|class|import|from|as|if|else|elif|for|while|try|except|finally|with|return|yield|lambda|True|False|None)\b/g, replacement: '<span class="keyword">$1</span>', className: 'keyword' },
    { pattern: /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, replacement: '<span class="string">$1$2$1</span>', className: 'string' },
    { pattern: /\b(\d+(?:\.\d+)?)\b/g, replacement: '<span class="number">$1</span>', className: 'number' },
    { pattern: /(#.*$)/gm, replacement: '<span class="comment">$1</span>', className: 'comment' }
  ],
  typescript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|interface|type|enum|namespace|module|declare)\b/g, replacement: '<span class="keyword">$1</span>', className: 'keyword' },
    { pattern: /\b(true|false|null|undefined)\b/g, replacement: '<span class="literal">$1</span>', className: 'literal' },
    { pattern: /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, replacement: '<span class="string">$1$2$1</span>', className: 'string' },
    { pattern: /\b(\d+(?:\.\d+)?)\b/g, replacement: '<span class="number">$1</span>', className: 'number' },
    { pattern: /(\/\/.*$)/gm, replacement: '<span class="comment">$1</span>', className: 'comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, replacement: '<span class="comment">$1</span>', className: 'comment' }
  ],
  json: [
    { pattern: /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, replacement: '<span class="string">$1$2$1</span>', className: 'string' },
    { pattern: /\b(true|false|null)\b/g, replacement: '<span class="literal">$1</span>', className: 'literal' },
    { pattern: /\b(\d+(?:\.\d+)?)\b/g, replacement: '<span class="number">$1</span>', className: 'number' }
  ],
  html: [
    { pattern: /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)([^&]*?)(&gt;)/g, replacement: '$1<span class="tag">$2</span>$3$4', className: 'tag' },
    { pattern: /(\s+)([a-zA-Z-]+)(=)(["'])([^"']*)\4/g, replacement: '$1<span class="attr">$2</span>$3<span class="string">$4$5$4</span>', className: 'attr' },
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, replacement: '<span class="comment">$1</span>', className: 'comment' }
  ],
  css: [
    { pattern: /\b([a-zA-Z-]+)(\s*:)/g, replacement: '<span class="property">$1</span>$2', className: 'property' },
    { pattern: /([{}:;])/g, replacement: '<span class="punctuation">$1</span>', className: 'punctuation' },
    { pattern: /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, replacement: '<span class="string">$1$2$1</span>', className: 'string' },
    { pattern: /\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?)\b/g, replacement: '<span class="number">$1</span>', className: 'number' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, replacement: '<span class="comment">$1</span>', className: 'comment' }
  ]
};

export function highlightSyntax(code: string, language: string = 'javascript'): string {
  if (!code) return '';
  
  // Escape HTML first
  let highlighted = escapeHtml(code);
  
  // Get rules for the language
  const rules = syntaxRules[language.toLowerCase()] || syntaxRules.javascript;
  
  // Apply highlighting rules
  for (const rule of rules) {
    highlighted = highlighted.replace(rule.pattern, rule.replacement);
  }
  
  return highlighted;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Detect language from code block
export function detectLanguage(code: string): string {
  const firstLine = code.split('\n')[0].toLowerCase();
  
  if (firstLine.includes('function') || firstLine.includes('const') || firstLine.includes('let')) {
    return 'javascript';
  }
  
  if (firstLine.includes('def ') || firstLine.includes('import ') || firstLine.includes('class ')) {
    return 'python';
  }
  
  if (firstLine.includes('interface') || firstLine.includes('type ') || firstLine.includes('enum ')) {
    return 'typescript';
  }
  
  if (firstLine.includes('{') && firstLine.includes('"')) {
    return 'json';
  }
  
  if (firstLine.includes('&lt;') || firstLine.includes('<')) {
    return 'html';
  }
  
  if (firstLine.includes('{') && firstLine.includes(':')) {
    return 'css';
  }
  
  return 'javascript'; // default
} 