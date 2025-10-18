/**
 * API Documentation Generator
 *
 * Generates comprehensive API documentation from TypeScript source files.
 * Parses TypeScript AST to extract interfaces, classes, functions, and types
 * with their JSDoc comments and generates markdown documentation.
 *
 * Features:
 * - TypeScript AST parsing
 * - JSDoc comment extraction
 * - Type signature generation
 * - Markdown output formatting
 * - Cross-references and links
 * - Table of contents generation
 * - Example code blocks
 * - Multiple output formats (markdown, HTML, JSON)
 *
 * @module ApiDocsGenerator
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Documentation node types
 */
export type DocNodeType =
  | 'interface'
  | 'class'
  | 'function'
  | 'type'
  | 'enum'
  | 'variable'
  | 'module';

/**
 * Parameter documentation
 */
export interface ParamDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  defaultValue?: string;
}

/**
 * Method/function documentation
 */
export interface MethodDoc {
  name: string;
  description?: string;
  parameters: ParamDoc[];
  returnType: string;
  returnDescription?: string;
  examples?: string[];
  deprecated?: boolean;
  since?: string;
  tags?: Record<string, string>;
}

/**
 * Property documentation
 */
export interface PropertyDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  readonly?: boolean;
  deprecated?: boolean;
}

/**
 * Documentation node
 */
export interface DocNode {
  type: DocNodeType;
  name: string;
  description?: string;
  filePath: string;
  line?: number;
  properties?: PropertyDoc[];
  methods?: MethodDoc[];
  typeParameters?: string[];
  extends?: string[];
  implements?: string[];
  examples?: string[];
  deprecated?: boolean;
  since?: string;
  tags?: Record<string, string>;
}

/**
 * Documentation section
 */
export interface DocSection {
  title: string;
  nodes: DocNode[];
}

/**
 * Documentation output options
 */
export interface DocOutputOptions {
  format: 'markdown' | 'html' | 'json';
  includePrivate?: boolean;
  includeInternal?: boolean;
  includeToc?: boolean;
  groupBy?: 'type' | 'module' | 'none';
  linkPrefix?: string;
  title?: string;
  description?: string;
}

/**
 * API Documentation Generator
 *
 * Parses TypeScript files and generates comprehensive API documentation.
 *
 * @example
 * ```typescript
 * const generator = new ApiDocsGenerator({
 *   format: 'markdown',
 *   includeToc: true,
 *   groupBy: 'type'
 * });
 *
 * await generator.addSourceFiles(['src/**\/*.ts']);
 * const docs = await generator.generate();
 * await generator.writeToFile('docs/API.md', docs);
 * ```
 */
export class ApiDocsGenerator {
  private nodes: DocNode[] = [];
  private options: Required<DocOutputOptions>;
  private program?: ts.Program;

  constructor(options: DocOutputOptions) {
    this.options = {
      includePrivate: false,
      includeInternal: false,
      includeToc: true,
      groupBy: 'type',
      linkPrefix: '',
      title: 'API Documentation',
      description: '',
      ...options,
    };
  }

  /**
   * Add source files to parse
   *
   * @param patterns - File paths or glob patterns
   */
  async addSourceFiles(patterns: string[]): Promise<void> {
    const files: string[] = [];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Simple glob expansion (for production, use a proper glob library)
        const dir = path.dirname(pattern.replace(/\*\*.*/, ''));
        const matchFiles = await this.findFiles(dir, pattern);
        files.push(...matchFiles);
      } else {
        files.push(pattern);
      }
    }

    // Create TypeScript program
    this.program = ts.createProgram(files, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    });

    // Parse each source file
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile && files.some(f => sourceFile.fileName.includes(f))) {
        this.parseSourceFile(sourceFile);
      }
    }
  }

  /**
   * Find files matching pattern
   */
  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...await this.findFiles(fullPath, pattern));
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Parse a TypeScript source file
   */
  private parseSourceFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      // Check if node should be documented
      if (this.shouldDocument(node)) {
        const docNode = this.createDocNode(node, sourceFile);
        if (docNode) {
          this.nodes.push(docNode);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Check if a node should be documented
   */
  private shouldDocument(node: ts.Node): boolean {
    // Check for modifiers
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;

    if (!this.options.includePrivate && modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
      return false;
    }

    // Check JSDoc tags
    const jsDoc = this.getJSDocComments(node);
    if (!this.options.includeInternal && jsDoc.tags?.internal) {
      return false;
    }

    // Only document exported items (unless it's a module)
    if (ts.isModuleDeclaration(node)) {
      return true;
    }

    const hasExportModifier = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    return hasExportModifier || false;
  }

  /**
   * Create documentation node from TypeScript node
   */
  private createDocNode(node: ts.Node, sourceFile: ts.SourceFile): DocNode | null {
    const jsDoc = this.getJSDocComments(node);
    const name = this.getNodeName(node);

    if (!name) {
      return null;
    }

    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    const baseDoc: Partial<DocNode> = {
      name,
      description: jsDoc.description,
      filePath: sourceFile.fileName,
      line,
      examples: jsDoc.examples,
      deprecated: jsDoc.tags?.deprecated === 'true',
      since: jsDoc.tags?.since,
      tags: jsDoc.tags,
    };

    if (ts.isInterfaceDeclaration(node)) {
      return {
        ...baseDoc,
        type: 'interface',
        typeParameters: node.typeParameters?.map(tp => tp.name.text),
        extends: node.heritageClauses?.flatMap(hc =>
          hc.types.map(t => t.expression.getText())
        ),
        properties: this.extractProperties(node.members),
        methods: this.extractMethods(node.members),
      } as DocNode;
    }

    if (ts.isClassDeclaration(node)) {
      return {
        ...baseDoc,
        type: 'class',
        typeParameters: node.typeParameters?.map(tp => tp.name.text),
        extends: node.heritageClauses
          ?.filter(hc => hc.token === ts.SyntaxKind.ExtendsKeyword)
          .flatMap(hc => hc.types.map(t => t.expression.getText())),
        implements: node.heritageClauses
          ?.filter(hc => hc.token === ts.SyntaxKind.ImplementsKeyword)
          .flatMap(hc => hc.types.map(t => t.expression.getText())),
        properties: this.extractProperties(node.members.filter(ts.isPropertyDeclaration)),
        methods: this.extractMethods(node.members.filter(ts.isMethodDeclaration)),
      } as DocNode;
    }

    if (ts.isFunctionDeclaration(node)) {
      const method = this.createMethodDoc(node);
      return {
        ...baseDoc,
        type: 'function',
        methods: method ? [method] : [],
      } as DocNode;
    }

    if (ts.isTypeAliasDeclaration(node)) {
      return {
        ...baseDoc,
        type: 'type',
        typeParameters: node.typeParameters?.map(tp => tp.name.text),
      } as DocNode;
    }

    if (ts.isEnumDeclaration(node)) {
      return {
        ...baseDoc,
        type: 'enum',
        properties: node.members.map(m => ({
          name: m.name.getText(),
          type: 'number',
          description: this.getJSDocComments(m).description,
        })),
      } as DocNode;
    }

    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isIdentifier(declaration.name)) {
        return {
          ...baseDoc,
          type: 'variable',
          name: declaration.name.text,
        } as DocNode;
      }
    }

    return null;
  }

  /**
   * Get node name
   */
  private getNodeName(node: ts.Node): string | null {
    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) ||
        ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) {
      return node.name?.text || null;
    }
    return null;
  }

  /**
   * Extract properties from members
   */
  private extractProperties(members: ts.NodeArray<ts.TypeElement> | ts.ClassElement[]): PropertyDoc[] {
    const properties: PropertyDoc[] = [];

    for (const member of members) {
      if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
        const jsDoc = this.getJSDocComments(member);
        const name = member.name?.getText() || '';
        const type = member.type?.getText() || 'any';
        const optional = member.questionToken !== undefined;
        const readonly = member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword);

        properties.push({
          name,
          type,
          description: jsDoc.description,
          optional,
          readonly,
          deprecated: jsDoc.tags?.deprecated === 'true',
        });
      }
    }

    return properties;
  }

  /**
   * Extract methods from members
   */
  private extractMethods(members: ts.NodeArray<ts.TypeElement> | ts.ClassElement[]): MethodDoc[] {
    const methods: MethodDoc[] = [];

    for (const member of members) {
      if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) {
        const method = this.createMethodDoc(member);
        if (method) {
          methods.push(method);
        }
      }
    }

    return methods;
  }

  /**
   * Create method documentation
   */
  private createMethodDoc(
    node: ts.MethodSignature | ts.MethodDeclaration | ts.FunctionDeclaration
  ): MethodDoc | null {
    const jsDoc = this.getJSDocComments(node);
    const name = node.name?.getText() || '';
    const returnType = node.type?.getText() || 'void';

    const parameters: ParamDoc[] = node.parameters.map(param => {
      const paramName = param.name.getText();
      const paramType = param.type?.getText() || 'any';
      const optional = param.questionToken !== undefined;
      const defaultValue = param.initializer?.getText();

      return {
        name: paramName,
        type: paramType,
        description: jsDoc.params?.[paramName],
        optional,
        defaultValue,
      };
    });

    return {
      name,
      description: jsDoc.description,
      parameters,
      returnType,
      returnDescription: jsDoc.returns,
      examples: jsDoc.examples,
      deprecated: jsDoc.tags?.deprecated === 'true',
      since: jsDoc.tags?.since,
      tags: jsDoc.tags,
    };
  }

  /**
   * Get JSDoc comments from a node
   */
  private getJSDocComments(node: ts.Node): {
    description?: string;
    params?: Record<string, string>;
    returns?: string;
    examples?: string[];
    tags?: Record<string, string>;
  } {
    const jsDocTags = ts.getJSDocTags(node);
    const jsDocComments = ts.getJSDocCommentsAndTags(node);

    const result: ReturnType<typeof this.getJSDocComments> = {
      params: {},
      examples: [],
      tags: {},
    };

    // Extract description
    for (const comment of jsDocComments) {
      if (ts.isJSDoc(comment) && comment.comment) {
        result.description = typeof comment.comment === 'string'
          ? comment.comment
          : comment.comment.map(c => c.text).join('');
      }
    }

    // Extract tags
    for (const tag of jsDocTags) {
      const tagName = tag.tagName.text;
      const tagComment = typeof tag.comment === 'string'
        ? tag.comment
        : tag.comment?.map(c => c.text).join('') || '';

      if (tagName === 'param' && ts.isJSDocParameterTag(tag)) {
        const paramName = tag.name.getText();
        result.params![paramName] = tagComment;
      } else if (tagName === 'returns' || tagName === 'return') {
        result.returns = tagComment;
      } else if (tagName === 'example') {
        result.examples!.push(tagComment);
      } else {
        result.tags![tagName] = tagComment;
      }
    }

    return result;
  }

  /**
   * Generate documentation
   */
  async generate(): Promise<string> {
    if (this.options.format === 'json') {
      return this.generateJSON();
    } else if (this.options.format === 'html') {
      return this.generateHTML();
    } else {
      return this.generateMarkdown();
    }
  }

  /**
   * Generate JSON documentation
   */
  private generateJSON(): string {
    return JSON.stringify(this.nodes, null, 2);
  }

  /**
   * Generate HTML documentation
   */
  private generateHTML(): string {
    const sections = this.groupNodes();
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.options.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 4px; overflow-x: auto; }
    .deprecated { text-decoration: line-through; color: #999; }
    .optional { color: #666; font-style: italic; }
    .toc { background: #f9f9f9; padding: 16px; border-left: 4px solid #007acc; margin-bottom: 32px; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc li { padding: 4px 0; }
    .toc a { text-decoration: none; color: #007acc; }
  </style>
</head>
<body>
  <h1>${this.options.title}</h1>
  ${this.options.description ? `<p>${this.options.description}</p>` : ''}
`;

    if (this.options.includeToc) {
      html += this.generateHTMLToc(sections);
    }

    for (const section of sections) {
      html += this.generateHTMLSection(section);
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Generate HTML table of contents
   */
  private generateHTMLToc(sections: DocSection[]): string {
    let toc = '<div class="toc"><h2>Table of Contents</h2><ul>';

    for (const section of sections) {
      toc += `<li><a href="#${this.slugify(section.title)}">${section.title}</a><ul>`;
      for (const node of section.nodes) {
        toc += `<li><a href="#${this.slugify(node.name)}">${node.name}</a></li>`;
      }
      toc += '</ul></li>';
    }

    toc += '</ul></div>';
    return toc;
  }

  /**
   * Generate HTML section
   */
  private generateHTMLSection(section: DocSection): string {
    let html = `<h2 id="${this.slugify(section.title)}">${section.title}</h2>`;

    for (const node of section.nodes) {
      html += `<div class="doc-node">`;
      html += `<h3 id="${this.slugify(node.name)}">${node.name}</h3>`;

      if (node.description) {
        html += `<p>${node.description}</p>`;
      }

      if (node.properties && node.properties.length > 0) {
        html += '<h4>Properties</h4><ul>';
        for (const prop of node.properties) {
          html += `<li><code>${prop.name}</code>: <code>${prop.type}</code>`;
          if (prop.description) html += ` - ${prop.description}`;
          html += '</li>';
        }
        html += '</ul>';
      }

      if (node.methods && node.methods.length > 0) {
        html += '<h4>Methods</h4>';
        for (const method of node.methods) {
          html += `<p><code>${method.name}(${method.parameters.map(p =>
            `${p.name}: ${p.type}`).join(', ')}): ${method.returnType}</code></p>`;
          if (method.description) {
            html += `<p>${method.description}</p>`;
          }
        }
      }

      html += '</div>';
    }

    return html;
  }

  /**
   * Generate Markdown documentation
   */
  private generateMarkdown(): string {
    const sections = this.groupNodes();
    let md = `# ${this.options.title}\n\n`;

    if (this.options.description) {
      md += `${this.options.description}\n\n`;
    }

    if (this.options.includeToc) {
      md += this.generateMarkdownToc(sections);
    }

    for (const section of sections) {
      md += this.generateMarkdownSection(section);
    }

    return md;
  }

  /**
   * Generate Markdown table of contents
   */
  private generateMarkdownToc(sections: DocSection[]): string {
    let toc = '## Table of Contents\n\n';

    for (const section of sections) {
      toc += `- [${section.title}](#${this.slugify(section.title)})\n`;
      for (const node of section.nodes) {
        toc += `  - [${node.name}](#${this.slugify(node.name)})\n`;
      }
    }

    toc += '\n---\n\n';
    return toc;
  }

  /**
   * Generate Markdown section
   */
  private generateMarkdownSection(section: DocSection): string {
    let md = `## ${section.title}\n\n`;

    for (const node of section.nodes) {
      md += `### ${node.name}\n\n`;

      if (node.deprecated) {
        md += '> ⚠️ **Deprecated**\n\n';
      }

      if (node.description) {
        md += `${node.description}\n\n`;
      }

      if (node.extends && node.extends.length > 0) {
        md += `**Extends:** ${node.extends.join(', ')}\n\n`;
      }

      if (node.implements && node.implements.length > 0) {
        md += `**Implements:** ${node.implements.join(', ')}\n\n`;
      }

      if (node.properties && node.properties.length > 0) {
        md += '#### Properties\n\n';
        md += '| Name | Type | Description |\n';
        md += '|------|------|-------------|\n';

        for (const prop of node.properties) {
          const name = prop.optional ? `${prop.name}?` : prop.name;
          const readonly = prop.readonly ? '(readonly) ' : '';
          md += `| \`${name}\` | \`${prop.type}\` | ${readonly}${prop.description || ''} |\n`;
        }

        md += '\n';
      }

      if (node.methods && node.methods.length > 0) {
        md += '#### Methods\n\n';

        for (const method of node.methods) {
          const params = method.parameters.map(p =>
            `${p.name}${p.optional ? '?' : ''}: ${p.type}`
          ).join(', ');

          md += `##### \`${method.name}(${params}): ${method.returnType}\`\n\n`;

          if (method.description) {
            md += `${method.description}\n\n`;
          }

          if (method.parameters.length > 0) {
            md += '**Parameters:**\n\n';
            for (const param of method.parameters) {
              md += `- \`${param.name}\` (\`${param.type}\`)`;
              if (param.description) md += `: ${param.description}`;
              md += '\n';
            }
            md += '\n';
          }

          if (method.returnDescription) {
            md += `**Returns:** ${method.returnDescription}\n\n`;
          }

          if (method.examples && method.examples.length > 0) {
            md += '**Example:**\n\n';
            for (const example of method.examples) {
              md += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
            }
          }
        }
      }

      if (node.examples && node.examples.length > 0 && !node.methods?.length) {
        md += '#### Examples\n\n';
        for (const example of node.examples) {
          md += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
        }
      }

      md += '---\n\n';
    }

    return md;
  }

  /**
   * Group nodes into sections
   */
  private groupNodes(): DocSection[] {
    if (this.options.groupBy === 'none') {
      return [{ title: 'API', nodes: this.nodes }];
    }

    if (this.options.groupBy === 'type') {
      const groups: Record<string, DocNode[]> = {};

      for (const node of this.nodes) {
        const type = node.type.charAt(0).toUpperCase() + node.type.slice(1) + 's';
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(node);
      }

      return Object.entries(groups).map(([title, nodes]) => ({ title, nodes }));
    }

    // Group by module (file path)
    const groups: Record<string, DocNode[]> = {};

    for (const node of this.nodes) {
      const module = path.basename(node.filePath, '.ts');
      if (!groups[module]) {
        groups[module] = [];
      }
      groups[module].push(node);
    }

    return Object.entries(groups).map(([title, nodes]) => ({ title, nodes }));
  }

  /**
   * Create URL-safe slug from text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Write documentation to file
   */
  async writeToFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Get all parsed nodes
   */
  getNodes(): DocNode[] {
    return this.nodes;
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes = [];
    this.program = undefined;
  }
}

/**
 * Create API documentation generator
 *
 * @param options - Output options
 * @returns API documentation generator instance
 *
 * @example
 * ```typescript
 * const generator = createApiDocsGenerator({
 *   format: 'markdown',
 *   title: 'My API',
 *   includeToc: true
 * });
 *
 * await generator.addSourceFiles(['src/**\/*.ts']);
 * const docs = await generator.generate();
 * await generator.writeToFile('docs/API.md', docs);
 * ```
 */
export function createApiDocsGenerator(options: DocOutputOptions): ApiDocsGenerator {
  return new ApiDocsGenerator(options);
}
