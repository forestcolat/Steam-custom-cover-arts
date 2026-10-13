# Switch Template Studio — Cloudflare edition

A fixed SVG editor and Steam importer deployed together on Cloudflare Workers.
There is no Python server to install or run for everyday use.

## One-time deployment — browser only, nothing to install

You need GitHub and Cloudflare accounts. You do NOT need Node.js, Python,
a terminal, Git, or any other software installed on your computer.
Cloudflare installs build dependencies on its own infrastructure.

1. Extract this ZIP using your device's built-in file extraction feature.
2. On GitHub, create an empty repository called switch-template-studio.
3. In that repository, choose Add file -> Upload files. Upload the extracted
   package contents, keeping public and src as folders. Do NOT upload the ZIP
   itself. package.json and wrangler.jsonc must be at the repository root.
   Commit the uploaded files using GitHub's browser interface.
4. In the Cloudflare dashboard, go to Workers & Pages -> Create application ->
   Import a repository. Connect your GitHub account and select the repository.
   Choose a Worker project, not a static-only Pages deployment.
5. Set project name to switch-template-studio (matching the configuration).
   Root directory: repository root.
   Build command: npm run check.
   Deploy command: npm run deploy.
   These commands run ON CLOUDFLARE, not on your device.
6. Click Save and Deploy. After success, open the provided workers.dev address.

Once deployed, you only open the website. Nothing needs to run on your device.
No Cloudflare account connection or live deployment has been performed for you.
This is a ready-to-deploy package, not an already published website.
If an unrelated Worker already uses the same name, choose another name and edit
both the dashboard name and wrangler.jsonc name using GitHub's browser editor.
Hosting limits and charges depend on your plan; unlimited/free use is not promised.

The HTML also works without installation when opened locally or in the chat
preview for MANUAL editing, uploads and export. Steam import only works at the
hosted editor URL, because Steam metadata needs the hosted fetching function.
No Steam API key is configured or required by this implementation.

## Browser setup references

Cloudflare Git integration:
https://developers.cloudflare.com/workers/ci-cd/builds/
GitHub browser uploads:
https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Friendly display names

Front -> ART_FRONT
Back -> ART_BACK
SD Art -> ART_SD
Screenshot 1 through Screenshot 4 -> INGAME_1_BACK through INGAME_4_BACK
Description -> DESCRIPTION_BACK
Tag 1 through Tag 6 -> TAG_1_BACK through TAG_6_BACK

Internal SVG names remain unchanged. The supplied SVG includes Tag 5 and Tag 6;
those inputs now appear in the editor. All requested display labels are renamed without changing the SVG identifiers.

## Steam import

Enter a Steam App ID and press Fetch from Steam. Confirm before replacing content.

- ART_FRONT and ART_SD: portrait library capsule.
- ART_BACK: library hero.
- INGAME_1_BACK through INGAME_4_BACK: first four store screenshots (not videos).
- TITLE_BACK and TITLE_SPINE: store game name.
- DESCRIPTION_BACK: English short store description.
- APPID_FRONT, APPID_BACK and APPID_SD: one synchronized App ID.

Tags stay as entered; importing does not change them. Missing assets keep the
existing image, and missing descriptions keep existing text. Failed imports
show an error. Image candidates are limited to three per slot. The importer
tries high-resolution assets first where supplied in Steam metadata.

All positions, template overlays, panel dimensions, transforms and centered
image cropping remain fixed. Editing and JSON save/reload continue to work.
Old editor projects are accepted; newly available tags retain template defaults
when those values were not saved in an older project.

## Printing

PNG: 3508 x 2480 pixels with 300 DPI metadata.
PDF: exact A4 landscape, 297 x 210 mm, embedding a high-resolution JPEG.
SVG: original vector template with embedded images.
The full original sheet including SD artwork and guides is exported.
Print at Actual size / 100%. RGB output, not CMYK/PDF-X.
Motiva Sans is not bundled: install it or upload a licensed font file.
Description overflow blocks export until shortened. Long titles/tags are fit
within available widths. Uploaded text changes remain manually editable.

## Architecture and safeguards

The public folder is served as Cloudflare static assets. /api/* routes go to
src/worker.js using the same origin. The Worker fetches public Steam data and
images and returns embedded base64 images. The client embeds them into SVG,
so printable canvas exports do not depend on external image URLs.

- Positive numeric App IDs only, no arbitrary URL proxy.
- Upstream hostname allowlist; redirects checked against the same allowlist.
- Four-megabyte limit per upstream response, fifteen-second fetch timeout.
- JPEG/PNG/WebP magic-byte checks; images are then decoded by the browser.
- Ten-minute per-game edge cache. No permanent image storage or database.
- API is same-origin; it is not offered as a public CORS proxy.

Steam store interfaces are not a guaranteed integration contract. Changes,
regional restrictions, unavailable artwork and usage limits can require updates.
Tested with App ID 1593500 in the local Cloudflare runtime and the full browser
editor; no claim that every Steam game has all required art.

## Public usage / abuse protection

For a widely shared deployment, configure Cloudflare Access, edge rate limits,
or the optional Worker rate-limit binding BEFORE attracting public traffic.
Origin checks alone are not authentication. The code recognizes an optional
STEAM_RATE_LIMITER binding; without it no application-level rate limit is enabled.
Example configuration to merge into wrangler.jsonc, after checking availability
on your account and choosing a namespace ID unique to your account:

```json
"ratelimits": [
  {
    "name": "STEAM_RATE_LIMITER",
    "namespace_id": "1001",
    "simple": { "limit": 10, "period": 60 }
  }
]
```

An imported description can exceed the available box; manually shorten it.
Downloaded artwork remains subject to the rights of its owners.

## Included files

public/index.html: editor with embedded supplied SVG.
src/worker.js: serverless Steam importer.
wrangler.jsonc: same-origin static-assets/Worker configuration.
package.json and package-lock.json: tested tooling and scripts.
README.md: setup and limitations.

Cloudflare static asset binding documentation:
https://developers.cloudflare.com/workers/static-assets/binding/
