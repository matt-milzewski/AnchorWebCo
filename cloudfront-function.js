/**
 * CloudFront Viewer Request Function
 * Handles HTTP→HTTPS and non-www→www redirects
 * 
 * Deploy this as a CloudFront Function and associate it with the viewer-request event
 */
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var headers = request.headers;
    var host = headers.host.value;
    var redirects;
    var qs = request.querystring && Object.keys(request.querystring).length > 0
        ? '?' + Object.entries(request.querystring)
            .map(function (entry) { return entry[0] + '=' + entry[1].value; })
            .join('&')
        : '';

    function redirect(location) {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: location + qs }
            }
        };
    }
    
    // Collapse the apex host directly to the HTTPS www canonical in one hop.
    if (host === 'anchorwebco.com.au') {
        return redirect('https://www.anchorwebco.com.au' + uri);
    }

    // Force HTTPS for requests already using the canonical host.
    if (headers['cloudfront-forwarded-proto'] && headers['cloudfront-forwarded-proto'].value === 'http') {
        return redirect('https://' + host + uri);
    }
    
    // Collapse duplicate URLs so crawlers index the canonical variants
    if (uri === '/index.html') {
        return redirect('https://www.anchorwebco.com.au/');
    }

    // Canonicalize directory index URLs to trailing-slash routes.
    if (uri !== '/index.html' && uri.endsWith('/index.html')) {
        return redirect('https://www.anchorwebco.com.au' + uri.slice(0, -10) + '/');
    }
    
    // Handle legacy blog URLs so the old HTML articles can be removed safely.
    var legacyBlogTargets = {
        'google-ads-hervey-bay': '/blog/',
        'seo-maryborough-local-search': '/blog/local-seo-brisbane-inner-west/',
        'web-design-maryborough': '/blog/red-hill-business-website/',
        'tradies-websites-more-jobs': '/blog/red-hill-business-website/',
        'seo-hervey-bay-fraser-coast': '/blog/local-seo-brisbane-inner-west/',
        'hervey-bay-seo-company': '/local-seo-brisbane-inner-west.html',
        'local-seo-hervey-bay': '/blog/local-seo-brisbane-inner-west/',
        'website-design-sunshine-coast': '/blog/',
        'brisbane-business-seo': '/blog/local-seo-brisbane-inner-west/',
        'mobile-first-design': '/blog/red-hill-business-website/',
        'google-my-business-optimization': '/blog/local-seo-brisbane-inner-west/',
        'website-speed-optimization': '/health-check.html',
        'website-design-guide': '/blog/red-hill-business-website/'
    };
    if (uri.indexOf('/blog/') === 0 && uri !== '/blog/') {
        var legacyBlogSlug = uri.slice(6);
        if (legacyBlogSlug.endsWith('/')) {
            legacyBlogSlug = legacyBlogSlug.slice(0, -1);
        } else if (legacyBlogSlug.endsWith('.html')) {
            legacyBlogSlug = legacyBlogSlug.slice(0, -5);
        }
        if (legacyBlogTargets[legacyBlogSlug]) {
            return redirect('https://www.anchorwebco.com.au' + legacyBlogTargets[legacyBlogSlug]);
        }
    }

    redirects = {
        '/admin.html': '/admin/',
        '/blog.html': '/blog/',
        '/web-design-hervey-bay': '/web-design-brisbane-inner-west.html',
        '/web-design-hervey-bay.html': '/web-design-brisbane-inner-west.html',
        '/web-design-maryborough': '/web-design-brisbane-inner-west.html',
        '/web-design-maryborough.html': '/web-design-brisbane-inner-west.html',
        '/seo-hervey-bay': '/local-seo-brisbane-inner-west.html',
        '/seo-hervey-bay.html': '/local-seo-brisbane-inner-west.html',
        '/seo-maryborough': '/local-seo-brisbane-inner-west.html',
        '/seo-maryborough.html': '/local-seo-brisbane-inner-west.html',
        '/free-website-audit-hervey-bay': '/health-check.html',
        '/free-website-audit-hervey-bay.html': '/health-check.html',
        '/free-website-audit-brisbane': '/health-check.html',
        '/free-website-audit-brisbane.html': '/health-check.html',
        '/blog/welcome-to-our-blog': '/blog/',
        '/blog/welcome-to-our-blog/': '/blog/',
        '/blog/welcome-to-our-blog.html': '/blog/',
        '/blog-brisbane-seo': '/blog/local-seo-brisbane-inner-west/',
        '/blog-brisbane-seo.html': '/blog/local-seo-brisbane-inner-west/',
        '/blog-google-my-business': '/blog/local-seo-brisbane-inner-west/',
        '/blog-google-my-business.html': '/blog/local-seo-brisbane-inner-west/',
        '/blog-website-speed': '/health-check.html',
        '/blog-website-speed.html': '/health-check.html'
    };
    if (redirects[uri]) {
        return redirect('https://www.anchorwebco.com.au' + redirects[uri]);
    }

    if (uri.indexOf('/blog-') === 0) {
        if (uri.endsWith('.html')) {
            return redirect('https://www.anchorwebco.com.au/blog/' + uri.slice(6, -5) + '/');
        }
        if (!uri.includes('.', 1)) {
            return redirect('https://www.anchorwebco.com.au/blog/' + uri.slice(6) + '/');
        }
    }

    // Do not rewrite API routes. They should pass through to the API origin.
    if (uri.indexOf('/api/') === 0) {
        return request;
    }
    
    // Default root object handling / canonical redirects
    if (uri === '/') {
        request.uri = '/index.html';
        return request;
    }

    // Keep directory-style routes for generated blog and admin pages.
    if (uri === '/admin') {
        return redirect('https://www.anchorwebco.com.au/admin/');
    }
    if (uri === '/admin/') {
        request.uri = '/admin/index.html';
        return request;
    }
    if (uri.indexOf('/admin/') === 0) {
        return request;
    }

    if (uri === '/blog') {
        return redirect('https://www.anchorwebco.com.au/blog/');
    }
    if (uri === '/blog/') {
        request.uri = '/blog/index.html';
        return request;
    }
    if (uri.indexOf('/blog/') === 0) {
        if (uri.includes('.', 1)) {
            return request;
        }
        if (!uri.endsWith('/')) {
            return redirect('https://www.anchorwebco.com.au' + uri + '/');
        }
        request.uri = uri + 'index.html';
        return request;
    }

    if (uri.endsWith('/')) {
        var trimmed = uri.slice(0, -1);
        return redirect('https://www.anchorwebco.com.au' + trimmed + '.html');
    } else if (uri !== '/' && !uri.includes('.')) {
        return redirect('https://www.anchorwebco.com.au' + uri + '.html');
    }
    
    return request;
}
