/**
 * Validates if a file type is supported
 * @param {string} filename - The filename to check
 * @returns {boolean} True if supported, false otherwise
*/
export function isFileTypeSupported(filename) {
  const supportedTypes = [".gpkg", ".geojson", ".json", ".kml", ".shp"];
  const extension = '.' + filename.split('.').pop().toLowerCase();
  return supportedTypes.includes(extension);
}

/**
 * Validates shapefile components
 * @param {File[]} files - Array of files to validate
 * @returns {Object} { isValid: boolean, validFiles: File[], errorMessage: string|null }
 */
export function validateShapefile(files) {
  const validShapefileExtensions = [".shp", ".shx", ".dbf", ".prj", ".sbn", ".sbx", ".fbn", ".fbx", ".ain", ".aih", ".atx", ".ixs", ".mxs", ".xml", ".cpg"];
  
  const shapefileFiles = files.filter(f => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return validShapefileExtensions.includes(ext);
  });

  const shpFiles = shapefileFiles.filter(f => f.name.toLowerCase().endsWith('.shp'));
  
  if (shpFiles.length === 0) {
    return { isValid: true, validFiles: files, errorMessage: null };
  }

  for (const shpFile of shpFiles) {
    const basename = shpFile.name.split('.').slice(0, -1).join('.');
    const hasShx = shapefileFiles.some(f => f.name.toLowerCase() === `${basename.toLowerCase()}.shx`);
    const hasDbf = shapefileFiles.some(f => f.name.toLowerCase() === `${basename.toLowerCase()}.dbf`);
    const hasPrj = shapefileFiles.some(f => f.name.toLowerCase() === `${basename.toLowerCase()}.prj`);
    
    if (!hasShx || !hasDbf || !hasPrj) {
      const missing = [];
      if (!hasShx) missing.push(`${basename}.shx`);
      if (!hasDbf) missing.push(`${basename}.dbf`);
      if (!hasPrj) missing.push(`${basename}.prj`);
      
      return {
        isValid: false,
        validFiles: [],
        errorMessage: `Shapefile is missing required companion files (${missing.join(', ')}). Please upload the complete shapefile directory or add the missing files.`
      };
    }
  }

  return { isValid: true, validFiles: shapefileFiles, errorMessage: null };
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
 * Processes GDAL dataset to GeoJSON with optional reprojection
 * @param {Object} gdal - The GDAL instance
 * @param {Object} dataset - The GDAL dataset
 * @returns {Promise<Array>} Array of GeoJSON features
 */
async function processDataset(gdal, dataset) {
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

/**
 * Processes a geospatial file using GDAL
 * @param {Object} gdal - The GDAL instance
 * @param {File|File[]} files - The file(s) to process
 * @returns {Promise<Array>} Array of GeoJSON features
 */
export async function processGeospatialFile(gdal, files) {
  if (!Array.isArray(files)) {
    const extension = '.' + files.name.split('.').pop().toLowerCase();
    if (extension === '.geojson' || extension === '.json') {
      const text = await files.text();
      const geojson = JSON.parse(text);
      
      if (needsReprojection(geojson)) {
        const result = await gdal.open(files);
        return await processDataset(gdal, result.datasets[0]);
      }
      
      return geojson.features || [geojson];
    }
  }
 
  const result = await gdal.open(files);
  const dataset = result.datasets[0];
  
  return await processDataset(gdal, dataset);
}