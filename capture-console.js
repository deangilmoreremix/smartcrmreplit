const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    logs.push({ type, text, timestamp: new Date().toISOString() });
    console.log(`[${type.toUpperCase()}] ${text}`);
  });
  
  page.on('pageerror', error => {
    errors.push({ 
      message: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString() 
    });
    console.error('[PAGE ERROR]', error.message);
    console.error(error.stack);
  });
  
  try {
    console.log('\n=== Loading http://localhost:5173/ ===\n');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a bit for any async errors to appear
    await page.waitForTimeout(3000);
    
    console.log('\n=== Summary ===');
    console.log(`Total console messages: ${logs.length}`);
    console.log(`Total page errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      errors.forEach((err, i) => {
        console.log(`\nError ${i + 1}:`);
        console.log(err.message);
        if (err.stack) console.log(err.stack);
      });
    }
    
    const supabaseWarnings = logs.filter(l => l.text.toLowerCase().includes('supabase'));
    if (supabaseWarnings.length > 0) {
      console.log('\n=== SUPABASE RELATED LOGS ===');
      supabaseWarnings.forEach(w => console.log(`[${w.type}] ${w.text}`));
    }
    
  } catch (error) {
    console.error('Failed to capture logs:', error);
  } finally {
    await browser.close();
  }
})();
