import fs from 'node:fs/promises';
import path from 'node:path';
import { put, list, del } from '@vercel/blob';
import { rootDir } from './paths.js';

const BLOB_PREFIX = 'photos/';
const LOCAL_DIR = path.join(rootDir, 'public', 'uploads');
const CACHE_TTL = 30_000;

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

let cache = null;
let cacheAt = 0;

// blob  → Vercel Blob (production)
// local → public/uploads on disk (running on your machine)
// none  → deployed on Vercel without a Blob store: uploads are impossible
export function storageMode() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return 'blob';
  return process.env.VERCEL ? 'none' : 'local';
}

export function isSupportedType(mimetype) {
  return mimetype in EXTENSIONS;
}

/** Returns { slotId: url } for every slot that has an uploaded photo. */
export async function getPhotos() {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache;
  try {
    const mode = storageMode();
    cache = mode === 'blob' ? await listBlob() : mode === 'local' ? await listLocal() : {};
    cacheAt = Date.now();
  } catch (err) {
    console.error('Could not list photos:', err);
  }
  return cache ?? {};
}

export async function savePhoto(slot, file) {
  const name = `${Date.now()}.${EXTENSIONS[file.mimetype]}`;
  const mode = storageMode();
  let url;

  if (mode === 'blob') {
    const blob = await put(`${BLOB_PREFIX}${slot}/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      addRandomSuffix: true,
    });
    await deleteBlobSlot(slot, blob.url);
    url = blob.url;
  } else if (mode === 'local') {
    const dir = path.join(LOCAL_DIR, slot);
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), file.buffer);
    url = `/uploads/${slot}/${name}`;
  } else {
    throw new Error('فعّل Vercel Blob من لوحة Vercel الأول (Storage → Blob) وبعدين اعمل Redeploy.');
  }

  cache = null;
  return url;
}

export async function removePhoto(slot) {
  const mode = storageMode();
  if (mode === 'blob') await deleteBlobSlot(slot);
  else if (mode === 'local') await fs.rm(path.join(LOCAL_DIR, slot), { recursive: true, force: true });
  cache = null;
}

async function listAllBlobs(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function listBlob() {
  const photos = {};
  const newest = {};
  for (const blob of await listAllBlobs(BLOB_PREFIX)) {
    const slot = blob.pathname.split('/')[1];
    const time = new Date(blob.uploadedAt).getTime();
    if (!newest[slot] || time > newest[slot]) {
      newest[slot] = time;
      photos[slot] = blob.url;
    }
  }
  return photos;
}

async function deleteBlobSlot(slot, keepUrl) {
  const urls = (await listAllBlobs(`${BLOB_PREFIX}${slot}/`))
    .map((blob) => blob.url)
    .filter((url) => url !== keepUrl);
  if (urls.length) await del(urls);
}

async function listLocal() {
  const photos = {};
  let slots;
  try {
    slots = await fs.readdir(LOCAL_DIR, { withFileTypes: true });
  } catch {
    return photos;
  }
  for (const entry of slots) {
    if (!entry.isDirectory()) continue;
    const files = (await fs.readdir(path.join(LOCAL_DIR, entry.name))).sort();
    if (files.length) photos[entry.name] = `/uploads/${entry.name}/${files.at(-1)}`;
  }
  return photos;
}
