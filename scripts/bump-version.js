const fs = require('fs');
const path = require('path');

const type = process.argv[2];
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('Usage: node bump-version.js <patch|minor|major>');
  process.exit(1);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);

switch (type) {
  case 'major':
    pkg.version = `${major + 1}.0.0`;
    break;
  case 'minor':
    pkg.version = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    pkg.version = `${major}.${minor}.${patch + 1}`;
    break;
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(pkg.version);
