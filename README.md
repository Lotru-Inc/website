# Lotru Website

Pre-announcement teaser: a single page. Run `pnpm dev`, or `pnpm build` to build into `client/dist`.

PNG, JPG, and JPEG images are stored with Git LFS. Install Git LFS and run `git lfs install` before adding images; run `git lfs pull` to download existing images after cloning.

## Brand page

`/brand` is a static page, deliberately unlinked from the site and marked `noindex`. Edit `client/brand/brand.data.js`: the page, `brand.md`, `brand.json`, `tokens.css` and `llms.txt` are all generated from it at build time. Logos and fonts are published from `client/public/brand/`. Its PNG downloads need Git LFS enabled in the Vercel project.
