/**
 * Documentation Registry Configuration
 * Maps source code patterns to documentation files for automated updates
 */

export interface SectionConfig {
  /** Header text in the markdown file */
  header: string;
  /** Extractor function to use */
  extractor: ExtractorType;
  /** Optional sub-patterns to filter */
  subPatterns?: string[];
}

export type ExtractorType =
  | 'countFiles'
  | 'countDirectories'
  | 'generateTOC'
  | 'listExports'
  | 'extractInterfaces'
  | 'extractInterfacesAST'
  | 'parseJSDoc'
  | 'parseJSDocAST'
  | 'generateTree'
  | 'countRLSPolicies'
  | 'listEdgeFunctions'
  | 'countTestFiles'
  | 'extractEnums'
  | 'jsDocCoverage';

export interface DocMapping {
  /** Documentation file path relative to project root */
  docFile: string;
  /** Source file patterns to watch for changes */
  watchPatterns: string[];
  /** Sections that can be auto-updated */
  sections: SectionConfig[];
  /** Fields in frontmatter or headers to auto-update */
  autoUpdateFields: string[];
  /** Category for grouping in CLI output */
  category: DocCategory;
}

export type DocCategory =
  | 'core'
  | 'components'
  | 'state'
  | 'hooks'
  | 'types'
  | 'security'
  | 'backend'
  | 'testing'
  | 'guides'
  | 'utils'
  | 'status';

/**
 * Complete registry of all documentation files and their source mappings
 */
export const docRegistry: DocMapping[] = [
  // ============ CORE DOCUMENTATION ============
  {
    docFile: 'PROJECT_KNOWLEDGE.md',
    watchPatterns: ['src/**/*', 'supabase/**/*'],
    sections: [
      { header: 'Project Statistics', extractor: 'countFiles' },
      { header: 'Directory Structure', extractor: 'generateTree' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Files'],
    category: 'core',
  },
  {
    docFile: 'README.md',
    watchPatterns: ['src/**/*', 'package.json'],
    sections: [
      { header: 'Quick Start', extractor: 'generateTOC' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'core',
  },
  {
    docFile: 'ARCHITECTURE_DOCUMENTATION.md',
    watchPatterns: ['src/**/*', 'supabase/functions/**/*'],
    sections: [
      { header: 'Directory Structure', extractor: 'generateTree' },
      { header: 'Component Count', extractor: 'countFiles', subPatterns: ['src/components/**/*'] },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'core',
  },

  // ============ COMPONENT DOCUMENTATION ============
  {
    docFile: 'COMPONENT_DOCUMENTATION.md',
    watchPatterns: ['src/components/**/*.tsx'],
    sections: [
      { header: 'Total Components', extractor: 'countFiles' },
      { header: 'Component Categories', extractor: 'countDirectories' },
      { header: 'Component List', extractor: 'generateTree' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Components'],
    category: 'components',
  },
  {
    docFile: 'PAGES_DOCUMENTATION.md',
    watchPatterns: ['src/pages/**/*.tsx'],
    sections: [
      { header: 'Total Pages', extractor: 'countFiles' },
      { header: 'Page Structure', extractor: 'generateTree' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Pages'],
    category: 'components',
  },

  // ============ STATE MANAGEMENT ============
  {
    docFile: 'STORES_DOCUMENTATION.md',
    watchPatterns: ['src/stores/**/*.ts'],
    sections: [
      { header: 'Total Stores', extractor: 'countFiles' },
      { header: 'Store Interfaces', extractor: 'extractInterfaces' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Stores'],
    category: 'state',
  },
  {
    docFile: 'ZUSTAND_DESIGN.md',
    watchPatterns: ['src/stores/**/*.ts'],
    sections: [
      { header: 'Store Count', extractor: 'countFiles' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'state',
  },

  // ============ HOOKS DOCUMENTATION ============
  {
    docFile: 'HOOKS_DOCUMENTATION.md',
    watchPatterns: ['src/hooks/**/*.ts', 'src/hooks/**/*.tsx'],
    sections: [
      { header: 'Total Hooks', extractor: 'countFiles' },
      { header: 'Hook List', extractor: 'listExports' },
      { header: 'Hook Categories', extractor: 'countDirectories' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Hooks'],
    category: 'hooks',
  },

  // ============ TYPES DOCUMENTATION ============
  {
    docFile: 'TYPES_DOCUMENTATION.md',
    watchPatterns: ['src/types/**/*.ts'],
    sections: [
      { header: 'Total Type Files', extractor: 'countFiles' },
      { header: 'Interface List', extractor: 'extractInterfaces' },
      { header: 'Enum List', extractor: 'extractEnums' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Types'],
    category: 'types',
  },
  {
    docFile: 'TYPESCRIPT_STRICTNESS.md',
    watchPatterns: ['src/**/*.ts', 'src/**/*.tsx', 'tsconfig.json'],
    sections: [
      { header: 'Type Coverage', extractor: 'countFiles' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'types',
  },

  // ============ SECURITY DOCUMENTATION ============
  {
    docFile: 'SECURITY_FRAMEWORK.md',
    watchPatterns: ['src/utils/**/secure*.ts', 'supabase/functions/**/*'],
    sections: [
      { header: 'Security Functions', extractor: 'countFiles' },
    ],
    autoUpdateFields: ['Last Updated', 'Last Security Review'],
    category: 'security',
  },
  {
    docFile: 'PROJECT_SECURITY_REVIEW.md',
    watchPatterns: ['src/**/*', 'supabase/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated', 'Review Date'],
    category: 'security',
  },
  {
    docFile: 'API_SECURITY_REVIEW.md',
    watchPatterns: ['supabase/functions/**/*'],
    sections: [
      { header: 'Edge Function Count', extractor: 'listEdgeFunctions' },
    ],
    autoUpdateFields: ['Last Updated', 'Review Date'],
    category: 'security',
  },
  {
    docFile: 'RLS_POLICIES_DOCUMENTATION.md',
    watchPatterns: ['supabase/migrations/**/*.sql'],
    sections: [
      { header: 'Policy Count', extractor: 'countRLSPolicies' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'security',
  },
  {
    docFile: 'RLS_POLICIES_COMPREHENSIVE_GUIDE.md',
    watchPatterns: ['supabase/migrations/**/*.sql'],
    sections: [
      { header: 'Policy Count', extractor: 'countRLSPolicies' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'security',
  },
  {
    docFile: 'RLS_SECURITY_KNOWLEDGE.md',
    watchPatterns: ['supabase/migrations/**/*.sql'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'security',
  },
  {
    docFile: 'RLS_TEST_SUITE_DOCUMENTATION.md',
    watchPatterns: ['tests/rls/**/*.ts'],
    sections: [
      { header: 'Test File Count', extractor: 'countTestFiles' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'security',
  },

  // ============ BACKEND DOCUMENTATION ============
  {
    docFile: 'EDGE_FUNCTIONS_GUIDE.md',
    watchPatterns: ['supabase/functions/**/*'],
    sections: [
      { header: 'Function Count', extractor: 'listEdgeFunctions' },
      { header: 'Function List', extractor: 'generateTree' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Functions'],
    category: 'backend',
  },
  {
    docFile: 'SUPABASE_SCHEMA.md',
    watchPatterns: ['supabase/migrations/**/*.sql', 'src/integrations/supabase/types.ts'],
    sections: [],
    autoUpdateFields: ['Last Updated', 'Last Schema Update'],
    category: 'backend',
  },
  {
    docFile: 'API_DOCUMENTATION.md',
    watchPatterns: ['supabase/functions/**/*'],
    sections: [
      { header: 'Endpoint Count', extractor: 'listEdgeFunctions' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'backend',
  },

  // ============ TESTING DOCUMENTATION ============
  {
    docFile: 'TESTING_GUIDE.md',
    watchPatterns: ['tests/**/*', 'tests-e2e/**/*', 'vitest.config.ts', 'playwright.config.ts'],
    sections: [
      { header: 'Test File Count', extractor: 'countTestFiles' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'testing',
  },
  {
    docFile: 'TEST_PLAN_PARENT_CHILD_ACCOUNTS.md',
    watchPatterns: ['tests/workflows/**/*', 'supabase/functions/create-child-account/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'testing',
  },

  // ============ FEATURE GUIDES ============
  {
    docFile: 'ADMIN_FEATURES_GUIDE.md',
    watchPatterns: ['src/pages/admin/**/*', 'src/components/admin/**/*'],
    sections: [
      { header: 'Admin Component Count', extractor: 'countFiles' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },
  {
    docFile: 'AUTHENTICATION_GUIDE.md',
    watchPatterns: ['src/components/auth/**/*', 'src/hooks/useAuth*.ts'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },
  {
    docFile: 'KIDS_PORTAL_DOCUMENTATION.md',
    watchPatterns: ['src/pages/kids/**/*', 'src/components/kids/**/*'],
    sections: [
      { header: 'Kids Component Count', extractor: 'countFiles' },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },
  {
    docFile: 'WORKFLOWS_DOCUMENTATION.md',
    watchPatterns: ['src/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },
  {
    docFile: 'SITE_FLOW.md',
    watchPatterns: ['src/pages/**/*', 'src/routes/**/*'],
    sections: [
      { header: 'Page Count', extractor: 'countFiles', subPatterns: ['src/pages/**/*.tsx'] },
    ],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },
  {
    docFile: 'ADMIN_ROUTING_STRUCTURE.md',
    watchPatterns: ['src/pages/admin/**/*', 'src/routes/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },
  {
    docFile: 'PARENT_CHILD_AUTH_KNOWLEDGE.md',
    watchPatterns: ['src/hooks/useAuth*.ts', 'supabase/functions/create-child-account/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'guides',
  },

  // ============ UTILS DOCUMENTATION ============
  {
    docFile: 'UTILS_DOCUMENTATION.md',
    watchPatterns: ['src/utils/**/*.ts'],
    sections: [
      { header: 'Utility Count', extractor: 'countFiles' },
      { header: 'Utility Functions', extractor: 'listExports' },
    ],
    autoUpdateFields: ['Last Updated', 'Total Utilities'],
    category: 'utils',
  },
  {
    docFile: 'JSDOC_STANDARDS.md',
    watchPatterns: ['src/**/*.ts', 'src/**/*.tsx'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'utils',
  },

  // ============ STATUS DOCUMENTATION ============
  {
    docFile: 'CURRENT_ISSUES.md',
    watchPatterns: ['src/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'IMPLEMENTATION_STATUS.md',
    watchPatterns: ['src/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'IMPLEMENTATION_SUMMARY.md',
    watchPatterns: ['src/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'MIGRATION_COMPLETE.md',
    watchPatterns: ['src/stores/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'BUNDLE_OPTIMIZATION.md',
    watchPatterns: ['src/**/*', 'vite.config.ts'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'ERROR_RECOVERY_PATTERNS.md',
    watchPatterns: ['src/utils/errorHandling.ts', 'src/components/ErrorBoundary.tsx'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'CONTENT_INTEGRATION_FRAMEWORK.md',
    watchPatterns: ['src/services/UnifiedContentService.ts', 'src/components/games/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'DEV_DEPENDENCIES_CLEANUP.md',
    watchPatterns: ['package.json'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'STORYBOOK_GUIDE.md',
    watchPatterns: ['.storybook/**/*', 'src/components/**/*.stories.tsx'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
  {
    docFile: 'TROUBLESHOOTING_GUIDE.md',
    watchPatterns: ['src/**/*'],
    sections: [],
    autoUpdateFields: ['Last Updated'],
    category: 'status',
  },
];

/**
 * Get documentation files by category
 */
export function getDocsByCategory(category: DocCategory): DocMapping[] {
  return docRegistry.filter((doc) => doc.category === category);
}

/**
 * Find documentation files affected by a source file change
 */
export function findAffectedDocs(changedFile: string): DocMapping[] {
  return docRegistry.filter((doc) =>
    doc.watchPatterns.some((pattern) => {
      // Simple glob matching for common patterns
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\//g, '\\/');
      return new RegExp(`^${regexPattern}$`).test(changedFile);
    })
  );
}

/**
 * Get all unique watch patterns across all docs
 */
export function getAllWatchPatterns(): string[] {
  const patterns = new Set<string>();
  docRegistry.forEach((doc) => {
    doc.watchPatterns.forEach((pattern) => patterns.add(pattern));
  });
  return Array.from(patterns);
}
