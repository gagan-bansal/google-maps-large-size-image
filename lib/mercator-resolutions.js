const mercatorExtent = {
  left: -20037508.342789244,
  right: 20037508.342789244,
  bottom: -20037508.342789244,
  top: 20037508.342789244
};
const mapTileSize = 256; // map tile size
const resolutions = [];
for (var i=0; i< 24; i++) {
  resolutions.push( (mercatorExtent.right - mercatorExtent.left) /
    (mapTileSize * Math.pow(2,i)) );
}

function reprojectToImageCoord (coord, imgTopLeft, zoom, scale) {
  // cal image top left in raster coordinates
  const [rLeft, rTop] = rasterCoord([coord[0], coord[1]], zoom);
  return [(coord[0] - rLeft) * scale, (rTop - coord[1]) * scale];
}

function rasterCoord (coord, zoom) {
  return [
    coord[0] / resolutions[zoom],
    coord[1] / resolutions[zoom]
  ];
}

module.exports = {
  resolutions,
  reprojectToImageCoord,
  rasterCoord
}
