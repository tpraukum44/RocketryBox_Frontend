const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rocketrybox-frontend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: port,
    uptime: process.uptime()
  });
});

// Health check alternative (for static file)
app.get('/health.json', (req, res) => {
  const healthPath = path.join(__dirname, 'dist', 'health.json');
  if (fs.existsSync(healthPath)) {
    res.sendFile(healthPath);
  } else {
    res.json({
      status: 'healthy',
      service: 'rocketrybox-frontend',
      timestamp: new Date().toISOString()
    });
  }
});

// Handle React Router (serve index.html for all non-API routes)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Please run npm run build first.');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'dist')}`);
  console.log(`💚 Health check available at: http://0.0.0.0:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
}); 