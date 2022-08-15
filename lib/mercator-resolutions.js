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

module.exports = resolutions;

