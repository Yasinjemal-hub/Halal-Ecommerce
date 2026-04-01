const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    // Read the HTML file
    const htmlPath = path.resolve('C:\\Users\\yasin\\Desktop\\banking_er_explanation.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    console.log('📄 Loading HTML content...');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const outputPath = 'C:\\Users\\yasin\\Desktop\\Banking_ER_Model_Explanation.pdf';
    
    console.log('📝 Generating PDF...');
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '15mm',
            bottom: '15mm',
            left: '12mm',
            right: '12mm'
        }
    });
    
    console.log(`✅ PDF created successfully: ${outputPath}`);
    await browser.close();
})();
