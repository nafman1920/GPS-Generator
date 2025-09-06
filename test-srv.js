// test-srv.js
const dns = require('dns').promises;

(async () => {
  try {
    const records = await dns.resolveSrv('_mongodb._tcp.cluster0.tt3gbpy.mongodb.net');
    console.log('SRV Records:', records);
  } catch (error) {
    console.error('Failed to resolve SRV:', error);
  }
})();
