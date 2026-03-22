/**
 * CloudFront redirect function for the non-www Anchor Web Co domain.
 *
 * Attach this function to a separate CloudFront distribution for
 * anchorwebco.com.au at the Viewer Request event stage.
 *
 * The non-www distribution should point to the same S3 origin as the
 * primary site. The www distribution does not need this function.
 *
 * Deploy through the AWS Console:
 * CloudFront > Functions > Create, then attach it to the non-www
 * distribution's default behaviour.
 */
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  var uri = request.uri;
  var qs = request.querystring && Object.keys(request.querystring).length > 0
    ? '?' + Object.entries(request.querystring)
        .map(function(e) { return e[0] + '=' + e[1].value; })
        .join('&')
    : '';

  // Redirect non-www and HTTP to canonical HTTPS www
  if (host === 'anchorwebco.com.au') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.anchorwebco.com.au' + uri + qs }
      }
    };
  }

  return request;
}
