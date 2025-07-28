// Simple markdown renderer for chat messages
// Supports basic markdown syntax: **bold**, *italic*, `code`, ```code blocks```, [links], etc.

export function renderMarkdown(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML to prevent XSS
  html = escapeHtml(html);
  
  // Code blocks (```...```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');
  
  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold (**...**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic (*...*)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Alternative: Use DOMPurify for better security
export function renderMarkdownSafe(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Code blocks (```...```) with syntax highlighting
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const language = detectLanguage(code);
    const highlighted = highlightSyntax(code, language);
    return `<pre class="code-block"><code class="language-${language}">${highlighted}</code></pre>`;
  });
  
  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Bold (**...**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic (*...*)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Links [text](url) - only allow http/https
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// Import syntax highlighting functions
import { highlightSyntax, detectLanguage } from "./syntaxHighlighter"; 