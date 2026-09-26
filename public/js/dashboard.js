'use strict';

// Phone photos are often 5–15 MB; Vercel only accepts ~4.5 MB per request,
// so shrink everything to max 2000px JPEG in the browser before uploading.
const MAX_SIDE = 2000;
const MAX_BYTES = 4 * 1024 * 1024;

async function shrink(file) {
  if (file.type === 'image/gif') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // format the browser can't decode — send as-is and let the server decide
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  return blob && blob.size < file.size ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
}

async function request(method, slot, body) {
  const res = await fetch(`/dashboard/photos/${encodeURIComponent(slot)}`, { method, body });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.reload();
  if (!res.ok) throw new Error(data.error || 'حصلت مشكلة، جرّب تاني');
  return data;
}

function setStatus(card, text, kind = '') {
  const status = card.querySelector('.slot-status');
  status.textContent = text;
  status.className = `slot-status ${kind ? `is-${kind}` : ''}`;
}

function setPhoto(card, url, custom) {
  card.querySelector('.slot-preview img').src = url;
  card.dataset.custom = String(custom);
}

document.querySelectorAll('.slot').forEach((card) => {
  const slot = card.dataset.slot;
  const input = card.querySelector('.slot-input');

  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;

    card.classList.add('is-busy');
    setStatus(card, 'بيترفع…');
    try {
      const photo = await shrink(file);
      if (photo.size > MAX_BYTES) throw new Error('الصورة كبيرة أوي، جرّب صورة تانية');
      const form = new FormData();
      form.append('photo', photo);
      const { url } = await request('POST', slot, form);
      setPhoto(card, url, true);
      setStatus(card, 'اتحفظت ✓', 'ok');
    } catch (err) {
      setStatus(card, err.message, 'error');
    } finally {
      card.classList.remove('is-busy');
    }
  });

  card.querySelector('.slot-reset').addEventListener('click', async () => {
    if (!confirm('ترجّع الصورة الافتراضية مكان دي؟')) return;
    card.classList.add('is-busy');
    try {
      const { url } = await request('DELETE', slot);
      setPhoto(card, url, false);
      setStatus(card, 'رجعت للافتراضي');
    } catch (err) {
      setStatus(card, err.message, 'error');
    } finally {
      card.classList.remove('is-busy');
    }
  });
});
