#!/usr/bin/env node

/**
 * Smoke test script to verify all URLs return proper HTTP status codes
 * Usage: node test-crawl.js
 */

const https = require('https');
const http = require('http');

// List of affected URLs from Google Search Console
const urls = [
  'https://www.anchorwebco.com.au/',
  'https://www.anchorwebco.com.au/about',
  'https://www.anchorwebco.com.au/contact',
  'https://www.anchorwebco.com.au/thank-you',
  'https://www.anchorwebco.com.au/blog',
  'https://www.anchorwebco.com.au/blog-hervey-bay-seo-company',
  'https://www.anchorwebco.com.au/blog-local-seo-hervey-bay',
  'https://www.anchorwebco.com.au/blog-website-design-sunshine-coast',
  'https://www.anchorwebco.com.au/blog-brisbane-business-seo',
  'https://www.anchorwebco.com.au/blog-mobile-first-design',
  'https://www.anchorwebco.com.au/blog-google-my-business-optimization',
  'https://www.anchorwebco.com.au/blog-website-speed-optimization',
  'https://www.anchorwebco.com.au/blog-seo-hervey-bay-fraser-coast',
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