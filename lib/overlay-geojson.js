const fs = require('fs').promises;
const clone = require('clone');
const proj4 = require('proj4');
const GeoJsonGeometries = require('geojson-geometries');
const bboxClip = require('@turf/bbox-clip').default;
const resolutions = require('./mercator-resolutions.js');
const { createCanvas, loadImage, Image } = require("canvas");
const jsonfile = require('jsonfile');
const reproject = require('reproject-spherical-mercator');
/*
const geojson = jsonfile.readFileSync('/home/gaganb/projects/hesco/cycle-march/route-data/route-lines.json');
const _geojson = {
  type: 'Feature',
  properties: {strokeColor: 'red'},
  geometry: {
    type: 'LineString',
    coordinates: [[73.1132457345686, 19.338482209430968],
      [73.51127455310274, 19.68993883301516],
      [73.80885269490607, 20.007829091063925]
    ]
  }
};
const extent = [72.36463695078561, 18.31764088122601, 75.42468356327633, 21.465533039190728];
const imgTopLeft = [72.36463695078561, 21.465533039190728];
const zoom = 11;
*/

async function overlay (imgData, imgTopLeft, geojson, zoom, scale=1) {
debugger
  let points, lines, polygons;
  if (geojson) {
    const jsonGeometries = new GeoJsonGeometries(geojson);
    points = jsonGeometries.points.fetures;
    lines = jsonGeometries.lines.features;
    polygons = jsonGeometries.polygons.features;
  }
  //const image = await loadImage(process.cwd() + "/combined.jpg");
  //const imgData = await fs.readFile(process.cwd() + "/combined.jpg");
  //const canvas = createCanvas(4456, 4800);
  //const img = new Image();
  //img.src = imgData;
  const img = await loadImage(imgData);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  ctx.fillStyle = 'rgb(200, 0, 0)';
  ctx.fillRect(10, 10, 50, 50);

  ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
  ctx.fillRect(30, 30, 50, 50);

  ctx.strokeStyle = 'rgb(200, 0, 0)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // ctx.beginPath();
  // ctx.moveTo(200, 200);
  // ctx.lineTo(400, 200);
  // ctx.lineTo(400, 400);
  // ctx.lineTo(800, 800);
  // ctx.stroke();
  drawPaths(ctx, lines, imgTopLeft, zoom, scale);
  const mergedImgBuf = canvas.toBuffer("image/jpeg");
  return mergedImgBuf;
  /*
  try {
    await fs.writeFile(process.cwd() + "/merged-image.jpg", mergedImgBuf);
    console.log('Done!');
  } catch (error) {
    console.error(error);
  }
  */
}

function drawPaths (ctx, lines, imgTopLeft, zoom, scale) {
  const imgLines = reprojectToImageCoord(lines, imgTopLeft, zoom, scale);
  imgLines.forEach(line => {
    //console.log(JSON.stringify(line));
    ctx.beginPath();
    line.geometry.coordinates.forEach(([x,y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function reprojectToImageCoord (lines, imgTopLeft, zoom, scale) {
  const projTopLeft = reproject({
    type: 'Point',
    coordinates: imgTopLeft
  }).coordinates;
  const projLines = lines.map(reproject);
  // raster is iamge of full projection imgTopLeft
  // where's origin is bottom left
  const [rLeft, rTop] = rasterCoord([projTopLeft[0], projTopLeft[1]], zoom);
  const imageLines = projLines.map(line => {
    const ln = clone(line);
    ln.geometry.coordinates = ln.geometry.coordinates.map(coord => {
      const [x,y] = rasterCoord(coord, zoom);
      return [(x  - rLeft) * scale, (rTop - y) * scale];
    });
    return ln;
  });
  //console.log('imageLines: ' + JSON.stringify(imageLines));
  return imageLines;
}

function rasterCoord (coord, zoom) {
  return [
    coord[0] / resolutions[zoom],
    coord[1] / resolutions[zoom]
  ];
}
module.exports = overlay;
/*
(async () => {
  overlay();
})();
*/
