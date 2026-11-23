# Marbella New-Build Atlas: project data format

Pipeline: `../data.json` (base; new-launch scripts append to `properties`) → `python3 enrich.py` (→ `../data.js`, `../data.full.json`) → `python3 kml.py` (→ KML/KMZ).
The map, list, filters, Swipe carousel (#/swipe) and KML all read `window.MAPDATA.properties` from `data.js`, so a project added to `data.json` and run through enrich.py appears everywhere automatically.

## Key project fields
- `id`, `name`, `lat`, `lng`, `precise` (false = approximate pin), `geoNote`, `area`, `zone`
- `category`: one of `Villa`, `Townhouse`, `Apartment / penthouse`, `Branded residences` (pin colour / list label)
- `unitTypes` (array, optional): unit types the project offers, from `Villa`, `Townhouse`, `Apartment`, `Penthouse`, `Branded residences`.
  enrich.py always adds the type implied by `category` (`Apartment / penthouse` → `Apartment`). The Type filter matches on this array, so a project with apartments and penthouses matches both filters.
- `penthouse` (object, optional) — **since 23 Nov 2026 derived from live availability** (see “Availability” below): enrich.py sets it only when at least one penthouse is currently available in a dated source, and otherwise removes it and writes `penthouseSoldOut` (text). The format below (and `_build/penthouse.json`) is still read first, but the availability step overrides it:
  ```json
  "penthouse": {"price": 2900000, "priceText": "€2,900,000 ex VAT (duplex penthouse)", "size": "266 m²", "terrace": "167 m²",
                "note": "unit mix", "source": "Agent listing", "sourceUrl": "https://…", "quote": "short quote mentioning the penthouse"}
  ```
  `price` = 0 if no penthouse-specific price is published. If present, enrich.py adds `Penthouse` to `unitTypes`.
  Alternatively add an entry to `_build/penthouse.json` keyed by project id (`types`, `price`, `priceText`, `size`, `terrace`, `note`, `src`: [label, url], `quote`).
  enrich.py prints `WARN penthouse mentioned but not tagged` for projects whose text mentions penthouses/áticos without a tag: review those.
- `price` (entry €, 0 = unpublished), `priceHi`, `priceText`, `delivery`, `year`, `developer`, `units`, `kind`, `size`, `terrace`, `terraceMax`, `sea`, `gated`, `note`, `url`, `extraLinks` [[label,url]]
- Tiers: `shortlist` (≤ €3M sea view), `premium` (sea view €3–10M), `ultra` (€10M+)

## Photos (self-hosted)

All project photos are stored in the repo, never hotlinked: `img/projects/{id}-{n}.jpg` (longest side ≤1600 px, JPEG q78) and `img/projects/{id}-{n}-t.jpg` (480×360 thumbnail). `_build/photos.json` maps a project id to a list of:

```json
{"src": "img/projects/royal-river-1.jpg", "thumb": "img/projects/royal-river-1-t.jpg",
 "orig": "https://marbella.live/developments/royal-river/3.webp",
 "page": "https://marbella.live/new-developments/royal-river"}
```

`orig` is the image's original URL and `page` the page it was taken from. `page` hosts are shown as the photo credit and linked on the detail page.

**Adding photos to a new project (routine additions):** put `"photoUrls": [["<imageUrl>", "<pageUrl>"], ...]` on the project in `data.json`, or an entry in `_build/photo_sources.json` (`{"<id>": [[imageUrl, pageUrl], ...]}`). The next `python3 enrich.py` downloads them with a browser User-Agent and the page as Referer. It keeps up to 4 images, skips images smaller than 500×300 and near-duplicates, and saves them in the format above (`_build/selfhost.py`). enrich.py also re-downloads any local photo whose file has gone missing, using its `orig` URL, and prints `WARN no photos: <id>` for projects that still have none.

Source order: the official project site first, then the developer's site, then agent listings (Idealista, Kyero, Roccabox, Engel & Völkers, Sotheby's, marbella.live). **Only use images that clearly show this project.** Agent pages often embed "similar developments" thumbnails, so check that the URL belongs to this listing's own gallery/JSON-LD and not a "similar" block. Never use stock photos, maps, logos or people shots. If nothing qualifies, leave the project without photos; the UI shows a placeholder.

## Availability (live units, Penthouse tag)

Files: `../availability.json` (full unit tables, keyed by project id) and `../availability.js` (same data as `window.AVAIL`; the site loads it only when the Availability panel opens). Built by `_build/refresh_availability.py`; `enrich.py` then calls `_build/availability_apply.py`, which writes a compact `avail` summary on each project in `data.js` and re-derives the Penthouse tag.

**Refresh (Monday/Thursday routine, before enrich.py):**
```bash
cd /workspace/marbella-map/_build && python3 refresh_availability.py && python3 enrich.py && python3 kml.py
```
`python3 refresh_availability.py --only <id> [<id> …]` refreshes some projects and keeps the rest; `--offline` re-parses the cached pages in `_build/avail_cache/`. A source that fails to load keeps the previous record (marked `stale`). The script prints the count per level; review projects whose counts change a lot before publishing.

Inputs:
- `_build/availability_sources.json`: `{"<id>": {"sources": [{"label": "...", "urls": ["..."]}], "manual": false, "typeHints": [...]}}`. Sources are tried in order; the **first one that returns a unit list is primary** (used for the table and counts), the others are kept as cross-checks. Several `urls` in one source are combined (e.g. two villa pages). Order used: developer site → WeSellHomes dated price list → Santina Homes → Roccabox. Parsers (in `availability_lib.py`, chosen by host): `wesellhomes.es`, `santinahomes.com`, `roccabox.com` (unit table + "Available X of Y"; pages with no table count as "listed"), `alianzgroup.es`, `engelvoelkers.com` projects, `nuevaliving.com`.
- `_build/availability_manual.json`: hand-checked entries for sites that block scripts or publish no list (Lucas Fox, developer pages with JS widgets, single listings). Used when the project has `"manual": true`; `notes` are always merged. **Every unit and price must come from the cited `source.url`; update `asOf` when you re-check.**
- Penthouse detection: a unit is a penthouse when its source labels it so (Penthouse / Ático / PH, the WeSellHomes "Penthouses" group, Roccabox "PH" ids or floor "AT"). If another source labels the same unit (same id, or same price and beds) a penthouse, the label is copied with `typeFrom` explaining why. `typeHints` match units by beds + built m² to a type list (e.g. Arevont).

Per project in `availability.json`:
```json
{"level": "unit | project | unknown", "available": 13, "total": 46, "reserved": 0, "sold": 0,
 "lastChecked": "2026-11-23", "summary": "13 available of 46", "priceMin": 705000, "priceMax": 1570000,
 "units": [{"id": "AO-53A", "type": "Penthouse", "label": "Penthouses", "beds": 3, "built": 148, "terrace": 147,
            "floor": "Entrance 5 · Floor 3", "price": 1570000, "status": "available", "src": "https://…", "typeFrom": "…"}],
 "sources": [{"label": "WeSellHomes price list", "url": "https://…", "asOf": "2026-11-20", "checked": "2026-11-23", "available": 13, "primary": true}],
 "penthouse": {"available": 6, "priceMin": 1095000, "priceMax": 1570000, "evidence": [], "basis": "unit list"},
 "notes": ["conflicts between sources, etc."]}
```
- `unit` = a unit list with statuses; `project` = only a count/summary (or a few agent listings); `unknown` = nothing published.
- Unit `type`: `Apartment`, `Ground floor`, `Penthouse`, `Townhouse`, `Semi-detached`, `Villa`. `status`: `available`, `reserved`, `sold`. Areas in m², prices in € as published (usually excluding VAT).
- `penthouse.evidence`: agent listings that show an available penthouse where no unit list exists (project-level).

Compact `avail` in `data.js` (badges, filters): `level, available, total, summary, lastChecked, asOf, priceMin, priceMax, ph, phMin, phMax, soldOut, source, sourceUrl`.

UI: the project detail has an **Availability** section with a button that opens the third panel at `#/project/<id>/units` (beside the detail on desktop, full screen on mobile). The panel has a sortable table, type chips, an "Available units only" toggle and highlighted penthouses, or a summary for project-level data. Map popups, list cards and Swipe cards show an “N units available” badge. The price filter has an "Available units only (live prices)" option, which matches the range against available unit prices and hides sold-out projects. Code: `avail.js`, loaded before `app.js`.

**Topping up projects with few photos:** add vetted `[imageUrl, pageUrl]` pairs to `_build/photo_topup.json` (`{"<id>": [...]}`) and run `python3 topup.py`. It appends up to 8 photos in total, numbered after the existing ones, and skips near-duplicates. Then run `python3 enrich.py`. Roccabox development pages list a project's own gallery in `const galleryImgs = [...]`. Other `zd-proxy` images on those pages belong to "similar developments", so don't use them. Never use marbella.live `/share/` images: they are text share cards, not photos.

The detail page shows photos as a gallery: a lead image plus up to 4 thumbnails, with a "+N" tile when there are more. A lightbox shows each photo full size with a link to the page it came from (`page`), so keep `page` filled in.
