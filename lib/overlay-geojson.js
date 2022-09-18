const fs = require('fs').promises;
const clone = require('clone');
const proj4 = require('proj4');
const GeoJsonGeometries = require('geojson-geometries');
const bboxClip = require('@turf/bbox-clip').default;
const {resolutions} = require('./mercator-resolutions.js');
const { createCanvas, loadImage, Image } = require("canvas");
const jsonfile = require('jsonfile');
const reproject = require('reproject-spherical-mercator');


async function overlay (imgData, imgLeftTop, geojson, zoom, scale=1) {
  let points, lines, polygons;
  if (geojson) {
    const jsonGeometries = new GeoJsonGeometries(geojson);
    points = jsonGeometries.points.features;
    lines = jsonGeometries.lines.features;
    polygons = jsonGeometries.polygons.features;
  }
  //const canvas = createCanvas(4456, 4800);
  //const img = new Image();
  //img.src = imgData;
  const img = await loadImage(imgData);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // ctx.fillStyle = 'rgb(200, 0, 0)';
  // ctx.fillRect(10, 10, 50, 50);

  // ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
  // ctx.fillRect(30, 30, 50, 50);

  // ctx.strokeStyle = 'rgb(200, 0, 0)';
  // ctx.lineWidth = 5;
  // ctx.lineCap = 'round';
  // ctx.lineJoin = 'round';
  // ctx.beginPath();
  // ctx.moveTo(200, 200);
  // ctx.lineTo(400, 200);
  // ctx.lineTo(400, 400);
  // ctx.lineTo(800, 800);
  // ctx.stroke();
  console.log('lines: ' + lines.length);
  drawLines(ctx, lines, imgLeftTop, zoom, scale);
  console.log('points: ' + points.length);
  //if (points.length > 0)
    //await drawPoints(ctx, points, imgLeftTop, zoom, scale);
    await drawLabels(ctx, points, imgLeftTop, zoom, scale);
  const mergedImgBuf = canvas.toBuffer("image/jpeg");
  return mergedImgBuf;
}

function drawLines (ctx, lines, imgLeftTop, zoom, scale) {
  const imgLines = reprojectToImageCoordLines(lines, imgLeftTop, zoom, scale);
  imgLines.forEach(line => {
    //console.log(JSON.stringify(line));
    ctx.beginPath();
    line.geometry.coordinates.forEach(([x,y], i) => {
      // full map
      // ctx.strokeStyle = line.properties.strokeStyle || 'red';
      //ctx.strokeStyle = line.properties.drawOrder % 2 === 0 ? 'red' : 'green';
      // key map
      ctx.lineWidth = line.properties.lineWidth || 1;
      ctx.strokeStyle = 'green'
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

async function drawPoints (ctx, points, imgLeftTop, zoom, scale) {
  const imgPoints = reprojectToImageCoordPoints(points, imgLeftTop, zoom, scale);
  for (const point of imgPoints) {
    //console.log(JSON.stringify(point));
    const [x, y] = point.geometry.coordinates;
    let markerImg, xpos, ypos, width, height;
    if (point.properties.Size === 'big') {
      markerImg = await loadImage("/home/gaganb/projects/dev-repos/google-maps-large-size-image/example/marker-red-location.png");
      width = markerImg.width * 1.5;
      height = markerImg.height * 1.5;
    } else {
      markerImg = await loadImage("/home/gaganb/projects/dev-repos/google-maps-large-size-image/example/marker-yellow-location.png");
      width = markerImg.width;
      height = markerImg.height;
    }
    xpos = x - width/2;
    ypos = y - height;
    ctx.drawImage(markerImg, xpos, ypos, width, height);
  }
}

async function drawLabels (ctx, points, imgLeftTop, zoom, scale) {
  const imgPoints = reprojectToImageCoordPoints(points, imgLeftTop, zoom, scale);
  for (const point of imgPoints) {
    if (point.properties.endPoint) {
      const [x, y] = point.geometry.coordinates;
      xpos = x;
      ypos = y;
      // full map
      // ctx.font="30px verdana";
      // ctx.shadowColor="white";
      // ctx.shadowBlur=1;
      // ctx.lineWidth=2;
      // ctx.strokeStyle = 'white';
      // ctx.strokeText(point.properties.Name, xpos, ypos);
      // ctx.shadowBlur=0;
      // ctx.fillStyle="black";
      // ctx.fillText(point.properties.Name, xpos, ypos);
      // key map
      ctx.font="18px verdana";
      ctx.shadowColor="white";
      ctx.shadowBlur=1;
      ctx.lineWidth=2;
      ctx.strokeStyle = 'white';
      ctx.strokeText(point.properties.Name, xpos, ypos);
      ctx.shadowBlur=0;
      ctx.fillStyle="black";
      ctx.fillText(point.properties.Name, xpos, ypos);
    }
  }
}

function reprojectToImageCoordLines (lines, imgLeftTop, zoom, scale) {
  const projectedTopLeft = reproject({
    type: 'Point',
    coordinates: imgLeftTop
  }).coordinates;
  const projLines = lines.map(reproject);
  // raster is iamge of full projection imgLeftTop
  // where's origin is bottom left
  const [rLeft, rTop] = rasterCoord([projectedTopLeft[0], projectedTopLeft[1]], zoom);
  const imagePoints = projLines.map(line => {
    const ln = clone(line);
    ln.geometry.coordinates = ln.geometry.coordinates.map(coord => {
      const [x,y] = rasterCoord(coord, zoom);
      return [(x  - rLeft) * scale, (rTop - y) * scale];
    });
    return ln;
  });
  //console.log('imagePoints: ' + JSON.stringify(imagePoints));
  return imagePoints;
}
function reprojectToImageCoordPoints (points, imgLeftTop, zoom, scale) {
  const projectedTopLeft = reproject({
    type: 'Point',
    coordinates: imgLeftTop
  }).coordinates;
  const projPoints = points.map(reproject);
  // raster is iamge of full projection imgLeftTop
  // where's origin is bottom left
  const [rLeft, rTop] = rasterCoord([projectedTopLeft[0], projectedTopLeft[1]], zoom);
  const imagePoints = projPoints.map(point => {
    // console.log('raster points; ', JSON.stringify(point));
    const pt = clone(point);
    const [x, y]  = rasterCoord(pt.geometry.coordinates, zoom);
    pt.geometry.coordinates = [(x  - rLeft) * scale, (rTop - y) * scale];
    // console.log('image point: ', JSON.stringify(pt));
    return pt;
  });
  return imagePoints;
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
  // const geojson = jsonfile.readFileSync(process.cwd() +'/example/sample.geojson');
  const extent = [72.26781446239357, 18.43155039596023, 78.82548089336265, 31.18254450289976];
  const imgData = await fs.readFile("/home/gaganb/projects/hesco/cycle-march/raw-maps/full-base-map-9.jpg");
  const geojson = jsonfile.readFileSync("/home/gaganb/projects/hesco/cycle-march/route-data-2/route-lines.geojson");
  const imgLeftTop = [72.26781446239357, 31.18254450289976];
  const zoom = 9;
  const scale = 1;
  const mergedImgBuf = await overlay(imgData, imgLeftTop, geojson, zoom, scale);
  try {
    await fs.writeFile("/home/gaganb/projects/hesco/cycle-march/raw-maps/full-base-map-9-with-route.jpg", mergedImgBuf);
    console.log('Done!');
  } catch (error) {
    console.error(error);
  }
})();
*/
