const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/strapi/products/inventory?pagination[pageSize]=1',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
    } catch (e) {
      console.error("Failed to parse", e);
    }
  });
});
req.end();
