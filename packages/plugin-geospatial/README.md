# @nebula-db/plugin-geospatial

Geospatial plugin for NebulaDB. Add location-aware queries to any collection using an in-memory geo index and the Haversine distance formula.

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 📍 **Proximity Search** — Find documents near a geographic coordinate with `$near`
- 📦 **Bounding Box Query** — Filter documents within a lat/lng rectangle with `$withinBox`
- 🔷 **Polygon Query** — Filter documents within an arbitrary polygon with `$withinPolygon`
- ⭕ **Radius Query** — Filter documents within a circular area with `$withinCircle`
- 🌍 **GeoJSON Support** — Accepts both flat `lat`/`lng` fields and GeoJSON `Point` objects
- ⚡ **In-Memory Index** — Geo index is built and updated automatically on insert and delete

## Installation

```bash
npm install @nebula-db/plugin-geospatial
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createGeospatialPlugin, createGeoPoint } from '@nebula-db/plugin-geospatial';

const geo = createGeospatialPlugin({
  latField: 'lat',
  lngField: 'lng',
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [geo],
});

const places = db.collection('places');

await places.insert({ id: '1', name: 'CN Tower', lat: 43.6426, lng: -79.3871 });
await places.insert({ id: '2', name: 'Niagara Falls', lat: 43.0962, lng: -79.0377 });
await places.insert({ id: '3', name: 'Ottawa', lat: 45.4215, lng: -75.6972 });

// Find places within 100 km of downtown Toronto
const nearby = await places.find(geo.$near(43.6532, -79.3832, { maxDistance: 100000 }));
console.log(nearby.map((p) => p.name)); // ['CN Tower', 'Niagara Falls']
```

## Configuration

| Option      | Type     | Required | Description                                   |
| ----------- | -------- | -------- | --------------------------------------------- |
| `latField`  | `string` | ✅       | Document field containing the latitude value  |
| `lngField`  | `string` | ✅       | Document field containing the longitude value |
| `indexName` | `string` | —        | Optional name for the geo index               |

## API Reference

### Query Builders

| Method                                                  | Description                                               |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `geo.$near(lat, lng, options?)`                         | Documents within `maxDistance` meters (default: 10 000 m) |
| `geo.$withinBox(minLng, minLat, maxLng, maxLat)`        | Documents inside a bounding box                           |
| `geo.$withinPolygon(polygon)`                           | Documents inside a polygon defined as `[lng, lat][]`      |
| `geo.$withinCircle(centerLng, centerLat, radiusMeters)` | Documents inside a circle                                 |

### `$near` Options

| Option        | Type     | Default | Description                |
| ------------- | -------- | ------- | -------------------------- |
| `maxDistance` | `number` | `10000` | Maximum distance in meters |
| `minDistance` | `number` | `0`     | Minimum distance in meters |

### Helper

```typescript
// Create a GeoJSON Point object
const point = createGeoPoint(43.6532, -79.3832);
// { type: 'Point', coordinates: [-79.3832, 43.6532] }
```

## Example: Bounding Box Query

```typescript
// Find places within a lat/lng bounding box around southern Ontario
const inBox = await places.find(geo.$withinBox(-80.0, 42.5, -75.0, 45.5));
```

## Example: Radius Query

```typescript
// Find places within 50 km of a point
const inCircle = await places.find(geo.$withinCircle(-79.3832, 43.6532, 50000));
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

Apache-2.0
