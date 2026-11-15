module.exports = {
  '/api': {
    target: 'http://localhost:8080',
    pathRewrite: { '^/api': '' },
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (error, _request, response) => {
        console.error('Backend proxy connection failed:', error.message);
        if ('writeHead' in response && !response.headersSent) {
          response.writeHead(503, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ message: 'Backend indisponivel.' }));
        }
      });
    },
  },
};
