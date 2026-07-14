const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  const sidebarHTML = await page.evaluate(() => document.querySelector('aside')?.outerHTML);
  console.log(sidebarHTML);
  await browser.close();
})();
