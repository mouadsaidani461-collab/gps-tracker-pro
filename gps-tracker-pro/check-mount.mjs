import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const rootText = await page.locator('#root').innerText();
const hasLogin = await page.getByText('تسجيل الدخول').count();
const title = await page.title();

console.log(JSON.stringify({ title, hasLogin, rootTextLength: rootText.length, rootPreview: rootText.slice(0, 120), errors }, null, 2));

await browser.close();
