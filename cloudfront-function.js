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
    
    // Force HTTPS
    if (headers['cloudfront-forwarded-proto'] && headers['cloudfront-forwarded-proto'].value === 'http') {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: 'https://' + host + uri }
            }
        };
    }
    
    // Force www subdomain
    if (host === 'anchorwebco.com.au') {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: 'https://www.anchorwebco.com.au' + uri }
            }
        };
    }
    
    // Handle legacy blog slugs so S3 never receives missing keys
    redirects = {
        '/blog-brisbane-seo': '/blog-brisbane-business-seo',
        '/blog-brisbane-seo.html': '/blog-brisbane-business-seo.html',
        '/blog-google-my-business.html': '/blog-google-my-business-optimization.html',
        '/blog-website-speed.html': '/blog-website-speed-optimization.html'
    };
    if (redirects[uri]) {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: 'https://www.anchorwebco.com.au' + redirects[uri] }
            }
        };
    }
    
    // Default root object handling
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else if (!uri.includes('.')) {
        request.uri = uri + '.html';
    }
    
    return request;
}
