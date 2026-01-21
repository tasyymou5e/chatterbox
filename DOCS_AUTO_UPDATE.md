# Automated Documentation Update System

**Last Updated:** 2026-01-21

## Overview

This project includes an automated documentation management system that keeps knowledge base files synchronized with source code changes. The system uses extractors to analyze source files and update markdown documentation with accurate statistics, file counts, and structural information.

## Quick Start

```bash
# Update all documentation files
npm run docs:update

# Check if documentation is up to date (for CI/CD)
npm run docs:check

# Preview changes without modifying files
npm run docs:update -- --dry-run

# Update only specific category
npm run docs:update -- --filter=hooks

# Show documentation registry summary
npm run docs:update -- --summary
```

## Architecture

```
scripts/
├── update-docs.ts              # CLI entry point
├── extractors/
│   ├── index.ts               # Extractor exports
│   ├── countFiles.ts          # File counting
│   ├── generateTree.ts        # Directory tree generation
│   ├── listExports.ts         # Export parsing
│   ├── extractInterfaces.ts   # TypeScript interface extraction
│   └── listEdgeFunctions.ts   # Edge function listing
└── services/
    ├── index.ts
    └── DocumentationUpdateService.ts  # Core update logic

src/config/
└── docRegistry.ts              # Documentation registry configuration
```

## Documentation Registry

All 32+ documentation files are registered in `src/config/docRegistry.ts`. Each entry specifies:

| Field | Description |
|-------|-------------|
| `docFile` | Path to the markdown file |
| `watchPatterns` | Source file patterns that affect this doc |
| `sections` | Auto-generated sections with extractors |
| `autoUpdateFields` | Fields like "Last Updated" to auto-update |
| `category` | Grouping for CLI filtering |

### Categories

| Category | Description | Example Files |
|----------|-------------|---------------|
| `core` | Project-wide documentation | PROJECT_KNOWLEDGE.md, README.md |
| `components` | UI component docs | COMPONENT_DOCUMENTATION.md |
| `state` | State management | STORES_DOCUMENTATION.md, ZUSTAND_DESIGN.md |
| `hooks` | Custom React hooks | HOOKS_DOCUMENTATION.md |
| `types` | TypeScript types | TYPES_DOCUMENTATION.md |
| `security` | Security policies | SECURITY_FRAMEWORK.md, RLS_*.md |
| `backend` | Edge functions, database | EDGE_FUNCTIONS_GUIDE.md |
| `testing` | Test documentation | TESTING_GUIDE.md |
| `guides` | Feature guides | ADMIN_FEATURES_GUIDE.md |
| `utils` | Utility documentation | UTILS_DOCUMENTATION.md |
| `status` | Project status | CURRENT_ISSUES.md |

## Extractors

### Available Extractors

| Extractor | Output | Used For |
|-----------|--------|----------|
| `countFiles` | File count with breakdown | Hooks, stores, components |
| `countDirectories` | Directory count | Component categories |
| `generateTree` | Markdown tree structure | Architecture docs |
| `listExports` | Exported functions/classes | Utils, hooks docs |
| `extractInterfaces` | TypeScript interfaces/types (regex) | Types documentation |
| `extractInterfacesAST` | TypeScript interfaces (AST parser) | Accurate type extraction |
| `extractEnums` | Enum definitions | Types documentation |
| `listEdgeFunctions` | Edge function table | Backend docs |
| `countTestFiles` | Test file count | Testing docs |
| `parseJSDoc` | JSDoc comments (regex) | API documentation |
| `parseJSDocAST` | JSDoc comments (AST parser) | Accurate JSDoc parsing |
| `jsDocCoverage` | JSDoc coverage report | Documentation metrics |

### TypeScript AST Parser

The `scripts/extractors/astParser.ts` provides accurate TypeScript parsing using the official TypeScript Compiler API:

```typescript
import { TypeScriptASTParser, parseFromPatterns } from './scripts/extractors';

// Parse files and get detailed type information
const parser = new TypeScriptASTParser();
const nodes = parser.parseFile('src/types/auth.ts');

// Or parse from glob patterns
const allNodes = parseFromPatterns(baseDir, ['src/types/**/*.ts']);

// Available node types
interface ParsedInterface {
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

interface JSDocInfo {
  description: string;
  params: { name: string; description: string; type?: string }[];
  returns?: { description: string; type?: string };
  example?: string;
  deprecated?: boolean;
  since?: string;
  tags: { name: string; text: string }[];
}
```

**Supported Constructs:**
- Interfaces (with properties, generics, extends)
- Type aliases (with definitions)
- Enums (including const enums)
- Functions (with parameters, return types)
- Classes (with methods, properties, inheritance)
- Arrow functions (exported const)
- Full JSDoc parsing (@param, @returns, @example, etc.)

### Adding Custom Extractors

1. Create a new file in `scripts/extractors/`:

```typescript
// scripts/extractors/myExtractor.ts
export function myExtractor(baseDir: string, patterns: string[]): MyResult {
  // Implementation
}

export function formatMyResult(result: MyResult): string {
  // Format as markdown
}
```

2. Add to `scripts/extractors/index.ts`:

```typescript
export { myExtractor, formatMyResult } from './myExtractor';
```

3. Add to `runExtractor` switch statement in `index.ts`

4. Use in `docRegistry.ts`:

```typescript
{
  docFile: 'MY_DOC.md',
  sections: [
    { header: 'My Section', extractor: 'myExtractor' }
  ],
  // ...
}
```

## Auto-Generated Sections

To enable auto-generation for a section in a markdown file, add markers:

```markdown
## My Section Title

<!-- AUTO-GENERATED:START (My Section Title) -->
This content will be replaced automatically.
<!-- AUTO-GENERATED:END -->
```

The content between markers will be replaced with extractor output.

### Adding Markers Programmatically

```typescript
import { DocumentationUpdateService } from './scripts/services';

const service = new DocumentationUpdateService();
service.addMarkers('MY_DOC.md', ['Section One', 'Section Two']);
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Documentation Freshness

on:
  pull_request:
    paths:
      - 'src/**'
      - 'supabase/**'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run docs:check
```

### Pre-commit Hook (Husky)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run docs:check
```

## API Reference

### DocumentationUpdateService

```typescript
import { DocumentationUpdateService } from './scripts/services';

const service = new DocumentationUpdateService();

// Update all docs
const results = await service.syncAllDocs({
  dryRun: false,
  verbose: true,
  filter: 'hooks'
});

// Check freshness
const status = await service.checkFreshness();
console.log(`Outdated: ${status.outdated.length}`);

// Get summary
const summary = service.getSummary();
console.log(`Total docs: ${summary.total}`);
```

### UpdateResult Interface

```typescript
interface UpdateResult {
  file: string;           // Documentation file path
  sectionsUpdated: string[];  // Sections that were updated
  fieldsUpdated: string[];    // Fields (like "Last Updated") updated
  changesDetected: boolean;   // Whether any changes were made
  timestamp: string;          // ISO timestamp of update
  error?: string;            // Error message if failed
}
```

## Configuration Options

### CLI Options

| Option | Description |
|--------|-------------|
| `--check` | Check if docs are up to date, exit 1 if outdated |
| `--dry-run` | Preview changes without writing files |
| `--verbose` | Show detailed output for each file |
| `--filter=X` | Only process docs matching category or filename |
| `--summary` | Show documentation registry statistics |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCS_BASE_DIR` | `process.cwd()` | Base directory for file resolution |
| `DOCS_VERBOSE` | `false` | Enable verbose logging |

## Best Practices

1. **Run before commits**: Use pre-commit hooks or CI to ensure docs stay current
2. **Use markers sparingly**: Only add auto-generated sections for truly dynamic content
3. **Keep manual content**: Manual documentation outside markers is preserved
4. **Category filtering**: Use `--filter` for faster updates during development
5. **Dry run first**: Always preview with `--dry-run` before bulk updates

## Troubleshooting

### "File not found" errors

Ensure the documentation file exists. The system won't create new files.

### Markers not being replaced

1. Check marker syntax matches exactly: `<!-- AUTO-GENERATED:START (Section Name) -->`
2. Verify section name in registry matches marker name
3. Run with `--verbose` to see detailed processing

### Extractor returns empty data

1. Check `watchPatterns` in registry configuration
2. Verify source files exist at expected paths
3. Check file extensions match extractor expectations

## Future Enhancements

- [x] TypeScript AST parser for accurate type extraction
- [x] Full JSDoc parsing with @param, @returns, @example support
- [ ] Watch mode for development (`npm run docs:watch`)
- [ ] SQL parser for RLS policy counting
- [ ] Automatic changelog generation
- [ ] Documentation coverage metrics
- [ ] Integration with TypeDoc for API docs
