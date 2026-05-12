# Release Process

## Quick Publish Script

```bash
# 1. Bump versions to match core
node scripts/bump-versions.js

# 2. Prepare packages (add build scripts, files config)
node scripts/prepare-packages.js

# 3. Build all packages
npm run build

# 4. Publish (dry run first)
for pkg in $(find packages -name package.json -exec dirname {} \;); do
  echo "Publishing $pkg..."
  (cd $pkg && npm publish --access public --dry-run)
done

# 5. Publish for real (when ready)
# Remove --dry-run from above command
```

## Manual Publish

```bash
# Build
npm run build

# Publish specific package
cd packages/react
npm publish --access public

# Publish all unpublished packages
npm run publish:unpublished
```

## Packages Status

Run this to check which packages need publishing:
```bash
node -e "
const fs = require('fs');
const packagesDir = './packages';
const categories = fs.readdirSync(packagesDir);
for (const cat of categories) {
  const catPath = require('path').join(packagesDir, cat);
  if (fs.statSync(catPath).isDirectory()) {
    const subdirs = fs.readdirSync(catPath).filter(f => {
      const fullPath = require('path').join(catPath, f);
      return fs.statSync(fullPath).isDirectory() && fs.existsSync(require('path').join(fullPath, 'package.json'));
    });
    for (const sub of subdirs) {
      const pkgPath = require('path').join(catPath, sub, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath));
      console.log(pkg.name, pkg.version);
    }
  }
}
"