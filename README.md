# CaseArt Makertool — Cloudflare edition

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

## Artwork picker layout

APP ID and Fetch from Steam are at the top of the sidebar with no explanatory
paragraph. Reset template is directly below them. The four screenshots share one
Screenshots heading. Success/error feedback is directly below Reset template.
The title input is simply labeled Title. Image measurement
subtitles have been removed.

Click an artwork preview to choose an image; native file inputs are hidden.
Front and Back appear side by side, SD Art is centered underneath, and screenshots
appear in a 2x2 grid: 1 upper left, 2 upper right, 3 lower left, 4 lower right.
Preview frames retain the original SVG slot aspect ratios. Images are shown with
proportional centered cover cropping, matching the existing template behavior.
Per-art reset buttons and corner plus icons have been removed. The hover/tap
Replace image overlay remains. Thumbnails update for manual uploads, Steam imports
and reopened projects. All SVG geometry remains unchanged.

## Interactive 3D case preview

Use the 2D Print / 3D Case toggle above the main preview.
The 3D view wraps the current BOX folder artwork onto front, spine and back
surfaces. It excludes the outer print sheet, guides and SD card.

- Drag with mouse or touch to rotate.
- Scroll, use the plus/minus controls, or press plus/minus to zoom.
- Front, Spine, Back and Reset view buttons provide camera presets.
- Focus the viewport and use arrow keys to rotate using the keyboard.
- Current artwork, imported assets, text and scoped custom fonts are rendered
  from the same live SVG; edits refresh the textures after a brief debounce.

This is a lightweight native CSS 3D box, not an externally loaded model. No
additional libraries, downloads or device installation are required. Panel
proportions and thickness are derived from the template cover/spine dimensions;
plastic edges are illustrative, not a manufacturer-certified case model.
Print PNG/PDF/SVG exports remain 2D and unchanged. The model textures use a
separate preview resolution and do not reduce the print export resolution.
There is no 3D model file export in this version.

## SD source selector and custom fonts

The selector next to SD Art offers Auto, Client icon, Logo and Front art.
Steam import retrieves all available alternatives. You can switch immediately
without another network request. Auto retains client icon -> logo -> front art
fallback behavior. Explicit selections keep existing SD artwork if that source
is unavailable and show feedback. Logos use contain/meet to stay fully visible;
icons and front art use proportional cover/slice cropping. The alternatives and
selected source are preserved in saved projects.

Title and Description each have Custom font and Motiva Sans buttons. Upload TTF,
OTF, WOFF or WOFF2. The Title custom font applies to TITLE_BACK ONLY, not the spine.
The Description custom font applies only to DESCRIPTION_BACK. Each has an
independent reset to bundled Motiva Sans. Font data is embedded into saved
projects and exported SVG and used when rasterizing PNG/PDF. Use fonts you have
permission to embed. These controls require no device font installation.

## Steam import

Enter a Steam App ID and press Fetch from Steam. Confirm before replacing content.

- ART_FRONT: portrait library capsule.
- ART_SD: client icon first; if missing, centered logo with full-image contain
  fitting; if no logo is available, the front capsule with cover cropping.
  If none is available, the current SD artwork remains unchanged. The SD selector
  can override Auto with an explicit client icon, logo or front-art choice.
- ART_BACK: library hero.
- INGAME_1_BACK through INGAME_4_BACK: first four store screenshots (not videos).
- TITLE_BACK and TITLE_SPINE: store game name.
- DESCRIPTION_BACK: English short store description.
- APPID_FRONT, APPID_BACK and APPID_SD: one synchronized App ID.
- TAG_1_BACK through TAG_6_BACK: first six store user-defined tags in order.
  The importer reads store-page tag anchors when available; age-gated/SSR pages
  fall back to Steam ranked tag metadata and its English tag-name dictionary.
  These are store tags, not inferred genres. If fewer than six tags exist, the
  remaining fields are cleared. If tag retrieval fails entirely, existing tags
  are preserved and a warning appears.

Importing now replaces the tag fields when Steam supplies tags. All fields remain
manually editable. Missing assets keep the existing image, and missing descriptions
keep existing text. Failed imports
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
The full newly supplied sheet including SD artwork and guides is exported.
The supplied SD image frame is 20 x 25 template units (4:5). Both the SD preview
and image use that ratio, with proportional centered cover cropping. Its original
transforms and clip path are preserved. A logo fallback uses meet/contain, with
a matching dark background, and fit mode survives project save/reopen. Steam
client icons may be low-resolution;
you may manually replace SD Art with a higher-resolution image.
Print at Actual size / 100%. RGB output, not CMYK/PDF-X.
The seven Motiva Sans fonts supplied by you are bundled as embedded WOFF font
faces: Thin (250), Light (300), Regular (400), Medium (500), Bold (700),
ExtraBold (800), and Black (900). Text retains the weights specified in the SVG.
Fonts are also embedded into exported SVG, and used when rasterizing PNG/PDF.
No local font installation or font upload is required. Older projects with an
explicit custom-font override may still restore that override. Ensure you have
permission to embed/redistribute these supplied fonts before publishing publicly.
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
