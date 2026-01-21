#!/usr/bin/env ts-node
/**
 * Documentation Update CLI
 * Run with: npx ts-node scripts/update-docs.ts [options]
 * 
 * Options:
 *   --check     Check if docs are up to date (exit 1 if outdated)
 *   --dry-run   Show what would be updated without making changes
 *   --verbose   Show detailed output
 *   --filter=X  Only update docs matching category or filename
 *   --summary   Show documentation registry summary
 */

import { DocumentationUpdateService } from './services/DocumentationUpdateService';
import type { DocCategory } from '../src/config/docRegistry';

const args = process.argv.slice(2);
const options = {
  check: args.includes('--check'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  summary: args.includes('--summary'),
  filter: args.find((a) => a.startsWith('--filter='))?.split('=')[1] as DocCategory | undefined,
};

async function main() {
  const service = new DocumentationUpdateService();

  console.log('📚 Documentation Update Tool\n');

  // Show summary if requested
  if (options.summary) {
    const summary = service.getSummary();
    console.log(`Total documentation files: ${summary.total}\n`);
    console.log('By category:');
    for (const [category, count] of Object.entries(summary.byCategory)) {
      if (count > 0) {
        console.log(`  ${category}: ${count}`);
      }
    }
    return;
  }

  // Check freshness mode
  if (options.check) {
    console.log('🔍 Checking documentation freshness...\n');
    const status = await service.checkFreshness();
    
    if (status.outdated.length > 0) {
      console.log('❌ Outdated documentation files:');
      status.outdated.forEach((f) => console.log(`   - ${f}`));
      console.log('\nRun `npm run docs:update` to update these files.');
      process.exit(1);
    } else {
      console.log('✅ All documentation is up to date!');
      console.log(`   ${status.upToDate.length} files checked.`);
      process.exit(0);
    }
  }

  // Update mode
  console.log(options.dryRun ? '🔍 Dry run mode (no files will be modified)\n' : '📝 Updating documentation...\n');

  const results = await service.syncAllDocs({
    dryRun: options.dryRun,
    verbose: options.verbose,
    filter: options.filter,
  });

  // Summary
  const updated = results.filter((r) => r.changesDetected);
  const errors = results.filter((r) => r.error);

  console.log('\n📊 Summary:');
  console.log(`   Total files: ${results.length}`);
  console.log(`   Updated: ${updated.length}`);
  console.log(`   Errors: ${errors.length}`);

  if (updated.length > 0 && !options.dryRun) {
    console.log('\n✅ Updated files:');
    updated.forEach((r) => {
      const sections = r.sectionsUpdated.length > 0 ? ` (sections: ${r.sectionsUpdated.join(', ')})` : '';
      const fields = r.fieldsUpdated.length > 0 ? ` (fields: ${r.fieldsUpdated.join(', ')})` : '';
      console.log(`   - ${r.file}${sections}${fields}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach((r) => console.log(`   - ${r.file}: ${r.error}`));
  }

  if (options.dryRun && updated.length > 0) {
    console.log('\n💡 Run without --dry-run to apply these changes.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
