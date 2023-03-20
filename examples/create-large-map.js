
const fs = require('fs').promises;
const path = require('path');
//const {LargeMap} = require('google-maps-large-size-image');
const {LargeMap} = require('../lib/index.js');
require('dotenv').config();

// initiate the LargeMap instance
const lm = new LargeMap(process.env.GOOGLE_MAPS_API_KEY, {
  scale: 2,
  maptype: 'terrain',
  region: 'in',
  style: 'feature:road|color:yellow'
});

(async () => {
  const extent = [72.61, 18.76, 75.28, 21.62];
  const zoom = 10;
  try {
    const img = await lm.getImage(extent, zoom);
    await fs.writeFile(path.join(process.cwd(), '/output.jpg'), img);
  } catch (err) {
    console.error(err);
  }
  console.log('done!');
})();

