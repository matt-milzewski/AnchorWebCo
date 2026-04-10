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
    
    // Handle legacy blog slugs so S3 never receives missing keys
    redirects = {
        '/blog-brisbane-seo': '/blog-brisbane-business-seo',
        '/blog-brisbane-seo.html': '/blog-brisbane-business-seo.html',
        '/blog-google-my-business.html': '/blog-google-my-business-optimization.html',
        '/blog-website-speed.html': '/blog-website-speed-optimization.html'
    };
    if (redirects[uri]) {
        return redirect('https://www.anchorwebco.com.au' + redirects[uri]);
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

    // Keep directory-style routes for the generated blog and admin sections.
    if (uri === '/admin' || uri === '/blog' || uri.indexOf('/blog/') === 0) {
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
