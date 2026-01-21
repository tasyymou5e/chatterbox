/**
 * Interface and Type extractor
 * Parses TypeScript files to extract interface and type definitions
 */

import * as fs from 'fs';
import * as path from 'path';

interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum';
  file: string;
  properties?: string[];
  description?: string;
  exported: boolean;
}

/**
 * Extract interface and type definitions from TypeScript files
 */
export function extractInterfaces(baseDir: string, patterns: string[]): TypeDefinition[] {
  const definitions: TypeDefinition[] = [];
  
  for (const pattern of patterns) {
    const dir = path.join(baseDir, pattern.replace('/**/*.ts', '').replace('/*', ''));
    
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = getTypeScriptFiles(dir);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileDefs = parseTypeDefinitions(content, path.relative(baseDir, file));
      definitions.push(...fileDefs);
    }
  }

  return definitions.sort((a, b) => a.name.localeCompare(b.name));
}

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...getTypeScriptFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.includes('.test.')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function parseTypeDefinitions(content: string, filePath: string): TypeDefinition[] {
  const definitions: TypeDefinition[] = [];
  
  // Match interfaces
  const interfaceRegex = /(export\s+)?interface\s+(\w+)(?:<[^>]+>)?\s*(?:extends\s+[^{]+)?\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;
  
  while ((match = interfaceRegex.exec(content)) !== null) {
    const exported = !!match[1];
    const name = match[2];
    const body = match[3];
    
    // Extract property names
    const properties = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//') && !line.startsWith('/*'))
      .map((line) => {
        const propMatch = line.match(/^(\w+)\??:/);
        return propMatch ? propMatch[1] : null;
      })
      .filter((prop): prop is string => prop !== null);

    definitions.push({
      name,
      kind: 'interface',
      file: filePath,
      properties,
      exported,
    });
  }

  // Match type aliases
  const typeRegex = /(export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=/g;
  
  while ((match = typeRegex.exec(content)) !== null) {
    const exported = !!match[1];
    const name = match[2];

    definitions.push({
      name,
      kind: 'type',
      file: filePath,
      exported,
    });
  }

  // Match enums
  const enumRegex = /(export\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g;
  
  while ((match = enumRegex.exec(content)) !== null) {
    const exported = !!match[1];
    const name = match[2];
    const body = match[3];
    
    const properties = body
      .split(',')
      .map((line) => line.trim().split('=')[0].trim())
      .filter((prop) => prop);

    definitions.push({
      name,
      kind: 'enum',
      file: filePath,
      properties,
      exported,
    });
  }

  return definitions;
}

/**
 * Format type definitions as markdown
 */
export function formatInterfaceList(definitions: TypeDefinition[]): string {
  const lines: string[] = [];
  
  // Group by file
  const byFile: Record<string, TypeDefinition[]> = {};
  for (const def of definitions) {
    if (!byFile[def.file]) {
      byFile[def.file] = [];
    }
    byFile[def.file].push(def);
  }

  for (const [file, defs] of Object.entries(byFile).sort()) {
    lines.push(`\n#### ${file}`);
    
    for (const def of defs) {
      const icon = def.kind === 'interface' ? '📐' : def.kind === 'enum' ? '🔢' : '📝';
      const propCount = def.properties ? ` (${def.properties.length} properties)` : '';
      lines.push(`- ${icon} \`${def.name}\`${propCount}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format as summary table
 */
export function formatInterfaceSummary(definitions: TypeDefinition[]): string {
  const counts = {
    interface: definitions.filter((d) => d.kind === 'interface').length,
    type: definitions.filter((d) => d.kind === 'type').length,
    enum: definitions.filter((d) => d.kind === 'enum').length,
  };

  return [
    `| Category | Count |`,
    `|----------|-------|`,
    `| Interfaces | ${counts.interface} |`,
    `| Type Aliases | ${counts.type} |`,
    `| Enums | ${counts.enum} |`,
    `| **Total** | **${definitions.length}** |`,
  ].join('\n');
}
