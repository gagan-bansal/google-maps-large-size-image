const SphericalMercator = require('@mapbox/sphericalmercator');
const sm = new SphericalMercator();
const proj4 = require('proj4');
const extent = {
  left: -20037508.342789244,
  right: 20037508.342789244,
  bottom: -20037508.342789244,
  top: 20037508.342789244
};
const mapTileSize = 256; // map tile size
var resolutions = [];
for (var i=0; i< 24; i++) {
  resolutions.push( (extent.right - extent.left) / (mapTileSize * Math.pow(2,i)) );
}

function getTiles (extent, zoom, size=640) {
  const [left, bottom] = proj4('EPSG:4326', 'EPSG:3857', extent.slice(0,2));
  const [right, top] = proj4('EPSG:4326', 'EPSG:3857', extent.slice(2,4));
  // height/width devided by your tile size in meters 
  const sizeMeter = size * resolutions[zoom];
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
  for (i = 0; i < rows; i++) {
    tiles[i] = []
    for (j = 0; j < cols; j++) {
      let tile = {
        row: i,
        col: j,
        center: [
          extent[0] + (width * j) + width/2,
          extent[3] - ((height * i) + height/2)
        ],
        widthPx, heightPx
      };
      tiles[i][j] = tile;
    }
  }
  return tiles;
}

module.exports = getTiles;
