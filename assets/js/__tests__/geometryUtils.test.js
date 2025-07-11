import { calculateBounds, createBoundingBox } from '../geometryUtils.js';

describe('Geometry Utils - Core Calculations', () => {
  describe('calculateBounds', () => {
    test('should calculate bounds for simple polygon', () => {
      const feature = {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [100, 200],
              [300, 200],
              [300, 400],
              [100, 400],
              [100, 200],
            ],
          ],
        },
      };

      const bounds = calculateBounds(feature);
      expect(bounds).toEqual({
        minX: 100,
        maxX: 300,
        minY: 200,
        maxY: 400,
      });
    });

    test('should handle nested coordinate arrays (multipolygon)', () => {
      const feature = {
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [100, 200],
                [200, 200],
                [200, 300],
                [100, 300],
                [100, 200],
              ],
            ],
            [
              [
                [300, 400],
                [500, 400],
                [500, 600],
                [300, 600],
                [300, 400],
              ],
            ],
          ],
        },
      };

      const bounds = calculateBounds(feature);
      expect(bounds).toEqual({
        minX: 100,
        maxX: 500,
        minY: 200,
        maxY: 600,
      });
    });

    test('should handle features without geometry gracefully', () => {
      const feature = { type: 'Feature' };
      const bounds = calculateBounds(feature);

      expect(bounds.minX).toBe(Infinity);
      expect(bounds.maxX).toBe(-Infinity);
    });
  });

  describe('createBoundingBox', () => {
    test('should create correct bounding box with buffer', () => {
      const bounds = { minX: 100, maxX: 300, minY: 200, maxY: 400 };
      const buffer = 50;

      const boundingBox = createBoundingBox(bounds, buffer);

      expect(boundingBox.type).toBe('Polygon');
      expect(boundingBox.coordinates[0]).toEqual([
        [50, 150],   // minX - buffer, minY - buffer
        [350, 150],  // maxX + buffer, minY - buffer
        [350, 450],  // maxX + buffer, maxY + buffer
        [50, 450],   // minX - buffer, maxY + buffer
        [50, 150],   // close polygon
      ]);
    });

    test('should handle zero buffer', () => {
      const bounds = { minX: 100, maxX: 300, minY: 200, maxY: 400 };
      const buffer = 0;

      const boundingBox = createBoundingBox(bounds, buffer);

      expect(boundingBox.coordinates[0]).toEqual([
        [100, 200],
        [300, 200],
        [300, 400],
        [100, 400],
        [100, 200],
      ]);
    });

    test('should handle negative buffer (inset)', () => {
      const bounds = { minX: 100, maxX: 300, minY: 200, maxY: 400 };
      const buffer = -10;

      const boundingBox = createBoundingBox(bounds, buffer);

      expect(boundingBox.coordinates[0]).toEqual([
        [110, 210], // inset by 10
        [290, 210],
        [290, 390],
        [110, 390],
        [110, 210],
      ]);
    });
  });
});
