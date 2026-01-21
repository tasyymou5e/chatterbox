/**
 * Extractors Index
 * Central export for all documentation extractors
 */

export { countFiles, countDirectories, formatCountResult } from './countFiles';
export { generateTree, generateCompactTree } from './generateTree';
export { listExports, formatExportsTable, formatExportsGrouped } from './listExports';
export { extractInterfaces, formatInterfaceList, formatInterfaceSummary } from './extractInterfaces';
export { listEdgeFunctions, formatEdgeFunctionsTable, formatEdgeFunctionsList } from './listEdgeFunctions';

import type { ExtractorType } from '../src/config/docRegistry';
import { countFiles, countDirectories } from './countFiles';
import { generateTree } from './generateTree';
import { listExports } from './listExports';
import { extractInterfaces } from './extractInterfaces';
import { listEdgeFunctions } from './listEdgeFunctions';

/**
 * Run an extractor by type and return the result
 */
export function runExtractor(
  extractorType: ExtractorType,
  baseDir: string,
  patterns: string[]
): unknown {
  switch (extractorType) {
    case 'countFiles':
      return countFiles(baseDir, patterns);
    case 'countDirectories':
      return patterns.map((p) => countDirectories(baseDir, p)).reduce((a, b) => a + b, 0);
    case 'generateTree':
      return generateTree(baseDir, patterns[0] || '.');
    case 'generateTOC':
      // TOC is generated from existing markdown content, handled separately
      return null;
    case 'listExports':
      return listExports(baseDir, patterns);
    case 'extractInterfaces':
      return extractInterfaces(baseDir, patterns);
    case 'extractEnums':
      // Enums are included in extractInterfaces
      return extractInterfaces(baseDir, patterns).filter((d) => d.kind === 'enum');
    case 'parseJSDoc':
      // JSDoc parsing is included in listExports
      return listExports(baseDir, patterns).filter((e) => e.hasJSDoc);
    case 'countRLSPolicies':
      // RLS policies require SQL parsing, return placeholder
      return { count: 0, note: 'RLS policy counting requires SQL parsing' };
    case 'listEdgeFunctions':
      return listEdgeFunctions(baseDir);
    case 'countTestFiles':
      return countFiles(baseDir, ['tests/**/*', 'tests-e2e/**/*'], ['.ts', '.tsx']);
    default:
      throw new Error(`Unknown extractor type: ${extractorType}`);
  }
}
