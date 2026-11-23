# Marbella New-Build Atlas: project data format

Pipeline: `../data.json` (base; new-launch scripts append to `properties`) → `python3 enrich.py` (→ `../data.js`, `../data.full.json`) → `python3 kml.py` (→ KML/KMZ).
The map, list, filters, Swipe carousel (#/swipe) and KML all read `window.MAPDATA.properties` from `data.js`, so a project added to `data.json` and run through enrich.py appears everywhere automatically.

## Key project fields
- `id`, `name`, `lat`, `lng`, `precise` (false = approximate pin), `geoNote`, `area`, `zone`
- `category`: one of `Villa`, `Townhouse`, `Apartment / penthouse`, `Branded residences` (pin colour / list label)
- `unitTypes` (array, optional): unit types the project offers, from `Villa`, `Townhouse`, `Apartment`, `Penthouse`, `Branded residences`.
  enrich.py always adds the type implied by `category` (`Apartment / penthouse` → `Apartment`). The Type filter matches on this array, so a project with apartments and penthouses matches both filters.
- `penthouse` (object, optional) — set ONLY when a source explicitly mentions penthouse units (never guess):
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
