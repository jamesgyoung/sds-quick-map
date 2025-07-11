/**
 * Calculates the geographic bounds of a GeoJSON feature
 * @param {Object} geoJsonFeature - The GeoJSON feature
 * @returns {Object} Bounds object with minX, maxX, minY, maxY
 */
export function calculateBounds(geoJsonFeature) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  const processCoordinates = (coords) => {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoordinates);
    } else {
      const [x, y] = coords;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  };

  if (geoJsonFeature.geometry && geoJsonFeature.geometry.coordinates) {
    processCoordinates(geoJsonFeature.geometry.coordinates);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Creates a bounding box polygon from bounds and buffer
 * @param {Object} bounds - Bounds object with minX, maxX, minY, maxY
 * @param {number} buffer - Buffer distance to add
 * @returns {Object} GeoJSON polygon representing the bounding box
 */
export function createBoundingBox(bounds, buffer) {
  const minX = bounds.minX - buffer;
  const maxX = bounds.maxX + buffer;
  const minY = bounds.minY - buffer;
  const maxY = bounds.maxY + buffer;

  return {
    type: 'Polygon',
    coordinates: [
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ],
    ],
  };
}
