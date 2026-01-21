/**
 * Documentation Update Service
 * Handles automated updates to documentation files based on source code changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { docRegistry, DocMapping, DocCategory } from '../../src/config/docRegistry';
import { runExtractor } from '../extractors';
import {
  formatCountResult,
  formatExportsGrouped,
  formatInterfaceSummary,
  formatEdgeFunctionsTable,
} from '../extractors';

interface UpdateResult {
  file: string;
  sectionsUpdated: string[];
  fieldsUpdated: string[];
  changesDetected: boolean;
  timestamp: string;
  error?: string;
}

interface UpdateOptions {
  dryRun?: boolean;
  verbose?: boolean;
  filter?: DocCategory | string;
}

const AUTO_GEN_START = '<!-- AUTO-GENERATED:START';
const AUTO_GEN_END = '<!-- AUTO-GENERATED:END -->';

export class DocumentationUpdateService {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Update all documentation files
   */
  async syncAllDocs(options: UpdateOptions = {}): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];
    const registry = options.filter
      ? docRegistry.filter((d) => d.category === options.filter || d.docFile.includes(options.filter as string))
      : docRegistry;

    for (const docMapping of registry) {
      const result = await this.updateDoc(docMapping, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Update a single documentation file
   */
  async updateDoc(docMapping: DocMapping, options: UpdateOptions = {}): Promise<UpdateResult> {
    const result: UpdateResult = {
      file: docMapping.docFile,
      sectionsUpdated: [],
      fieldsUpdated: [],
      changesDetected: false,
      timestamp: new Date().toISOString(),
    };

    const filePath = path.join(this.baseDir, docMapping.docFile);

    if (!fs.existsSync(filePath)) {
      result.error = `File not found: ${filePath}`;
      return result;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;

      // Update auto-generated sections
      for (const section of docMapping.sections) {
        const sectionMarker = `${AUTO_GEN_START} (${section.header}) -->`;
        
        if (content.includes(sectionMarker)) {
          const extractorResult = runExtractor(
            section.extractor,
            this.baseDir,
            section.subPatterns || docMapping.watchPatterns
          );

          const formattedContent = this.formatExtractorResult(section.extractor, extractorResult);
          content = this.replaceSectionContent(content, section.header, formattedContent);
          result.sectionsUpdated.push(section.header);
        }
      }

      // Update auto-update fields (like "Last Updated")
      for (const field of docMapping.autoUpdateFields) {
        if (field === 'Last Updated') {
          const dateRegex = /(\*\*Last Updated:\*\*|\*Last Updated:\*|Last Updated:)\s*\d{4}-\d{2}-\d{2}/g;
          const today = new Date().toISOString().split('T')[0];
          
          if (dateRegex.test(content)) {
            content = content.replace(dateRegex, `$1 ${today}`);
            result.fieldsUpdated.push(field);
          }
        }
      }

      result.changesDetected = content !== originalContent;

      if (result.changesDetected && !options.dryRun) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }

      if (options.verbose) {
        console.log(`📄 ${docMapping.docFile}: ${result.changesDetected ? 'Updated' : 'No changes'}`);
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Format extractor result based on type
   */
  private formatExtractorResult(extractorType: string, result: unknown): string {
    if (!result) return 'No data available.';

    switch (extractorType) {
      case 'countFiles':
        return formatCountResult(result as { total: number; byExtension: Record<string, number>; byDirectory: Record<string, number> }, 'Total Files');
      case 'countDirectories':
        return `**Total Directories:** ${result}`;
      case 'generateTree':
        return result as string;
      case 'listExports':
        return formatExportsGrouped(result as { name: string; type: string; file: string; hasJSDoc: boolean }[]);
      case 'extractInterfaces':
      case 'extractEnums':
        return formatInterfaceSummary(result as { name: string; kind: string; file: string; properties?: string[]; exported: boolean }[]);
      case 'listEdgeFunctions':
        return formatEdgeFunctionsTable(result as { name: string; path: string; hasIndex: boolean; verifyJwt: boolean | 'unknown'; description?: string; methods?: string[] }[]);
      case 'countTestFiles':
        return formatCountResult(result as { total: number; byExtension: Record<string, number>; byDirectory: Record<string, number> }, 'Test Files');
      default:
        return JSON.stringify(result, null, 2);
    }
  }

  /**
   * Replace content between auto-generated markers
   */
  private replaceSectionContent(content: string, sectionName: string, newContent: string): string {
    const startMarker = `${AUTO_GEN_START} (${sectionName}) -->`;
    const endMarker = AUTO_GEN_END;

    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return content;

    const endIndex = content.indexOf(endMarker, startIndex);
    if (endIndex === -1) return content;

    const before = content.substring(0, startIndex + startMarker.length);
    const after = content.substring(endIndex);

    return `${before}\n${newContent}\n${after}`;
  }

  /**
   * Check if documentation is up to date
   */
  async checkFreshness(): Promise<{ outdated: string[]; upToDate: string[] }> {
    const results = await this.syncAllDocs({ dryRun: true });
    
    return {
      outdated: results.filter((r) => r.changesDetected).map((r) => r.file),
      upToDate: results.filter((r) => !r.changesDetected && !r.error).map((r) => r.file),
    };
  }

  /**
   * Add auto-generated markers to a documentation file
   */
  addMarkers(docFile: string, sections: string[]): void {
    const filePath = path.join(this.baseDir, docFile);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');

    for (const section of sections) {
      const startMarker = `${AUTO_GEN_START} (${section}) -->`;
      
      if (!content.includes(startMarker)) {
        // Find the section header and add markers after it
        const headerRegex = new RegExp(`(##?#?\\s*${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
        const match = content.match(headerRegex);
        
        if (match) {
          const insertPoint = content.indexOf(match[0]) + match[0].length;
          const markerBlock = `\n\n${startMarker}\n<!-- Content will be auto-generated -->\n${AUTO_GEN_END}\n`;
          content = content.slice(0, insertPoint) + markerBlock + content.slice(insertPoint);
        }
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Get summary of documentation status
   */
  getSummary(): { total: number; byCategory: Record<DocCategory, number> } {
    const byCategory: Record<DocCategory, number> = {
      core: 0,
      components: 0,
      state: 0,
      hooks: 0,
      types: 0,
      security: 0,
      backend: 0,
      testing: 0,
      guides: 0,
      utils: 0,
      status: 0,
    };

    for (const doc of docRegistry) {
      byCategory[doc.category]++;
    }

    return {
      total: docRegistry.length,
      byCategory,
    };
  }
}

export default DocumentationUpdateService;
