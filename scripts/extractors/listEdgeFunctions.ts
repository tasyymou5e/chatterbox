/**
 * Edge function listing extractor
 * Lists Supabase Edge Functions with their metadata
 */

import * as fs from 'fs';
import * as path from 'path';

interface EdgeFunctionInfo {
  name: string;
  path: string;
  hasIndex: boolean;
  verifyJwt: boolean | 'unknown';
  description?: string;
  methods?: string[];
}

/**
 * List all edge functions in the supabase/functions directory
 */
export function listEdgeFunctions(baseDir: string): EdgeFunctionInfo[] {
  const functionsDir = path.join(baseDir, 'supabase', 'functions');
  const functions: EdgeFunctionInfo[] = [];

  if (!fs.existsSync(functionsDir)) {
    return functions;
  }

  // Read config.toml for JWT settings
  const configPath = path.join(baseDir, 'supabase', 'config.toml');
  const jwtSettings = parseConfigToml(configPath);

  const items = fs.readdirSync(functionsDir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory() && !item.name.startsWith('_')) {
      const indexPath = path.join(functionsDir, item.name, 'index.ts');
      const hasIndex = fs.existsSync(indexPath);
      
      let description: string | undefined;
      let methods: string[] = [];

      if (hasIndex) {
        const content = fs.readFileSync(indexPath, 'utf-8');
        description = extractFunctionDescription(content);
        methods = extractHttpMethods(content);
      }

      functions.push({
        name: item.name,
        path: `supabase/functions/${item.name}`,
        hasIndex,
        verifyJwt: jwtSettings[item.name] ?? 'unknown',
        description,
        methods,
      });
    }
  }

  return functions.sort((a, b) => a.name.localeCompare(b.name));
}

function parseConfigToml(configPath: string): Record<string, boolean> {
  const settings: Record<string, boolean> = {};

  if (!fs.existsSync(configPath)) {
    return settings;
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const lines = content.split('\n');
  
  let currentFunction: string | null = null;

  for (const line of lines) {
    // Match function section header
    const sectionMatch = line.match(/^\[functions\.([^\]]+)\]/);
    if (sectionMatch) {
      currentFunction = sectionMatch[1];
      continue;
    }

    // Match verify_jwt setting
    if (currentFunction) {
      const jwtMatch = line.match(/verify_jwt\s*=\s*(true|false)/);
      if (jwtMatch) {
        settings[currentFunction] = jwtMatch[1] === 'true';
      }
    }
  }

  return settings;
}

function extractFunctionDescription(content: string): string | undefined {
  // Look for JSDoc comment at the top of the file
  const jsdocMatch = content.match(/^\/\*\*\s*\n([^*]*(?:\*(?!\/)[^*]*)*)\*\//);
  if (jsdocMatch) {
    const description = jsdocMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => line && !line.startsWith('@'))
      .join(' ')
      .trim();
    return description || undefined;
  }

  // Look for single-line comment
  const singleLineMatch = content.match(/^\/\/\s*(.+)/m);
  return singleLineMatch ? singleLineMatch[1].trim() : undefined;
}

function extractHttpMethods(content: string): string[] {
  const methods: string[] = [];
  
  if (content.includes("method === 'GET'") || content.includes('method === "GET"')) {
    methods.push('GET');
  }
  if (content.includes("method === 'POST'") || content.includes('method === "POST"')) {
    methods.push('POST');
  }
  if (content.includes("method === 'PUT'") || content.includes('method === "PUT"')) {
    methods.push('PUT');
  }
  if (content.includes("method === 'DELETE'") || content.includes('method === "DELETE"')) {
    methods.push('DELETE');
  }
  if (content.includes("method === 'PATCH'") || content.includes('method === "PATCH"')) {
    methods.push('PATCH');
  }
  if (content.includes("method === 'OPTIONS'") || content.includes('method === "OPTIONS"')) {
    methods.push('OPTIONS');
  }

  // If no specific methods found, assume POST (common for edge functions)
  if (methods.length === 0) {
    methods.push('POST');
  }

  return methods;
}

/**
 * Format edge functions as markdown table
 */
export function formatEdgeFunctionsTable(functions: EdgeFunctionInfo[]): string {
  const lines = [
    '| Function | Auth Required | Methods | Description |',
    '|----------|---------------|---------|-------------|',
  ];

  for (const fn of functions) {
    const auth = fn.verifyJwt === true ? '🔒 Yes' : fn.verifyJwt === false ? '🔓 No' : '❓ Unknown';
    const methods = fn.methods?.join(', ') || 'POST';
    const desc = fn.description || '-';
    lines.push(`| \`${fn.name}\` | ${auth} | ${methods} | ${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''} |`);
  }

  return lines.join('\n');
}

/**
 * Format as simple list
 */
export function formatEdgeFunctionsList(functions: EdgeFunctionInfo[]): string {
  return functions.map((fn) => {
    const auth = fn.verifyJwt === true ? '🔒' : '🔓';
    return `- ${auth} \`${fn.name}\`${fn.description ? ` - ${fn.description}` : ''}`;
  }).join('\n');
}
