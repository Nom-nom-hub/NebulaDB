import { Plugin, Document, Query } from '@nebula-db/core';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface GeoSpatialOptions {
  latField: string;
  lngField: string;
  indexName?: string;
}

interface GeoIndexEntry {
  id: string;
  lat: number;
  lng: number;
}

export class GeoSpatialPlugin implements Plugin {
  name = 'geospatial';

  private geoIndex: Map<string, GeoIndexEntry> = new Map();
  private options: GeoSpatialOptions;

  constructor(options: GeoSpatialOptions) {
    this.options = options;
  }

  private parseCoordinates(doc: Document): [number, number] | null {
    const lat = this.getNestedValue(doc, this.options.latField);
    const lng = this.getNestedValue(doc, this.options.lngField);

    if (typeof lat === 'number' && typeof lng === 'number') {
      return [lng, lat];
    }

    const geo = this.getNestedValue(doc, 'location');
    if (geo?.type === 'Point' && Array.isArray(geo.coordinates)) {
      return [geo.coordinates[0], geo.coordinates[1]];
    }

    return null;
  }

  async onInit(collection: any): Promise<void> {
    const docs = await collection.find({});
    for (const doc of docs) {
      await this.onAfterInsert(collection.name, doc);
    }
  }

  async onAfterInsert(collection: string, doc: Document): Promise<void> {
    const coords = this.parseCoordinates(doc);
    if (!coords) return;

    this.geoIndex.set(doc.id as string, {
      id: doc.id as string,
      lat: coords[1],
      lng: coords[0]
    });
  }

  async onAfterDelete(
    collection: string,
    query: Query,
    deletedDocs: Document[]
  ): Promise<void> {
    for (const doc of deletedDocs) {
      this.geoIndex.delete(doc.id as string);
    }
  }

  async onAfterQuery(
    collection: string,
    query: Query,
    results: Document[]
  ): Promise<Document[]> {
    if (!query.$geo) return results;

    const { $geo } = query;

    if ($geo.$near) {
      return this.filterByNear(results, $geo.$near);
    }

    if ($geo.$within) {
      return this.filterByWithin(results, $geo.$within);
    }

    return results;
  }

  private filterByNear(docs: Document[], options: {
    lat: number;
    lng: number;
    maxDistance?: number;
    minDistance?: number;
  }): Document[] {
    const maxDistance = options.maxDistance || 10000;
    const minDistance = options.minDistance || 0;

    return docs.filter(doc => {
      const entry = this.geoIndex.get(doc.id as string);
      if (!entry) return false;

      const distance = this.haversineDistance(
        options.lat, options.lng,
        entry.lat, entry.lng
      );

      return distance >= minDistance && distance <= maxDistance;
    });
  }

  private filterByWithin(docs: Document[], options: {
    box?: [number, number, number, number];
    polygon?: Array<[number, number]>;
    center?: [number, number, number];
  }): Document[] {
    return docs.filter(doc => {
      const entry = this.geoIndex.get(doc.id as string);
      if (!entry) return false;

      if (options.box) {
        const [minLng, minLat, maxLng, maxLat] = options.box;
        return (
          entry.lng >= minLng &&
          entry.lng <= maxLng &&
          entry.lat >= minLat &&
          entry.lat <= maxLat
        );
      }

      if (options.polygon) {
        return this.pointInPolygon(
          [entry.lng, entry.lat],
          options.polygon
        );
      }

      if (options.center) {
        const [centerLng, centerLat, radius] = options.center;
        const distance = this.haversineDistance(
          centerLat, centerLng,
          entry.lat, entry.lng
        );
        return distance <= radius;
      }

      return true;
    });
  }

  private haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private pointInPolygon(
    point: [number, number],
    polygon: Array<[number, number]>
  ): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  $near(
    lat: number,
    lng: number,
    options?: {
      maxDistance?: number;
      minDistance?: number;
    }
  ): Query {
    return {
      $geo: {
        $near: { lat, lng, ...options }
      }
    };
  }

  $withinBox(minLng: number, minLat: number, maxLng: number, maxLat: number): Query {
    return {
      $geo: {
        $within: {
          box: [minLng, minLat, maxLng, maxLat]
        }
      }
    };
  }

  $withinPolygon(polygon: Array<[number, number]>): Query {
    return {
      $geo: {
        $within: { polygon }
      }
    };
  }

  $withinCircle(centerLng: number, centerLat: number, radiusMeters: number): Query {
    return {
      $geo: {
        $within: {
          center: [centerLng, centerLat, radiusMeters]
        }
      }
    };
  }

  getIndex(): Map<string, GeoIndexEntry> {
    return this.geoIndex;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  }
}

export function createGeospatialPlugin(options: GeoSpatialOptions): GeoSpatialPlugin {
  return new GeoSpatialPlugin(options);
}

export function createGeoPoint(lat: number, lng: number): GeoPoint {
  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
}