#!/bin/bash

# Security & Performance Pre-commit Hook
# Run this before commits to ensure code quality

set -e  # Exit on any error

echo "🔒 Running security and performance checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

echo ""
echo "📦 Checking dependencies..."

# Check for security vulnerabilities with npm audit
echo "Running npm audit..."
npm audit --audit-level=moderate > /dev/null 2>&1
print_status $? "No security vulnerabilities found"

# Check for outdated dependencies
echo "Checking for outdated packages..."
OUTDATED=$(npm outdated --depth=0 2>/dev/null | wc -l)
if [ "$OUTDATED" -eq 0 ]; then
    print_status 0 "All dependencies up to date"
else
    print_warning "$OUTDATED packages are outdated - consider updating"
fi

echo ""
echo "🏗️  Building and analyzing..."

# Check if TypeScript compilation succeeds
echo "TypeScript type checking..."
npm run typecheck > /dev/null 2>&1
print_status $? "TypeScript compilation successful"

# Run linting
echo "Running linter..."
npm run lint > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status 0 "No linting errors"
else
    print_warning "Linting issues found - run 'npm run lint:fix' to fix"
fi

echo ""
echo "📊 Performance analysis..."

# Build the project
echo "Building project..."
npm run build > /dev/null 2>&1
print_status $? "Build successful"

# Check bundle size (basic check)
if [ -f "dist/index.html" ]; then
    BUNDLE_SIZE=$(du -k dist | cut -f1)
    print_info "Bundle size: ${BUNDLE_SIZE}KB"
    
    if [ "$BUNDLE_SIZE" -gt 1000 ]; then
        print_warning "Bundle size is over 1MB - consider optimization"
    fi
fi

echo ""
echo "🔍 Snyk security scan (if authenticated)..."

# Try to run Snyk if authenticated
if command -v snyk >/dev/null 2>&1; then
    if npx snyk test --severity-threshold=medium > /dev/null 2>&1; then
        print_status 0 "Snyk scan passed"
    else
        # Check if it's an auth error
        if npx snyk test 2>&1 | grep -q "Authentication error"; then
            print_info "Snyk not authenticated - run 'npx snyk auth' to enable"
        else
            print_warning "Snyk found vulnerabilities - run 'npm run security:snyk' for details"
        fi
    fi
else
    print_warning "Snyk not available - install with 'npm install snyk'"
fi

echo ""
echo "🎯 Security checklist checks..."

# Check for common security patterns
SECURITY_ISSUES=0

# Check for hardcoded secrets (basic check)
if grep -r "password\|secret\|key\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "passwordGeneration\|validatePassword\|PasswordStrength" >/dev/null 2>&1; then
    print_warning "Potential hardcoded secrets found - review manually"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check for console.log statements
CONSOLE_LOGS=$(grep -r "console\.log\|console\.debug" src/ --include="*.ts" --include="*.tsx" | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    print_warning "$CONSOLE_LOGS console.log statements found - remove before production"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

if [ "$SECURITY_ISSUES" -eq 0 ]; then
    print_status 0 "No obvious security issues detected"
fi

echo ""
echo "📈 Summary"
echo "=================="

if [ "$OUTDATED" -gt 0 ]; then
    print_warning "Consider updating $OUTDATED outdated packages"
fi

if [ "$BUNDLE_SIZE" -gt 1000 ]; then
    print_warning "Consider bundle optimization - current: ${BUNDLE_SIZE}KB"
fi

echo ""
print_status 0 "Pre-commit security checks completed! 🎉"
echo ""
print_info "To analyze bundle size: npm run bundle:analyze"
print_info "To run full security audit: npm run security:audit"
print_info "To setup Snyk monitoring: npx snyk auth && npm run security:snyk:monitor"