const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { URL, URLSearchParams } = require('url');
const {Buffer} =  require('buffer');
const proj4 = require('proj4');
const GeoJsonGeometries = require('geojson-geometries');
const bboxClip = require('@turf/bbox-clip').default;
const fs = require('fs').promises;
const gPolyline = require('google-polyline');
const staticApi = "https://maps.googleapis.com/maps/api/staticmap";
const getTiles = require('./tiles.js');
const {joinImages} = require('join-images');

const mercatorExtent = {
  left: -20037508.342789244,
  right: 20037508.342789244,
  bottom: -20037508.342789244,
  top: 20037508.342789244
};
const mapTileSize = 256; // map tile size
var resolutions = [];
for (var i=0; i< 24; i++) {
  resolutions.push( (mercatorExtent.right - mercatorExtent.left) /
    (mapTileSize * Math.pow(2,i)) );
}

class LargeMap {
  constructor (googleApiKey, options={}) {
    if (!googleApiKey) throw new Error('Google API key is required');
    this.googleApiKey = googleApiKey;
    this.mapType = options.mapType || 'roadmap';
    this.format = options.format || 'jpg';
    this.scale = options.scale || 1;
    this.maxTileSize = options.maxTileSize || 640;
    if (options.geojson) {
      this.geojson = options.geojson;
      const jsonGeometries = new GeoJsonGeometries(options.geojson);
      this.points = jsonGeometries.lines.points;
      this.lines = jsonGeometries.lines.features;
      this.polygons = jsonGeometries.polygons.features;
    }
    /*
     * path is:
     * {
     *   geojson: {},
     *   width: 2,
     *   color: '#ffeeff',
     *   fillcolor: '#fefefe'
     * }
     */
  }

  async getImage (extent, zoom = 8) {
    if (!extent) throw new Error('Missing parameter: extent');
    const tiles = this.getTiles(extent, zoom);
    const rowImgs = [];
    for (const [i, row] of tiles.entries()) {
      const colImgs = [];
      for (const tile of row) {
        console.log('Fetching tile - row: %s, col: %s', tile.row, tile.col );
        const params = new URLSearchParams({
          key: this.googleApiKey,
          maptype: this.mapType,
          format: this.format,
          scale: this.scale,
          size: tile.widthPx + 'x' + tile.heightPx,
          center: tile.center[1] + ',' + tile.center[0],
          zoom: zoom
        });
        let paramsStr = params.toString();
        if (tile.markers) paramsStr += '&' + tile.markers
          .map(m => `markers=${m}`)
          .join('&');
        if (tile.paths) paramsStr += '&' + tile.paths
          .map(p => {
            return 'path=' + encodeURI('wight:3|color:red|enc:' + p);
          })
          .join('&');
        // console.log(JSON.stringify(tile));
        console.log('params: ', paramsStr);
        const img = await fetch(staticApi + '?' + paramsStr);
        const imgb = Buffer.from(await img.arrayBuffer());
        await fs.writeFile(
          '/tmp/static-maps/' + `tile-${tile.row}-${tile.col}.jpg`,
          imgb).catch(console.error);
        colImgs.push(imgb);
      }
      try {
        const rowImg = await joinImages(colImgs, {direction: 'horizontal'});
        const rowImgBuf = Buffer.from(await rowImg.jpeg().toBuffer());
        //await fs.writeFile(process.cwd() + '/tmp/static-maps/' + `row-${i}.jpg`, rowImgBuf);
        rowImgs.push(rowImgBuf);
      } catch (error) {
        return Promise.reject(error);
      }
    };
    try {
      const image = await joinImages(rowImgs, {direction: 'vertical'});
      const imageBuf = Buffer.from(await image.jpeg().toBuffer());
      return Promise.resolve(imageBuf);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  getTiles (extent, zoom = 8) {
    const [left, bottom] = proj4('EPSG:4326', 'EPSG:3857', extent.slice(0,2));
    const [right, top] = proj4('EPSG:4326', 'EPSG:3857', extent.slice(2,4));
    // height/width devided by your tile size in meters
    const sizeMeter = this.maxTileSize * resolutions[zoom];
    let cols = Math.ceil( (right - left) / sizeMeter );
    let rows = Math.ceil( (top - bottom) / sizeMeter );
    // console.log(JSON.stringify({left, bottom, right, top, size,
    //   zoom, res: resolutions[zoom], sizeMeter, rows, cols, }));
    const tiles = [];
    const width = (extent[2] - extent[0])/cols;
    const height = (extent[3] - extent[1])/rows;
    const widthPx = Math.round((right - left) / (cols * resolutions[zoom]));
    const heightPx = Math.round((top - bottom) / (rows * resolutions[zoom]));
    // console.log(width, height);
    for (let i = 0; i < rows; i++) {
      tiles[i] = []
      for (let j = 0; j < cols; j++) {
        let tile = {
          row: i,
          col: j,
          center: [
            extent[0] + (width * j) + width/2,
            extent[3] - ((height * i) + height/2)
          ],
          extent: [
            extent[0] + (width * j),
            extent[3] - ((height * i) + height),
            extent[0] + (width * j) + width,
            extent[3] - (height * i)
          ],
          widthPx, heightPx
        };
        tiles[i][j] = tile;
        let markers = this.getMarkers(tile.extent);
        if (markers) tile.markers = markers;
        let paths = this.getPaths(tile.extent);
        if (paths) tile.paths = paths;
      }
    }
    return tiles;
  }

  getMarkers () {
    return false;
  }

  getPaths (extent) {
    if(!this.lines) return [];
    const paths = this.lines.map(line => {
      const clipped = bboxClip(line, extent);
      if (clipped.geometry.coordinates.length > 0) {
        console.log('got clipped line');
        // return clipped.geometry.coordinates.map(point => {
        //   return point[1] + ',' + point[0];
        // }).join('|');
        // as generally array of coordinates is big
        // encode with
        // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
        return gPolyline.encode((clipped.geometry.coordinates));
      } else {
        return false;
      }
    }).filter(path => path);
    return paths;
  }
}

module.exports = {LargeMap};
