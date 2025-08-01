import {
  isFileTypeSupported,
  needsReprojection,
  processGeospatialFile,
} from '../fileHandler.js';

describe('File Handler - Core Logic', () => {
  describe('isFileTypeSupported', () => {
    test('should accept supported formats', () => {
      expect(isFileTypeSupported('data.gpkg')).toBe(true);
      expect(isFileTypeSupported('DATA.SHP')).toBe(true);
      expect(isFileTypeSupported('file.geojson')).toBe(true);
    });

    test('should reject unsupported formats', () => {
      expect(isFileTypeSupported('data.txt')).toBe(false);
      expect(isFileTypeSupported('image.png')).toBe(false);
    });
  });

  describe('needsReprojection', () => {
    test('should return true when no CRS present', () => {
      const geoJson = { type: 'FeatureCollection', features: [] };
      expect(needsReprojection(geoJson)).toBe(true);
    });

    test('should return false when EPSG:27700 is present', () => {
      const geoJson = {
        crs: { properties: { name: 'EPSG:27700' } },
        features: [],
      };
      expect(needsReprojection(geoJson)).toBe(false);
    });

    test('should return true for other EPSG codes', () => {
      const geoJson = {
        crs: { properties: { name: 'EPSG:4326' } },
        features: [],
      };
      expect(needsReprojection(geoJson)).toBe(true);
    });
  });

  describe('processGeospatialFile', () => {
    test('should handle GeoJSON files directly', async () => {
      const mockGeoJson = {
        type: 'FeatureCollection',
        crs: { properties: { name: 'EPSG:27700' } },
        features: [{ type: 'Feature' }],
      };
      const file = new File([JSON.stringify(mockGeoJson)], 'test.geojson');

      const result = await processGeospatialFile({}, file);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'Feature' });
    });

    test('should process files without reprojection when already EPSG:27700', async () => {
      const mockGdal = {
        open: () => Promise.resolve({ datasets: [{}] }),
        ogr2ogr: () => Promise.resolve('result'),
        getFileBytes: () => Promise.resolve(new Uint8Array()),
      };

      // Mock TextDecoder to return data that doesn't need reprojection
      const originalTextDecoder = globalThis.TextDecoder;
      globalThis.TextDecoder = class {
        decode() {
          return JSON.stringify({
            crs: { properties: { name: 'EPSG:27700' } },
            features: [{ type: 'Feature' }],
          });
        }
      };

      const file = new File([''], 'test.gpkg');
      const result = await processGeospatialFile(mockGdal, file);

      expect(result).toEqual([{ type: 'Feature' }]);

      globalThis.TextDecoder = originalTextDecoder;
    });

    test('should reproject when needed', async () => {
      const mockGdal = {
        open: () => Promise.resolve({ datasets: [{}] }),
        ogr2ogr: () => Promise.resolve('result'),
        getFileBytes: () => Promise.resolve(new Uint8Array()),
      };

      const originalTextDecoder = globalThis.TextDecoder;
      let callCount = 0;
      globalThis.TextDecoder = class {
        decode() {
          callCount++;
          return JSON.stringify({
            crs: { properties: { name: callCount === 1 ? 'EPSG:4326' : 'EPSG:27700' } },
            features: [{ type: 'Feature' }],
          });
        }
      };

      const file = new File([''], 'test.gpkg');
      const result = await processGeospatialFile(mockGdal, file);

      expect(result).toEqual([{ type: 'Feature' }]);

      globalThis.TextDecoder = originalTextDecoder;
    });

    test('should handle JSON parsing errors', async () => {
      const file = new File(['invalid json'], 'test.geojson');
      await expect(processGeospatialFile({}, file)).rejects.toThrow();
    });
  });
});