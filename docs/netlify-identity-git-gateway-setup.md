# Netlify Identity + Git Gateway Setup

This repo is configured so Netlify can be used as the CMS/auth layer while AWS S3 + CloudFront remains the public production host.

## What is already done in the repo

- Decap CMS backend is set to `git-gateway` in `src/admin/config.yml`.
- The admin page loads the Netlify Identity widget in `src/admin/index.html`.
- `netlify.toml` is present so a Netlify project can build this site with:
  - `npm run build`
  - publish directory `_site`
- `cloudfront-function.js` is updated so `/admin/`, `/blog/`, and `/blog/<slug>/` can be routed as directory URLs after the function is redeployed.

## Recommended editor login URL

Use the Netlify project's own URL for CMS access:

- `https://YOUR-NETLIFY-SITE.netlify.app/admin/`

This avoids mixing Netlify Identity auth onto the AWS-served domain.

## Manual setup still required

1. Create a Netlify project from this GitHub repository.
2. Confirm the first Netlify deploy succeeds.
3. Enable Netlify Identity for the Netlify project.
4. Set registration to `Invite only`.
5. Enable Git Gateway for the Netlify project.
6. Add a GitHub access token in Netlify Git Gateway if Netlify asks for one.
7. Invite the client as an Identity user in Netlify.
8. Have the client use the Netlify site's `/admin/` URL to log in and publish.
9. If you want clean `/blog/` and `/admin/` routing on the AWS site too, redeploy the updated `cloudfront-function.js` to your CloudFront viewer-request function.

## Notes

- Netlify's Git Gateway is deprecated, but Netlify documents that it still functions for existing use cases.
- Git Gateway only works with repositories hosted on GitHub.com or GitLab.com.
- The public production website can stay on AWS; GitHub Actions remains the deployment path for the public site.
