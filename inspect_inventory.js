const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/strapi/products/inventory?includeItems=true&pagination[pageSize]=1',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2).substring(0, 1500));
  });
});
req.end();
