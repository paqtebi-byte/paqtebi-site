const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport large enough
  await page.setViewport({ width: 1280, height: 1024 });

  console.log("Navigating to http://localhost:4173 ...");
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  // Wait a moment for transitions/fetching
  await new Promise(r => setTimeout(r, 2000));

  console.log("Taking screenshot...");
  const screenshotPath = path.join('C:\\Users\\D_A_T_A\\.gemini\\antigravity\\brain\\af7aeb95-01e7-4112-ae27-8fc36150be94\\artifacts', 'currency_widget_live.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log("Saved screenshot to: " + screenshotPath);

  await browser.close();
})();
