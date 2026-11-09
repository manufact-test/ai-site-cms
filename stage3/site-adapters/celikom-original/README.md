# CELIKOM original-source bridge — offline proof

This isolated tool preserves an owner-provided saved CELIKOM website. It is **not a CMS importer**, does not publish a site, and makes no FOX, production or database changes.

## Current verified original-source status (2026-11-09)

The separately approved owner ZIP and both owner-provided 11-second MP3 clips
are supported by the owner-only source adapter on this branch. The complete
original owner ZIP stays byte-identical and is stored outside the GitHub repo.
Only in a verified, private runtime package, the original player's fade code
receives an exact one-function correction for negative
`requestAnimationFrame` time deltas: both interpolation and volume are
clamped to 0–1. Its source/runtime hashes and fix ID are recorded in
`manifest.json.reviewed_runtime_fixes`. All other original script/CSS/image
asset bytes remain unchanged.

Regression: `python3 test_native_package.py` verifies immutable source ZIP,
reviewed player derivative and 24 simulated out-of-order frame timestamps in
`test_player_fade.cjs`. CI run:
https://github.com/manufact-test/ai-site-cms/actions/runs/42583797774
was successful, including existing Studio browser E2E with synthetic fixtures.
**Real owner audio + Studio fade recheck is still required after the fix.**
Do not deploy to FOX, CELIKOM production or main from this work.

## Features

- Extract saved HTML/CSS/JS/SVG/PNG under safe path and size rules; hash all original files.
- Extract 99 allowlisted text fields from the current owner archive, including 28 FAQ Q/A pairs, headings and SEO.
- Build a local static page, changing allowed text only; copy CSS/JS/images byte-for-byte.
- Reject unknown/missing keys, a changed source hash, unsafe ZIP paths, markup injection in text fields and overwriting an existing destination.
- Rewrite original Hostinger same-page links for local preview; preserve the original audio player, without fabricated sound.

## Local commands

Python 3.10+ with beautifulsoup4 is required only on the build machine.

    python -m pip install beautifulsoup4
    python bridge.py prepare /ABS/owner-capture.zip /ABS/working-copy
    # Edit /ABS/working-copy/values.json
    python bridge.py build /ABS/working-copy /ABS/preview
    python finalize_static.py /ABS/preview /ABS/preview-final
    python test_bridge.py
    CELIKOM_CAPTURE_ZIP=/ABS/owner-capture.zip python test_bridge.py

## Missing pieces for native CMS integration

1. Current Studio's Подключить готовый сайт accepts a validated typed manufact-approved-site-handoff folder, not arbitrary original HTML/JS. This utility does not claim native CMS import or create fake approval.
2. A reviewed first-party source adapter is still needed to bind the content map to the existing Studio without changing the real site UI. It must cover preview, edits, media, Save/Publish/Restore and owner authorization. It must not become a general untrusted HTML/JS execution path.
3. The user's saved capture is missing both demo audio responses (service/restored) and four Manrope WOFF2 font files referenced by the CSS. Do not invent media or distribute fonts.
4. Chromium in the development container blocked both local HTTP and file URLs with ERR_BLOCKED_BY_ADMINISTRATOR, therefore visual/JS browser E2E is **not proven**. Offline structural tests are separate from real acceptance.
5. Never put private source captures, site HTML, actual text values, or private media in this public repository. Only generic tool code and synthetic tests are committed.

Existing functional SHA 5c863f4, Stage3 core, main, FOX, production and design status are unchanged.

The captured archive has three artificial '.Без названия' script suffixes and a PNG named 'saved_resource'. The separate finalize step changes only output names/links so a static HTTP server supplies correct JS/PNG MIME types, preserving the original file bytes; it refuses overwrite.
