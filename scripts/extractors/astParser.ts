/**
 * TypeScript AST Parser
 * Uses the TypeScript Compiler API for accurate parsing of interfaces, types, and JSDoc
 * 
 * @description Provides robust extraction of TypeScript constructs using the official
 * TypeScript compiler rather than regex-based parsing for better accuracy.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// ============ Type Definitions ============

export interface ParsedInterface {
  name: string;
  kind: 'interface';
  file: string;
  line: number;
  properties: PropertyInfo[];
  extends: string[];
  generics: string[];
  jsdoc?: JSDocInfo;
  exported: boolean;
}

export interface ParsedTypeAlias {
  name: string;
  kind: 'type';
  file: string;
  line: number;
  definition: string;
  generics: string[];
  jsdoc?: JSDocInfo;
  exported: boolean;
}

export interface ParsedEnum {
  name: string;
  kind: 'enum';
  file: string;
  line: number;
  members: EnumMember[];
  jsdoc?: JSDocInfo;
  exported: boolean;
  isConst: boolean;
}

export interface ParsedFunction {
  name: string;
  kind: 'function';
  file: string;
  line: number;
  parameters: ParameterInfo[];
  returnType: string;
  generics: string[];
  jsdoc?: JSDocInfo;
  exported: boolean;
  isAsync: boolean;
}

export interface ParsedClass {
  name: string;
  kind: 'class';
  file: string;
  line: number;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements: string[];
  jsdoc?: JSDocInfo;
  exported: boolean;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  readonly: boolean;
  jsdoc?: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  isAsync: boolean;
  isStatic: boolean;
}

export interface EnumMember {
  name: string;
  value?: string | number;
}

export interface JSDocInfo {
  description: string;
  params: { name: string; description: string; type?: string }[];
  returns?: { description: string; type?: string };
  example?: string;
  deprecated?: boolean;
  since?: string;
  tags: { name: string; text: string }[];
}

export type ParsedNode = ParsedInterface | ParsedTypeAlias | ParsedEnum | ParsedFunction | ParsedClass;

// ============ AST Parser Class ============

export class TypeScriptASTParser {
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;

  /**
   * Parse a single TypeScript file
   */
  parseFile(filePath: string): ParsedNode[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const nodes: ParsedNode[] = [];
    this.visitNode(sourceFile, nodes, filePath);
    return nodes;
  }

  /**
   * Parse multiple files with a shared program for better type resolution
   */
  parseFiles(filePaths: string[], baseDir: string): ParsedNode[] {
    if (filePaths.length === 0) {
      return [];
    }

    // Create a program for type checking
    const configPath = ts.findConfigFile(baseDir, ts.sys.fileExists, 'tsconfig.json');
    
    let compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      skipLibCheck: true,
    };

    if (configPath) {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (!configFile.error) {
        const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, baseDir);
        compilerOptions = parsed.options;
      }
    }

    this.program = ts.createProgram(filePaths, compilerOptions);
    this.typeChecker = this.program.getTypeChecker();

    const nodes: ParsedNode[] = [];

    for (const filePath of filePaths) {
      const sourceFile = this.program.getSourceFile(filePath);
      if (sourceFile) {
        this.visitNode(sourceFile, nodes, path.relative(baseDir, filePath));
      }
    }

    return nodes;
  }

  /**
   * Visit AST nodes recursively
   */
  private visitNode(node: ts.Node, nodes: ParsedNode[], filePath: string): void {
    // Get source file for position info
    const sourceFile = node.getSourceFile();

    // Interface declaration
    if (ts.isInterfaceDeclaration(node)) {
      nodes.push(this.parseInterface(node, filePath, sourceFile));
    }
    // Type alias
    else if (ts.isTypeAliasDeclaration(node)) {
      nodes.push(this.parseTypeAlias(node, filePath, sourceFile));
    }
    // Enum declaration
    else if (ts.isEnumDeclaration(node)) {
      nodes.push(this.parseEnum(node, filePath, sourceFile));
    }
    // Function declaration
    else if (ts.isFunctionDeclaration(node) && node.name) {
      nodes.push(this.parseFunction(node, filePath, sourceFile));
    }
    // Class declaration
    else if (ts.isClassDeclaration(node) && node.name) {
      nodes.push(this.parseClass(node, filePath, sourceFile));
    }
    // Arrow function as const (e.g., export const MyComponent = () => {})
    else if (ts.isVariableStatement(node)) {
      this.parseVariableStatement(node, nodes, filePath, sourceFile);
    }

    // Recurse into children
    ts.forEachChild(node, (child) => this.visitNode(child, nodes, filePath));
  }

  /**
   * Parse interface declaration
   */
  private parseInterface(node: ts.InterfaceDeclaration, filePath: string, sourceFile: ts.SourceFile): ParsedInterface {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      kind: 'interface',
      file: filePath,
      line: line + 1,
      properties: node.members
        .filter(ts.isPropertySignature)
        .map((member) => this.parsePropertySignature(member)),
      extends: node.heritageClauses
        ?.filter((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
        .flatMap((clause) => clause.types.map((t) => t.getText(sourceFile))) || [],
      generics: node.typeParameters?.map((tp) => tp.getText(sourceFile)) || [],
      jsdoc: this.parseJSDoc(node),
      exported: this.isExported(node),
    };
  }

  /**
   * Parse type alias declaration
   */
  private parseTypeAlias(node: ts.TypeAliasDeclaration, filePath: string, sourceFile: ts.SourceFile): ParsedTypeAlias {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      kind: 'type',
      file: filePath,
      line: line + 1,
      definition: node.type.getText(sourceFile).slice(0, 100) + (node.type.getText(sourceFile).length > 100 ? '...' : ''),
      generics: node.typeParameters?.map((tp) => tp.getText(sourceFile)) || [],
      jsdoc: this.parseJSDoc(node),
      exported: this.isExported(node),
    };
  }

  /**
   * Parse enum declaration
   */
  private parseEnum(node: ts.EnumDeclaration, filePath: string, sourceFile: ts.SourceFile): ParsedEnum {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      kind: 'enum',
      file: filePath,
      line: line + 1,
      members: node.members.map((member) => ({
        name: member.name.getText(sourceFile),
        value: member.initializer ? member.initializer.getText(sourceFile) : undefined,
      })),
      jsdoc: this.parseJSDoc(node),
      exported: this.isExported(node),
      isConst: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ConstKeyword) || false,
    };
  }

  /**
   * Parse function declaration
   */
  private parseFunction(node: ts.FunctionDeclaration, filePath: string, sourceFile: ts.SourceFile): ParsedFunction {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name?.text || 'anonymous',
      kind: 'function',
      file: filePath,
      line: line + 1,
      parameters: node.parameters.map((param) => this.parseParameter(param, sourceFile)),
      returnType: node.type?.getText(sourceFile) || 'void',
      generics: node.typeParameters?.map((tp) => tp.getText(sourceFile)) || [],
      jsdoc: this.parseJSDoc(node),
      exported: this.isExported(node),
      isAsync: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
    };
  }

  /**
   * Parse class declaration
   */
  private parseClass(node: ts.ClassDeclaration, filePath: string, sourceFile: ts.SourceFile): ParsedClass {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    const extendsClause = node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword);
    const implementsClause = node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ImplementsKeyword);

    return {
      name: node.name?.text || 'anonymous',
      kind: 'class',
      file: filePath,
      line: line + 1,
      methods: node.members.filter(ts.isMethodDeclaration).map((m) => this.parseMethod(m, sourceFile)),
      properties: node.members.filter(ts.isPropertyDeclaration).map((p) => this.parseClassProperty(p, sourceFile)),
      extends: extendsClause?.types[0]?.getText(sourceFile),
      implements: implementsClause?.types.map((t) => t.getText(sourceFile)) || [],
      jsdoc: this.parseJSDoc(node),
      exported: this.isExported(node),
    };
  }

  /**
   * Parse variable statements (for arrow functions and const exports)
   */
  private parseVariableStatement(
    node: ts.VariableStatement,
    nodes: ParsedNode[],
    filePath: string,
    sourceFile: ts.SourceFile
  ): void {
    if (!this.isExported(node)) {
      return;
    }

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      // Check if it's an arrow function
      if (declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const arrowFn = declaration.initializer;

        nodes.push({
          name: declaration.name.text,
          kind: 'function',
          file: filePath,
          line: line + 1,
          parameters: arrowFn.parameters.map((param) => this.parseParameter(param, sourceFile)),
          returnType: arrowFn.type?.getText(sourceFile) || 'inferred',
          generics: arrowFn.typeParameters?.map((tp) => tp.getText(sourceFile)) || [],
          jsdoc: this.parseJSDoc(node),
          exported: true,
          isAsync: arrowFn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
        });
      }
    }
  }

  /**
   * Parse property signature (interface members)
   */
  private parsePropertySignature(node: ts.PropertySignature): PropertyInfo {
    const sourceFile = node.getSourceFile();
    
    return {
      name: node.name.getText(sourceFile),
      type: node.type?.getText(sourceFile) || 'unknown',
      optional: !!node.questionToken,
      readonly: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false,
      jsdoc: this.getPropertyJSDoc(node),
    };
  }

  /**
   * Parse class property
   */
  private parseClassProperty(node: ts.PropertyDeclaration, sourceFile: ts.SourceFile): PropertyInfo {
    return {
      name: node.name.getText(sourceFile),
      type: node.type?.getText(sourceFile) || 'unknown',
      optional: !!node.questionToken,
      readonly: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false,
    };
  }

  /**
   * Parse method declaration
   */
  private parseMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): MethodInfo {
    let visibility: 'public' | 'private' | 'protected' = 'public';
    
    if (node.modifiers) {
      if (node.modifiers.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)) {
        visibility = 'private';
      } else if (node.modifiers.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword)) {
        visibility = 'protected';
      }
    }

    return {
      name: node.name.getText(sourceFile),
      parameters: node.parameters.map((p) => this.parseParameter(p, sourceFile)),
      returnType: node.type?.getText(sourceFile) || 'void',
      visibility,
      isAsync: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
      isStatic: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) || false,
    };
  }

  /**
   * Parse parameter
   */
  private parseParameter(node: ts.ParameterDeclaration, sourceFile: ts.SourceFile): ParameterInfo {
    return {
      name: node.name.getText(sourceFile),
      type: node.type?.getText(sourceFile) || 'unknown',
      optional: !!node.questionToken || !!node.initializer,
      defaultValue: node.initializer?.getText(sourceFile),
    };
  }

  /**
   * Parse JSDoc comments
   */
  private parseJSDoc(node: ts.Node): JSDocInfo | undefined {
    const jsDocs = ts.getJSDocCommentsAndTags(node);
    
    if (jsDocs.length === 0) {
      return undefined;
    }

    const jsDoc = jsDocs.find(ts.isJSDoc);
    if (!jsDoc) {
      return undefined;
    }

    const description = jsDoc.comment 
      ? (typeof jsDoc.comment === 'string' ? jsDoc.comment : jsDoc.comment.map((c) => c.getText()).join(''))
      : '';

    const params: { name: string; description: string; type?: string }[] = [];
    let returns: { description: string; type?: string } | undefined;
    let example: string | undefined;
    let deprecated = false;
    let since: string | undefined;
    const tags: { name: string; text: string }[] = [];

    if (jsDoc.tags) {
      for (const tag of jsDoc.tags) {
        const tagName = tag.tagName.text;
        const tagText = tag.comment 
          ? (typeof tag.comment === 'string' ? tag.comment : tag.comment.map((c) => c.getText()).join(''))
          : '';

        switch (tagName) {
          case 'param':
            if (ts.isJSDocParameterTag(tag)) {
              params.push({
                name: tag.name.getText(),
                description: tagText,
                type: tag.typeExpression?.getText(),
              });
            }
            break;
          case 'returns':
          case 'return':
            returns = {
              description: tagText,
              type: ts.isJSDocReturnTag(tag) ? tag.typeExpression?.getText() : undefined,
            };
            break;
          case 'example':
            example = tagText;
            break;
          case 'deprecated':
            deprecated = true;
            break;
          case 'since':
            since = tagText;
            break;
          default:
            tags.push({ name: tagName, text: tagText });
        }
      }
    }

    return {
      description,
      params,
      returns,
      example,
      deprecated,
      since,
      tags,
    };
  }

  /**
   * Get JSDoc for a property
   */
  private getPropertyJSDoc(node: ts.Node): string | undefined {
    const jsDocs = ts.getJSDocCommentsAndTags(node);
    const jsDoc = jsDocs.find(ts.isJSDoc);
    
    if (!jsDoc?.comment) {
      return undefined;
    }

    return typeof jsDoc.comment === 'string' 
      ? jsDoc.comment 
      : jsDoc.comment.map((c) => c.getText()).join('');
  }

  /**
   * Check if a node is exported
   */
  private isExported(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) && 
      (ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false);
  }
}

// ============ Utility Functions ============

/**
 * Get all TypeScript files from directories
 */
export function getTypeScriptFiles(dir: string, extensions = ['.ts', '.tsx']): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...getTypeScriptFiles(fullPath, extensions));
    } else if (item.isFile() && extensions.some((ext) => item.name.endsWith(ext))) {
      // Skip test files and stories
      if (!item.name.includes('.test.') && !item.name.includes('.stories.') && !item.name.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Parse files from glob patterns
 */
export function parseFromPatterns(baseDir: string, patterns: string[]): ParsedNode[] {
  const parser = new TypeScriptASTParser();
  const allFiles: string[] = [];

  for (const pattern of patterns) {
    const dir = path.join(baseDir, pattern.replace(/\/\*\*\/\*\.(ts|tsx)$/, '').replace(/\/\*$/, ''));
    
    if (fs.existsSync(dir)) {
      allFiles.push(...getTypeScriptFiles(dir));
    }
  }

  // Remove duplicates
  const uniqueFiles = [...new Set(allFiles)];
  
  return parser.parseFiles(uniqueFiles, baseDir);
}

// ============ Formatting Functions ============

/**
 * Format parsed nodes as markdown documentation
 */
export function formatParsedNodesAsMarkdown(nodes: ParsedNode[]): string {
  const lines: string[] = [];

  // Group by kind
  const interfaces = nodes.filter((n): n is ParsedInterface => n.kind === 'interface');
  const types = nodes.filter((n): n is ParsedTypeAlias => n.kind === 'type');
  const enums = nodes.filter((n): n is ParsedEnum => n.kind === 'enum');
  const functions = nodes.filter((n): n is ParsedFunction => n.kind === 'function');
  const classes = nodes.filter((n): n is ParsedClass => n.kind === 'class');

  // Summary table
  lines.push('| Category | Count | Documented |');
  lines.push('|----------|-------|------------|');
  lines.push(`| Interfaces | ${interfaces.length} | ${interfaces.filter((i) => i.jsdoc).length} |`);
  lines.push(`| Type Aliases | ${types.length} | ${types.filter((t) => t.jsdoc).length} |`);
  lines.push(`| Enums | ${enums.length} | ${enums.filter((e) => e.jsdoc).length} |`);
  lines.push(`| Functions | ${functions.length} | ${functions.filter((f) => f.jsdoc).length} |`);
  lines.push(`| Classes | ${classes.length} | ${classes.filter((c) => c.jsdoc).length} |`);
  lines.push(`| **Total** | **${nodes.length}** | **${nodes.filter((n) => n.jsdoc).length}** |`);

  return lines.join('\n');
}

/**
 * Format detailed interface documentation
 */
export function formatInterfaceDetails(interfaces: ParsedInterface[]): string {
  const lines: string[] = [];

  // Group by file
  const byFile: Record<string, ParsedInterface[]> = {};
  for (const iface of interfaces) {
    if (!byFile[iface.file]) {
      byFile[iface.file] = [];
    }
    byFile[iface.file].push(iface);
  }

  for (const [file, ifaces] of Object.entries(byFile).sort()) {
    lines.push(`\n#### \`${file}\``);
    
    for (const iface of ifaces) {
      const props = iface.properties.length > 0 
        ? ` (${iface.properties.length} properties)` 
        : '';
      const extendsStr = iface.extends.length > 0 
        ? ` extends ${iface.extends.join(', ')}` 
        : '';
      const desc = iface.jsdoc?.description 
        ? ` - ${iface.jsdoc.description.slice(0, 80)}${iface.jsdoc.description.length > 80 ? '...' : ''}` 
        : '';
      
      lines.push(`- 📐 \`${iface.name}\`${extendsStr}${props}${desc}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format JSDoc coverage report
 */
export function formatJSDocCoverage(nodes: ParsedNode[]): string {
  const documented = nodes.filter((n) => n.jsdoc);
  const undocumented = nodes.filter((n) => !n.jsdoc && n.exported);

  const coverage = nodes.length > 0 
    ? ((documented.length / nodes.length) * 100).toFixed(1) 
    : '0';

  const lines: string[] = [
    `**JSDoc Coverage:** ${coverage}% (${documented.length}/${nodes.length})`,
    '',
  ];

  if (undocumented.length > 0 && undocumented.length <= 20) {
    lines.push('**Missing Documentation:**');
    for (const node of undocumented.slice(0, 10)) {
      lines.push(`- \`${node.name}\` (${node.kind}) in ${node.file}`);
    }
    if (undocumented.length > 10) {
      lines.push(`- ... and ${undocumented.length - 10} more`);
    }
  }

  return lines.join('\n');
}

export default TypeScriptASTParser;
