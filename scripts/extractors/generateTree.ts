/**
 * Directory tree generator extractor
 * Generates markdown-formatted directory trees
 */

import * as fs from 'fs';
import * as path from 'path';

interface TreeOptions {
  maxDepth?: number;
  showFiles?: boolean;
  extensions?: string[];
  excludeDirs?: string[];
}

const defaultOptions: TreeOptions = {
  maxDepth: 4,
  showFiles: true,
  extensions: ['.ts', '.tsx', '.md'],
  excludeDirs: ['node_modules', '.git', 'dist', 'coverage', '.next'],
};

/**
 * Generate a directory tree structure
 */
export function generateTree(
  baseDir: string,
  pattern: string,
  options: TreeOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const startDir = path.join(baseDir, pattern.replace('/**/*', '').replace('/*', ''));
  
  if (!fs.existsSync(startDir)) {
    return `Directory not found: ${startDir}`;
  }

  const lines: string[] = [];
  buildTree(startDir, '', 0, opts, lines, baseDir);
  
  return '```\n' + lines.join('\n') + '\n```';
}

function buildTree(
  dir: string,
  prefix: string,
  depth: number,
  options: TreeOptions,
  lines: string[],
  baseDir: string
): void {
  if (depth > (options.maxDepth || 4)) {
    return;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true })
    .filter((item) => {
      // Exclude hidden files and specified directories
      if (item.name.startsWith('.')) return false;
      if (item.isDirectory() && options.excludeDirs?.includes(item.name)) return false;
      
      // Filter files by extension if showFiles is true
      if (item.isFile() && options.showFiles) {
        const ext = path.extname(item.name);
        return options.extensions?.includes(ext) ?? true;
      }
      
      return item.isDirectory();
    })
    .sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const relativePath = path.relative(baseDir, path.join(dir, item.name));
    
    if (item.isDirectory()) {
      lines.push(`${prefix}${connector}${item.name}/`);
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      buildTree(path.join(dir, item.name), newPrefix, depth + 1, options, lines, baseDir);
    } else if (options.showFiles) {
      lines.push(`${prefix}${connector}${item.name}`);
    }
  });
}

/**
 * Generate a compact directory summary
 */
export function generateCompactTree(
  baseDir: string,
  pattern: string,
  maxItems: number = 20
): string {
  const startDir = path.join(baseDir, pattern.replace('/**/*', '').replace('/*', ''));
  
  if (!fs.existsSync(startDir)) {
    return `Directory not found: ${startDir}`;
  }

  const items = fs.readdirSync(startDir, { withFileTypes: true })
    .filter((item) => !item.name.startsWith('.') && item.name !== 'node_modules')
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const lines = items.slice(0, maxItems).map((item) => {
    const icon = item.isDirectory() ? '📁' : '📄';
    return `- ${icon} ${item.name}${item.isDirectory() ? '/' : ''}`;
  });

  if (items.length > maxItems) {
    lines.push(`- ... and ${items.length - maxItems} more`);
  }

  return lines.join('\n');
}
