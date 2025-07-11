/**
 * Validates if a file type is supported
 * @param {string} filename - The filename to check
 * @returns {boolean} True if supported, false otherwise
 */
export function isFileTypeSupported(filename) {
  const supportedTypes = ['.gpkg', '.shp', '.geojson', '.json', '.kml'];
  const extension = '.' + filename.split('.').pop().toLowerCase();
  return supportedTypes.includes(extension);
}

/**
 * Checks if the GeoJSON needs reprojection to EPSG:27700
 * @param {Object} geoJson - The GeoJSON object
 * @returns {boolean} True if reprojection is needed
 */
export function needsReprojection(geoJson) {
  return (
    !geoJson.crs ||
    !geoJson.crs.properties ||
    !geoJson.crs.properties.name ||
    !geoJson.crs.properties.name.includes('27700')
  );
}

/**
 * Processes a geospatial file using GDAL
 * @param {Object} gdal - The GDAL instance
 * @param {File} file - The file to process
 * @returns {Promise<Array>} Array of GeoJSON features
 */
export async function processGeospatialFile(gdal, file) {
  const extension = '.' + file.name.split('.').pop().toLowerCase();

  if (extension === '.geojson' || extension === '.json') {
    const text = await file.text();
    const geojson = JSON.parse(text);
    return geojson.features || [geojson];
  }

  const result = await gdal.open(file);
  const dataset = result.datasets[0];

  let geoJsonResult = await gdal.ogr2ogr(dataset, ['-f', 'GeoJSON']);
  let geoJsonBytes = await gdal.getFileBytes(geoJsonResult);
  let geoJsonText = new TextDecoder().decode(geoJsonBytes);
  let geoJson = JSON.parse(geoJsonText);

  if (needsReprojection(geoJson)) {
    geoJsonResult = await gdal.ogr2ogr(dataset, [
      '-f',
      'GeoJSON',
      '-t_srs',
      'EPSG:27700',
    ]);
    geoJsonBytes = await gdal.getFileBytes(geoJsonResult);
    geoJsonText = new TextDecoder().decode(geoJsonBytes);
    geoJson = JSON.parse(geoJsonText);
  }

  return geoJson.features;
}
