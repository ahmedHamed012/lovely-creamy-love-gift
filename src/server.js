import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`💖 الموقع:    http://localhost:${port}`);
  console.log(`📸 الداشبورد: http://localhost:${port}/dashboard`);
});
