#!/usr/bin/env node

/**
 * Smoke test script to verify all URLs return proper HTTP status codes
 * Usage: node test-crawl.js
 */

const https = require('https');
const http = require('http');

// Production routes and migration redirects.
const urls = [
  'https://www.anchorwebco.com.au/',
  'https://www.anchorwebco.com.au/about',
  'https://www.anchorwebco.com.au/contact',
  'https://www.anchorwebco.com.au/pricing',
  'https://www.anchorwebco.com.au/work',
  'https://www.anchorwebco.com.au/website-care-plans',
  'https://www.anchorwebco.com.au/blog',
  'https://www.anchorwebco.com.au/blog/local-seo-brisbane-inner-west/',
  'https://www.anchorwebco.com.au/blog/red-hill-business-website/',
  'https://www.anchorwebco.com.au/blog/small-business-website-cost-brisbane/',
  'https://www.anchorwebco.com.au/health-check',
  'https://www.anchorwebco.com.au/free-website-audit-brisbane',
  'https://www.anchorwebco.com.au/web-design-brisbane-inner-west',
  'https://www.anchorwebco.com.au/web-design-brisbane-tradies.html',
  'https://www.anchorwebco.com.au/web-design-cleaners-brisbane.html',
  'https://www.anchorwebco.com.au/web-design-electricians-brisbane.html',
  'https://www.anchorwebco.com.au/web-design-security-companies-brisbane.html',
  'https://www.anchorwebco.com.au/web-design-plumbers-brisbane.html',
  'https://www.anchorwebco.com.au/work/coastwide-exterior-cleaning-website.html',
  'https://www.anchorwebco.com.au/work/bannister-communications-website.html',
  'https://www.anchorwebco.com.au/blog/what-should-cleaning-business-website-include/',
  'https://www.anchorwebco.com.au/blog/showcase-before-after-cleaning-work/',
  'https://www.anchorwebco.com.au/blog/what-should-electrician-website-include/',
  'https://www.anchorwebco.com.au/blog/electrician-better-quote-enquiries/',
  'https://www.anchorwebco.com.au/blog/what-should-plumbing-website-include/',
  'https://www.anchorwebco.com.au/blog/what-should-security-company-website-include/',
  'https://www.anchorwebco.com.au/web-design-red-hill',
  'https://www.anchorwebco.com.au/local-seo-brisbane-inner-west',
  'https://www.anchorwebco.com.au/web-design-brisbane-inner-west.html',
  'https://www.anchorwebco.com.au/web-design-red-hill.html',
  'https://www.anchorwebco.com.au/local-seo-brisbane-inner-west.html',
  'https://www.anchorwebco.com.au/web-design-hervey-bay',
  'https://www.anchorwebco.com.au/web-design-hervey-bay.html',
  'https://www.anchorwebco.com.au/web-design-maryborough',
  'https://www.anchorwebco.com.au/web-design-maryborough.html',
  'https://www.anchorwebco.com.au/seo-hervey-bay',
  'https://www.anchorwebco.com.au/seo-hervey-bay.html',
  'https://www.anchorwebco.com.au/seo-maryborough',
  'https://www.anchorwebco.com.au/seo-maryborough.html',
  'https://www.anchorwebco.com.au/free-website-audit-hervey-bay',
  'https://www.anchorwebco.com.au/free-website-audit-hervey-bay.html',
  'https://www.anchorwebco.com.au/blog/local-seo-hervey-bay/',
  'https://www.anchorwebco.com.au/blog/website-speed-optimization/',
  'https://www.anchorwebco.com.au/blog-brisbane-seo',
  'http://anchorwebco.com.au/', // Test HTTP redirect
  'https://anchorwebco.com.au/', // Test non-www redirect
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        location: res.headers.location,
        success: res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302
      });
    });

    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message,
        success: false
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        success: false
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing URL accessibility...\n');
  
  const results = [];
  let failures = 0;

  for (const url of urls) {
    const result = await checkUrl(url);
    results.push(result);
    
    const statusText = result.status === 'ERROR' ? `ERROR: ${result.error}` : result.status;
    const icon = result.success ? '✅' : '❌';
    
    console.log(`${icon} ${url}`);
    console.log(`   Status: ${statusText}`);
    
    if (result.location) {
      console.log(`   Redirect: ${result.location}`);
    }
    
    if (!result.success) {
      failures++;
    }
    
    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log(`Total URLs tested: ${urls.length}`);
  console.log(`Successful: ${results.length - failures}`);
  console.log(`Failed: ${failures}`);

  if (failures > 0) {
    console.log('\n❌ Some URLs failed. Please check the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ All URLs are accessible!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
