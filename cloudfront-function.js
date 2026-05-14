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
    
    // Force HTTPS
    if (headers['cloudfront-forwarded-proto'] && headers['cloudfront-forwarded-proto'].value === 'http') {
        return redirect('https://' + host + uri);
    }
    
    // Force www subdomain
    if (host === 'anchorwebco.com.au') {
        return redirect('https://www.anchorwebco.com.au' + uri);
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
    redirects = {
        '/admin.html': '/admin/',
        '/blog.html': '/blog/',
        '/blog/welcome-to-our-blog': '/blog/',
        '/blog/welcome-to-our-blog/': '/blog/',
        '/blog/welcome-to-our-blog.html': '/blog/',
        '/blog-brisbane-seo': '/blog/brisbane-business-seo/',
        '/blog-brisbane-seo.html': '/blog/brisbane-business-seo/',
        '/blog-google-my-business': '/blog/google-my-business-optimization/',
        '/blog-google-my-business.html': '/blog/google-my-business-optimization/',
        '/blog-website-speed': '/blog/website-speed-optimization/',
        '/blog-website-speed.html': '/blog/website-speed-optimization/'
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
