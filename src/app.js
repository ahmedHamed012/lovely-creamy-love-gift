import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import config from '../config.js';
import { rootDir } from './paths.js';
import { checkPassword, isAuthed, isEnabled, signIn, signOut } from './auth.js';
import { getPhotos, isSupportedType, removePhoto, savePhoto, storageMode } from './storage.js';

const PLACEHOLDERS = { hero: '/img/placeholder-hero.svg', seal: '/img/placeholder-seal.svg' };
const placeholderFor = (slot) => PLACEHOLDERS[slot] || '/img/placeholder.svg';
// Vercel rejects request bodies above 4.5 MB; the dashboard shrinks photos before sending.
const MAX_UPLOAD = 4 * 1024 * 1024;

const SLOTS = [
  { id: 'hero', label: 'الصورة الكبيرة', hint: 'أول ما صفحة الذكريات تفتح' },
  { id: 'seal', label: 'صورة الختم', hint: 'في ختم الظرف والأسطوانة بتاعة الأغاني' },
  ...config.photos.map((photo, i) => ({
    id: `photo-${i + 1}`,
    label: `صورة ${i + 1}`,
    hint: photo.caption ? `"${photo.caption}"` : 'من غير كلام',
  })),
];
const SLOT_IDS = new Set(SLOTS.map((slot) => slot.id));

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'pug');
app.set('views', path.join(rootDir, 'views'));

// On Vercel the public/ folder is served by the CDN; this is for running locally.
app.use(express.static(path.join(rootDir, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD } });

const photoUrl = (photos, slot) => photos[slot] || placeholderFor(slot);

const requireSite = (req, res, next) => (isAuthed(req, 'site') ? next() : res.redirect('/'));
const requireAdmin = (req, res, next) =>
  isAuthed(req, 'admin') ? next() : res.status(401).json({ error: 'سجّل دخول الداشبورد الأول' });

// ---------------------------------------------------------------- site

async function renderLogin(res, error = null) {
  const photos = await getPhotos();
  res.status(error ? 401 : 200).render('login', { config, error, sealUrl: photoUrl(photos, 'seal') });
}

app.get('/', (req, res) => {
  if (isAuthed(req, 'site')) return res.redirect('/index');
  return renderLogin(res);
});

app.post('/login', (req, res) => {
  if (!checkPassword('site', req.body?.password)) return renderLogin(res, 'لا غلط حاولي تاني يا منوري');
  signIn(res, 'site');
  res.redirect('/index');
});

app.get('/index', requireSite, async (req, res) => {
  const photos = await getPhotos();
  res.render('index', {
    config,
    heroUrl: photoUrl(photos, 'hero'),
    sealUrl: photoUrl(photos, 'seal'),
    photos: config.photos.map((photo, i) => ({ ...photo, url: photoUrl(photos, `photo-${i + 1}`) })),
    songs: config.songs.filter((song) => song.url),
  });
});

app.get('/logout', (req, res) => {
  signOut(res, 'site');
  res.redirect('/');
});

// ----------------------------------------------------------- dashboard

app.get('/dashboard', async (req, res) => {
  if (!isEnabled('admin')) return res.render('dashboard-login', { disabled: true });
  if (!isAuthed(req, 'admin')) return res.render('dashboard-login', { error: null });

  const photos = await getPhotos();
  res.render('dashboard', {
    mode: storageMode(),
    slots: SLOTS.map((slot) => ({
      ...slot,
      url: photoUrl(photos, slot.id),
      custom: Boolean(photos[slot.id]),
    })),
  });
});

app.post('/dashboard/login', (req, res) => {
  if (!checkPassword('admin', req.body?.password)) {
    return res.status(401).render('dashboard-login', { error: 'الباسورد غلط' });
  }
  signIn(res, 'admin');
  signIn(res, 'site'); // so "open the site" from the dashboard just works
  res.redirect('/dashboard');
});

app.get('/dashboard/logout', (req, res) => {
  signOut(res, 'admin');
  res.redirect('/dashboard');
});

app.post('/dashboard/photos/:slot', requireAdmin, upload.single('photo'), async (req, res) => {
  const { slot } = req.params;
  if (!SLOT_IDS.has(slot)) return res.status(404).json({ error: 'المكان ده مش موجود' });
  if (!req.file) return res.status(400).json({ error: 'مفيش صورة' });
  if (!isSupportedType(req.file.mimetype)) return res.status(400).json({ error: 'نوع الملف ده مش مدعوم، ابعت JPG أو PNG' });

  const url = await savePhoto(slot, req.file);
  res.json({ url });
});

app.delete('/dashboard/photos/:slot', requireAdmin, async (req, res) => {
  const { slot } = req.params;
  if (!SLOT_IDS.has(slot)) return res.status(404).json({ error: 'المكان ده مش موجود' });
  await removePhoto(slot);
  res.json({ url: placeholderFor(slot) });
});

// --------------------------------------------------------------- errors

app.use((req, res) => res.redirect('/'));

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/dashboard/')) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 500).json({ error: tooBig ? 'الصورة كبيرة أوي (أقصى حاجة 4MB)' : err.message });
  }
  res.status(500).send('حصلت مشكلة، جرّب تاني');
});

export default app;
