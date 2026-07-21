const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Navigate to dashboard
  console.log("Navigating to http://localhost:3000/dashboard");
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/dashboard');
  await page.screenshot({ path: 'dashboard.png' });
  
  // Step 2: Navigate to project
  console.log("Navigating to project page");
  await page.goto('http://localhost:3000/dashboard/project/0e27669d-e9a1-4dd2-b330-b28007781578');
  await page.screenshot({ path: 'project_page_initial.png' });
  
  // Step 3 & 4: Wait for pipeline
  console.log("Waiting for pipeline...");
  await page.waitForTimeout(15000);
  await page.screenshot({ path: 'project_page_final.png' });
  
  const content = await page.content();
  console.log("Checking pipeline status...");

  // Basic check for existence of status indicators
  const isRunning = content.includes('running') || content.includes('Running');
  const isCompleted = content.includes('completed') || content.includes('Completed');
  
  console.log({ isRunning, isCompleted, errors });
  
  await browser.close();
})();
