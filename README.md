# Marbella New-Build Atlas

Interactive map of Costa del Sol new-build projects (2028–2030), a sea-view shortlist up to €3M, English-language international schools, growth hotspots, main roads and everyday amenities around Marbella.

- Static site (Leaflet), no build step. Open `index.html`.
- Every project, school, hotspot and place has a shareable link, e.g. `#/project/nubay`.
- `marbella.kml` / `marbella.kmz` can be imported into Google My Maps.

Fit scores are computed by this map from the owner's brief (see "How scores work" on the map); they are not third-party ratings. Prices exclude VAT unless stated. Photos © their publishers (credited on each page), shown for reference. POI and road data © OpenStreetMap contributors. Research as of 13 Nov 2026; new-launch watch updated 16 Nov 2026.

## Data format

Projects live in `data.js` (`window.MAPDATA.properties`). Unit types are in `unitTypes` (e.g. `["Apartment","Penthouse"]`); the optional `penthouse` object (price, size, terrace, source) is set only when a source mentions penthouse units. Full field list: see `DATA_FORMAT.md`.
