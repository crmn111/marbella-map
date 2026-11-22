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
