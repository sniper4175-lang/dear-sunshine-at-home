Dear Sunshine Supabase Storage migration

This script copies the actual Storage file contents from the old Supabase project
to the Seoul Supabase project while preserving bucket names and paths.

Buckets copied:
- dear-sunshine-audio
- dear-sunshine-lyrics
- dear-sunshine-play-ideas
- dear-sunshine-printables

Important:
- It does NOT delete anything.
- It uses upsert=true on the destination.
- It verifies every uploaded file by downloading it from the destination and
  comparing byte size.
- Keep Service Role keys private. Do not commit them to GitHub.

Run from the dear-sunshine-at-home project root (where @supabase/supabase-js is installed).

Git Bash example:

export SOURCE_SUPABASE_URL="https://OLD_PROJECT.supabase.co"
export SOURCE_SUPABASE_SERVICE_ROLE_KEY="OLD_SERVICE_ROLE_KEY"

export TARGET_SUPABASE_URL="https://NEW_SEOUL_PROJECT.supabase.co"
export TARGET_SUPABASE_SERVICE_ROLE_KEY="NEW_SERVICE_ROLE_KEY"

node migrate-supabase-storage.mjs

PowerShell example:

$env:SOURCE_SUPABASE_URL="https://OLD_PROJECT.supabase.co"
$env:SOURCE_SUPABASE_SERVICE_ROLE_KEY="OLD_SERVICE_ROLE_KEY"

$env:TARGET_SUPABASE_URL="https://NEW_SEOUL_PROJECT.supabase.co"
$env:TARGET_SUPABASE_SERVICE_ROLE_KEY="NEW_SERVICE_ROLE_KEY"

node .\migrate-supabase-storage.mjs

Expected final output:

=== DONE ===
Copied & verified: <number>
Failed: 0

If any files fail, rerun the script after fixing the cause. It is safe to rerun
because destination uploads use upsert=true.
