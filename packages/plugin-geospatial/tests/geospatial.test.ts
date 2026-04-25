import { describe, it, expect, beforeEach } from 'vitest';
import { GeoSpatialPlugin, createGeospatialPlugin, createGeoPoint } from '../src/index';
import { Document } from '@nebula-db/core';

describe('GeoSpatialPlugin', () => {
  let plugin: GeoSpatialPlugin;

  beforeEach(() => {
    plugin = createGeospatialPlugin({
      latField: 'lat',
      lngField: 'lng'
    });
  });

  describe('onAfterInsert', () => {
    it('should index documents with lat/lng', async () => {
      await plugin.onAfterInsert('test', { id: '1', lat: 40.7128, lng: -74.0060 } as Document);
      
      const index = plugin.getIndex();
      expect(index.has('1')).toBe(true);
    });

    it('should handle GeoJSON format', async () => {
      await plugin.onAfterInsert('test', { 
        id: '2', 
        location: { type: 'Point', coordinates: [-74.0060, 40.7128] } 
      } as Document);
      
      const index = plugin.getIndex();
      expect(index.has('2')).toBe(true);
    });
  });

  describe('$near', () => {
    it('should create near query', () => {
      const query = plugin.$near(40.7128, -74.0060, { maxDistance: 5000 });
      expect(query.$geo.$near).toBeDefined();
      expect(query.$geo.$near.lat).toBe(40.7128);
    });
  });

  describe('$withinBox', () => {
    it('should create box query', () => {
      const query = plugin.$withinBox(-80, 40, -70, 45);
      expect(query.$geo.$within.box).toEqual([-80, 40, -70, 45]);
    });
  });

  describe('$withinCircle', () => {
    it('should create circle query', () => {
      const query = plugin.$withinCircle(-74.0060, 40.7128, 5000);
      expect(query.$geo.$within.center).toEqual([-74.0060, 40.7128, 5000]);
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between points', async () => {
      await plugin.onAfterInsert('test', { id: '1', lat: 40.7128, lng: -74.0060 } as Document);
      
      const result = await plugin.onAfterQuery('test', {}, [{ id: '1', lat: 40.7128, lng: -74.0060 }]);
      expect(result).toHaveLength(1);
    });
  });
});

describe('createGeoPoint', () => {
  it('should create GeoJSON point', () => {
    const point = createGeoPoint(40.7128, -74.0060);
    expect(point.type).toBe('Point');
    expect(point.coordinates).toEqual([-74.0060, 40.7128]);
  });
});