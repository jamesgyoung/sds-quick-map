// Mock GDAL3.js
globalThis.initGdalJs = () =>
  Promise.resolve({
    open: () => Promise.resolve({ datasets: [{}] }),
    ogr2ogr: () => Promise.resolve('result'),
    getFileBytes: () => Promise.resolve(new Uint8Array()),
  });

// Mock D3 - only what we actually use
globalThis.d3 = {
  geoIdentity: () => ({
    reflectY: () => ({
      fitSize: () => ({
        translate: () => ({}),
        scale: () => 1,
      }),
    }),
  }),
  geoPath: () => ({
    context: () => {},
  }),
};

// Mock File API
globalThis.File = class File {
  constructor(chunks, filename) {
    this.chunks = chunks;
    this.name = filename;
  }
  
  async text() {
    return this.chunks[0];
  }
};

// Mock TextDecoder
globalThis.TextDecoder = class TextDecoder {
  decode(bytes) {
    return JSON.stringify({ features: [] });
  }
};

// Mock fetch
globalThis.fetch = () =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
  });