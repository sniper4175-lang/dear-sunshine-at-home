import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.TARGET_SUPABASE_URL;
const TARGET_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

const BUCKETS = [
  'dear-sunshine-audio',
  'dear-sunshine-lyrics',
  'dear-sunshine-play-ideas',
  'dear-sunshine-printables',
];

const PAGE_SIZE = 100;
const VERIFY_AFTER_UPLOAD = true;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

requireEnv('SOURCE_SUPABASE_URL', SOURCE_URL);
requireEnv('SOURCE_SUPABASE_SERVICE_ROLE_KEY', SOURCE_KEY);
requireEnv('TARGET_SUPABASE_URL', TARGET_URL);
requireEnv('TARGET_SUPABASE_SERVICE_ROLE_KEY', TARGET_KEY);

if (SOURCE_URL === TARGET_URL) {
  throw new Error('SOURCE_SUPABASE_URL and TARGET_SUPABASE_URL are the same. Aborting.');
}

const source = createClient(SOURCE_URL, SOURCE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const target = createClient(TARGET_URL, TARGET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function joinPath(prefix, name) {
  return prefix ? `${prefix}/${name}` : name;
}

async function listAllEntries(client, bucket, prefix = '') {
  const entries = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      throw new Error(
        `[${bucket}] Failed to list "${prefix || '/'}": ${error.message}`
      );
    }

    const page = data || [];
    entries.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return entries;
}

async function collectFiles(client, bucket, prefix = '') {
  const entries = await listAllEntries(client, bucket, prefix);
  const files = [];

  for (const entry of entries) {
    const path = joinPath(prefix, entry.name);

    // Supabase folders usually have id === null.
    if (entry.id == null) {
      files.push(...(await collectFiles(client, bucket, path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

async function downloadSourceFile(bucket, path) {
  const { data, error } = await source.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(
      `[${bucket}] Source download failed: ${path} :: ${error?.message || 'No data'}`
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const contentType =
    data.type ||
    (path.toLowerCase().endsWith('.mp3')
      ? 'audio/mpeg'
      : path.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : path.toLowerCase().endsWith('.png')
      ? 'image/png'
      : path.toLowerCase().endsWith('.jpg') ||
        path.toLowerCase().endsWith('.jpeg')
      ? 'image/jpeg'
      : 'application/octet-stream');

  return {
    bytes: Buffer.from(arrayBuffer),
    contentType,
    size: arrayBuffer.byteLength,
  };
}

async function uploadTargetFile(bucket, path, file) {
  const { error } = await target.storage.from(bucket).upload(path, file.bytes, {
    upsert: true,
    contentType: file.contentType,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(
      `[${bucket}] Target upload failed: ${path} :: ${error.message}`
    );
  }
}

async function verifyTargetFile(bucket, path, expectedSize) {
  const { data, error } = await target.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(
      `[${bucket}] Verification download failed: ${path} :: ${error?.message || 'No data'}`
    );
  }

  const actualSize = (await data.arrayBuffer()).byteLength;

  if (actualSize !== expectedSize) {
    throw new Error(
      `[${bucket}] Verification size mismatch: ${path} :: source=${expectedSize}, target=${actualSize}`
    );
  }
}

async function migrateBucket(bucket) {
  console.log(`\n=== ${bucket} ===`);

  const files = await collectFiles(source, bucket);

  if (files.length === 0) {
    console.log('No source files found.');
    return { copied: 0, failed: 0 };
  }

  console.log(`Found ${files.length} source file(s).`);

  let copied = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += 1) {
    const path = files[i];
    const label = `[${i + 1}/${files.length}] ${path}`;

    try {
      process.stdout.write(`Copying ${label} ... `);

      const file = await downloadSourceFile(bucket, path);
      await uploadTargetFile(bucket, path, file);

      if (VERIFY_AFTER_UPLOAD) {
        await verifyTargetFile(bucket, path, file.size);
      }

      copied += 1;
      console.log('OK');
    } catch (error) {
      failed += 1;
      console.log('FAILED');
      console.error(error instanceof Error ? error.message : error);
    }
  }

  return { copied, failed };
}

async function main() {
  console.log('Dear Sunshine Supabase Storage migration');
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Target: ${TARGET_URL}`);
  console.log('Mode: copy only, upsert enabled, no deletes');
  console.log(`Buckets: ${BUCKETS.join(', ')}`);

  let totalCopied = 0;
  let totalFailed = 0;

  for (const bucket of BUCKETS) {
    const result = await migrateBucket(bucket);
    totalCopied += result.copied;
    totalFailed += result.failed;
  }

  console.log('\n=== DONE ===');
  console.log(`Copied & verified: ${totalCopied}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nMigration aborted.');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
