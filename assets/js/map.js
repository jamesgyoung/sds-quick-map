import { isFileTypeSupported, processGeospatialFile } from './fileHandler.js';
import { calculateBounds, createBoundingBox } from './geometryUtils.js';

class MapGenerator {
  constructor() {
    this.baseData = null;
    this.englandBoundary = null;
    this.userData = null;
    this.canvas = null;
    this.ctx = null;
    this.projection = null;
    this.pathGenerator = null;
    this.gdal = null;

    const MM_TO_INCHES = 1 / 25.4;
    const DEFAULT_DPI = 300;
    
    this.figureSizes = {
      a3: { 
        width: Math.round(297 * MM_TO_INCHES * DEFAULT_DPI), 
        height: Math.round(420 * MM_TO_INCHES * DEFAULT_DPI) 
      },
      a4: { 
        width: Math.round(210 * MM_TO_INCHES * DEFAULT_DPI), 
        height: Math.round(297 * MM_TO_INCHES * DEFAULT_DPI) 
      },
      a5: { 
        width: Math.round(148 * MM_TO_INCHES * DEFAULT_DPI), 
        height: Math.round(210 * MM_TO_INCHES * DEFAULT_DPI) 
      }
    };
    
    this.init();
  }

  async init() {
    await this.initGDAL();
    this.bindEvents();
    await this.loadBaseData();
  }

  async initGDAL() {
    this.gdal = await window.initGdalJs({ 
      //path: './assets/js/gdal3.js',
      path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
      useWorker: false 
    });
  }

  bindEvents() {
    const fileUpload = document.querySelector('.govuk-drop-zone input[type="file"]');
    const generateBtn = document.getElementById('generate-figure');
    const downloadPng = document.getElementById('download-png');
    const downloadJpeg = document.getElementById('download-jpeg');

    fileUpload?.addEventListener('change', (e) => this.handleFileUpload(e));
    generateBtn?.addEventListener('click', () => this.generateFigure());
    downloadPng?.addEventListener('click', () => this.downloadImage('png'));
    downloadJpeg?.addEventListener('click', () => this.downloadImage('jpeg'));
  }

  async loadBaseData() {
    const response = await fetch('/sds-quick-map/data/Countries_December_2024_Boundaries_UK_BUC.gpkg');
    const file = new File([await response.blob()], "Countries_December_2024_Boundaries_UK_BUC.gpkg");
    
    const result = await this.gdal.open(file);
    const dataset = result.datasets[0];
    
    const geoJsonResult = await this.gdal.ogr2ogr(dataset, ['-f', 'GeoJSON']);
    const geoJsonBytes = await this.gdal.getFileBytes(geoJsonResult);
    const geoJsonText = new TextDecoder().decode(geoJsonBytes);
    const geoJson = JSON.parse(geoJsonText);
    
    this.baseData = geoJson.features;
    this.englandBoundary = geoJson.features.find(f => f.properties.CTRY24NM === 'England');
  }

  async handleFileUpload(event) {
    const file = event.currentTarget.files[0];
    if (!file) return;

    if (!isFileTypeSupported(file.name)) {
      alert('Unsupported file type. Please upload: .gpkg, .shp, .geojson, .json, .kml');
      return;
    }

    try {
      this.userData = await processGeospatialFile(this.gdal, file);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file: ' + error.message);
    }
  }

  generateFigure() {
    if (!this.baseData || !this.englandBoundary) {
      alert('Base data not loaded yet. Please wait and try again.');
      return;
    }

    const figureSize = document.querySelector('input[name="figureSize"]:checked');
    if (!figureSize) {
      alert('Please select a figure size');
      return;
    }

    const title = document.getElementById('figure-title').value;
    const attribution = document.getElementById('attribution-statement').value;

    this.createCanvas(figureSize.value);
    this.setupProjection();
    this.drawMap(title, attribution);
    
    document.getElementById('canvas-container').style.display = 'block';
    document.getElementById('download-buttons').style.display = 'block';
  }

  createCanvas(size) {
    const dimensions = this.figureSizes[size];
    this.canvas = document.getElementById('map-canvas');
    
    this.canvas.width = dimensions.width;
    this.canvas.height = dimensions.height;
    
    const aspectRatio = dimensions.width / dimensions.height;
    const maxDisplayHeight = 800;
    
    const displayHeight = Math.min(maxDisplayHeight, dimensions.height / 4);
    const displayWidth = displayHeight * aspectRatio;
    
    this.canvas.style.width = displayWidth + 'px';
    this.canvas.style.height = displayHeight + 'px';
    
    this.ctx = this.canvas.getContext('2d');
  }

  setupProjection() {
    const bounds = calculateBounds(this.englandBoundary);
    const buffer = -33000;
    const boundingBox = createBoundingBox(bounds, buffer);
    
    const mapWidth = this.canvas.width * 0.85;
    const mapHeight = this.canvas.height * 0.75;
    
    this.projection = d3.geoIdentity()
      .reflectY(true)
      .fitSize([mapWidth, mapHeight], boundingBox);
    
    const [x, y] = this.projection.translate();
    this.projection.translate([
      x + (this.canvas.width * 0.075),
      y + (this.canvas.height * 0.15)
    ]);
    
    this.pathGenerator = d3.geoPath(this.projection);
  }

  drawMap(title, attribution) {
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.pathGenerator.context(this.ctx);
    
    this.ctx.fillStyle = '#f2f2f2';
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    
    this.baseData.forEach(feature => {
      this.ctx.beginPath();
      this.pathGenerator(feature);
      this.ctx.fill();
      this.ctx.stroke();
    });
    
    this.ctx.strokeStyle = 'dimgrey';
    this.ctx.lineWidth = 3;
    
    this.ctx.beginPath();
    this.pathGenerator(this.englandBoundary);
    this.ctx.stroke();
    
    if (this.userData?.length > 0) {
      this.ctx.fillStyle = '#1f77b4';
      this.ctx.strokeStyle = '#1f77b4';
      this.ctx.lineWidth = 2;
      
      this.userData.forEach(feature => {
        this.ctx.beginPath();
        this.pathGenerator(feature);
        this.ctx.fill();
        this.ctx.stroke();
      });
    }
    
    this.addText(title, attribution);
  }

  addText(title, attribution) {
    this.ctx.fillStyle = 'black';
    this.ctx.textAlign = 'left';
    
    if (title) {
      this.ctx.font = `bold ${Math.floor(this.canvas.width / 20)}px Arial`;
      this.ctx.fillText(title, this.canvas.width * 0.075, this.canvas.height * 0.08);
    }
    
    if (attribution) {
      this.ctx.font = `${Math.floor(this.canvas.width / 60)}px Arial`;
      this.ctx.fillText(attribution, this.canvas.width * 0.075, this.canvas.height * 0.95);
    }
  }

  downloadImage(format) {
    if (!this.canvas) return;
    
    const link = document.createElement('a');
    link.download = `map.${format}`;
    link.href = this.canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.9);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MapGenerator();
});
