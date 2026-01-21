/**
 * Export listing extractor
 * Parses TypeScript files to extract exported functions, classes, and types
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum';
  file: string;
  hasJSDoc: boolean;
  description?: string;
}

/**
 * Extract exports from TypeScript files in a directory
 */
export function listExports(baseDir: string, patterns: string[]): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  for (const pattern of patterns) {
    const dir = path.join(baseDir, pattern.replace('/**/*.ts', '').replace('/**/*.tsx', '').replace('/*', ''));
    
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = getTypeScriptFiles(dir);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileExports = parseExports(content, path.relative(baseDir, file));
      exports.push(...fileExports);
    }
  }

  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...getTypeScriptFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      // Skip test files and stories
      if (!item.name.includes('.test.') && !item.name.includes('.stories.')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function parseExports(content: string, filePath: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const lines = content.split('\n');
  
  // Regex patterns for different export types
  const patterns = [
    { regex: /^export\s+function\s+(\w+)/m, type: 'function' as const },
    { regex: /^export\s+const\s+(\w+)/m, type: 'const' as const },
    { regex: /^export\s+class\s+(\w+)/m, type: 'class' as const },
    { regex: /^export\s+type\s+(\w+)/m, type: 'type' as const },
    { regex: /^export\s+interface\s+(\w+)/m, type: 'interface' as const },
    { regex: /^export\s+enum\s+(\w+)/m, type: 'enum' as const },
    { regex: /^export\s+default\s+function\s+(\w+)/m, type: 'function' as const },
  ];

  let currentJSDoc: string | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track JSDoc comments
    if (line.trim().startsWith('/**')) {
      currentJSDoc = '';
      let j = i;
      while (j < lines.length && !lines[j].includes('*/')) {
        currentJSDoc += lines[j] + '\n';
        j++;
      }
      if (j < lines.length) {
        currentJSDoc += lines[j];
      }
    }
    
    // Check for exports
    for (const { regex, type } of patterns) {
      const match = line.match(regex);
      if (match) {
        const description = currentJSDoc 
          ? extractJSDocDescription(currentJSDoc)
          : undefined;
        
        exports.push({
          name: match[1],
          type,
          file: filePath,
          hasJSDoc: !!currentJSDoc,
          description,
        });
        
        currentJSDoc = null;
        break;
      }
    }
    
    // Reset JSDoc if line is not part of comment or export
    if (!line.trim().startsWith('*') && !line.trim().startsWith('/**') && !line.trim().startsWith('export')) {
      currentJSDoc = null;
    }
  }

  return exports;
}

function extractJSDocDescription(jsdoc: string): string {
  // Remove comment markers and extract first line of description
  const lines = jsdoc
    .replace(/\/\*\*|\*\/|\*/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('@'));
  
  return lines[0] || '';
}

/**
 * Format exports as markdown table
 */
export function formatExportsTable(exports: ExportInfo[]): string {
  if (exports.length === 0) {
    return 'No exports found.';
  }

  const lines = [
    '| Name | Type | File | Documented |',
    '|------|------|------|------------|',
  ];

  for (const exp of exports) {
    lines.push(`| \`${exp.name}\` | ${exp.type} | ${exp.file} | ${exp.hasJSDoc ? '✅' : '❌'} |`);
  }

  return lines.join('\n');
}

/**
 * Format exports as grouped list
 */
export function formatExportsGrouped(exports: ExportInfo[]): string {
  const grouped: Record<string, ExportInfo[]> = {};
  
  for (const exp of exports) {
    if (!grouped[exp.type]) {
      grouped[exp.type] = [];
    }
    grouped[exp.type].push(exp);
  }

  const lines: string[] = [];
  const typeOrder = ['function', 'class', 'interface', 'type', 'const', 'enum'];
  
  for (const type of typeOrder) {
    const items = grouped[type];
    if (items && items.length > 0) {
      lines.push(`\n### ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})`);
      for (const item of items) {
        const desc = item.description ? ` - ${item.description}` : '';
        lines.push(`- \`${item.name}\`${desc}`);
      }
    }
  }

  return lines.join('\n');
}
