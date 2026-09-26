# Lovely 💖

هدية على شكل موقع: ظرف بباسورد ← جواب بيتكتب حرف حرف ← صور الذكريات ← رسايل أخيرة. معمول بـ Node و Express و Pug، ومن غير داتابيز.

## التشغيل على جهازك

```bash
npm install
npm run dev
```

- الموقع: http://localhost:3000
- الداشبورد: http://localhost:3000/dashboard

الباسوردات في ملف `.env` (انسخه من `.env.example`).

## بتعدّل إيه وفين

| عاوز تغيّر | فين |
|---|---|
| النصوص، التاريخ، الكابشنز، الرسايل، الأغاني | `config.js` |
| عدد الصور | زوّد أو شيل من `photos` في `config.js` |
| الصور نفسها | من `/dashboard` |
| باسورد الموقع أو الداشبورد | الـ Environment Variables |

الأغاني بتتكتب في `config.js` بالشكل ده، واللينك لازم يكون لينك مباشر للملف:

```js
songs: [{ name: 'اسم الأغنية', url: 'https://.../song.mp3' }]
```

## الرفع على Vercel

1. ارفع المشروع على GitHub واعمله Import من Vercel.
2. من **Settings ← Environment Variables** ضيف:
   - `SITE_PASSWORD`: الباسورد اللي هي هتكتبه
   - `ADMIN_PASSWORD`: باسورد الداشبورد
   - `SESSION_SECRET`: أي كلام عشوائي طويل
3. من **Storage ← Create ← Blob** اعمل Store (اختار **Public**) واربطه بالمشروع. Vercel هيضيف `BLOB_READ_WRITE_TOKEN` لوحده.
4. اعمل **Redeploy**.

> أي تغيير في الـ Environment Variables مش بيشتغل غير بعد Redeploy.
> ولو غيّرت الباسورد، أي حد كان داخل هيتطلب منه يدخل تاني.
# lovely-creamy-love-gift
