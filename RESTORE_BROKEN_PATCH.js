const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error('\nERROR: ' + message);
  process.exit(1);
}

function newestBackup(dir, prefix) {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.js'))
    .map(name => {
      const full = path.join(dir, name);
      return {
        full,
        mtime: fs.statSync(full).mtimeMs
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.length ? files[0].full : null;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function main() {
  let project = process.argv[2];

  if (!project || project === '.') {
    project = process.cwd();
  }

  project = path.resolve(String(project).replace(/^"|"$/g, ''));

  if (!fs.existsSync(path.join(project, 'package.json'))) {
    fail('package.json was not found in the selected project folder.');
  }

  const componentDir = path.join(project, 'components');
  const libraryDir = path.join(project, 'app', 'library');

  const targetClient = path.join(componentDir, 'LibraryClient.js');
  const targetPage = path.join(libraryDir, 'page.js');

  const backupClient = newestBackup(componentDir, 'LibraryClient_backup_');
  const backupPage = newestBackup(libraryDir, 'page_backup_');

  if (!backupClient) {
    fail('No LibraryClient_backup_*.js file was found in components.');
  }

  if (!backupPage) {
    fail('No page_backup_*.js file was found in app/library.');
  }

  const brokenStamp = stamp();

  if (fs.existsSync(targetClient)) {
    fs.copyFileSync(
      targetClient,
      path.join(componentDir, `LibraryClient_broken_${brokenStamp}.js`)
    );
  }

  if (fs.existsSync(targetPage)) {
    fs.copyFileSync(
      targetPage,
      path.join(libraryDir, `page_broken_${brokenStamp}.js`)
    );
  }

  fs.copyFileSync(backupClient, targetClient);
  fs.copyFileSync(backupPage, targetPage);

  console.log('\nRESTORE COMPLETE');
  console.log('LibraryClient restored from:');
  console.log(backupClient);
  console.log('\nLibrary page restored from:');
  console.log(backupPage);
  console.log('\nNext command:');
  console.log('npm run build');
}

main();
