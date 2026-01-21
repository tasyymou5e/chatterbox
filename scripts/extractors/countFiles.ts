/**
 * File counting extractor
 * Counts files matching specified patterns
 */

import * as fs from 'fs';
import * as path from 'path';

interface CountResult {
  total: number;
  byExtension: Record<string, number>;
  byDirectory: Record<string, number>;
}

/**
 * Recursively get all files matching patterns in a directory
 */
function getFilesRecursively(dir: string, extensions: string[] = []): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Skip node_modules and hidden directories
      if (item.name !== 'node_modules' && !item.name.startsWith('.')) {
        files.push(...getFilesRecursively(fullPath, extensions));
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.length === 0 || extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Count files in a directory with detailed breakdown
 */
export function countFiles(
  baseDir: string,
  patterns: string[] = ['**/*'],
  extensions: string[] = ['.ts', '.tsx']
): CountResult {
  const result: CountResult = {
    total: 0,
    byExtension: {},
    byDirectory: {},
  };

  // Parse patterns to get directories
  const directories = patterns.map((pattern) => {
    // Extract directory from pattern like 'src/hooks/**/*.ts'
    const parts = pattern.split('/');
    const dirParts: string[] = [];
    for (const part of parts) {
      if (part.includes('*')) break;
      dirParts.push(part);
    }
    return dirParts.join('/') || '.';
  });

  const uniqueDirs = [...new Set(directories)];

  for (const dir of uniqueDirs) {
    const fullDir = path.join(baseDir, dir);
    const files = getFilesRecursively(fullDir, extensions);
    
    for (const file of files) {
      result.total++;
      
      // Count by extension
      const ext = path.extname(file);
      result.byExtension[ext] = (result.byExtension[ext] || 0) + 1;
      
      // Count by immediate parent directory
      const relativePath = path.relative(baseDir, file);
      const parentDir = path.dirname(relativePath).split(path.sep)[1] || path.dirname(relativePath).split(path.sep)[0];
      result.byDirectory[parentDir] = (result.byDirectory[parentDir] || 0) + 1;
    }
  }

  return result;
}

/**
 * Count directories in a path
 */
export function countDirectories(baseDir: string, pattern: string): number {
  const dirPath = path.join(baseDir, pattern.replace('/**/*', '').replace('/*', ''));
  
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  return items.filter((item) => item.isDirectory() && !item.name.startsWith('.')).length;
}

/**
 * Format count result as markdown
 */
export function formatCountResult(result: CountResult, title: string): string {
  const lines: string[] = [
    `**${title}:** ${result.total}`,
    '',
  ];

  if (Object.keys(result.byExtension).length > 1) {
    lines.push('By extension:');
    for (const [ext, count] of Object.entries(result.byExtension).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${ext}: ${count}`);
    }
    lines.push('');
  }

  if (Object.keys(result.byDirectory).length > 1) {
    lines.push('By category:');
    for (const [dir, count] of Object.entries(result.byDirectory).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`- ${dir}: ${count}`);
    }
  }

  return lines.join('\n');
}
