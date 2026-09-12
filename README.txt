Dear Sunshine Library rollback
==============================

This package ONLY restores the two files that were changed by the broken
Library tab patch.

Restored files
--------------
components/LibraryClient.js
app/library/page.js

The script uses the newest automatic backups created before the bad patch:
components/LibraryClient_backup_*.js
app/library/page_backup_*.js

Before restoring, the currently broken files are preserved as:
LibraryClient_broken_*.js
page_broken_*.js

How to use
----------
1. Extract this ZIP.
2. Double-click RESTORE.bat.
3. Drag your Dear Sunshine project root folder into the black window.
   Example:
   C:\Users\Admin\Documents\GitHub\dear-sunshine-at-home
4. Press Enter.
5. In VS Code terminal, run:
   npm run build

If the ZIP files are copied directly into the project root, you can instead run:
node RESTORE_BROKEN_PATCH.js .

Important
---------
This rollback restores the project to the state BEFORE the broken Library patch.
It does not yet re-apply the "show only authorized class tabs" feature.
After the build succeeds, use the restored current files for the next clean patch.
