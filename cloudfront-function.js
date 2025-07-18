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
    
    // Default root object handling
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    }
    
    return request;
}