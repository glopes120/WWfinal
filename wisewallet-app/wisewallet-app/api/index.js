// Simple API placeholder for deployment
// Add your server-side endpoints here (e.g., POST /api/whatever)

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = 200
  res.end(JSON.stringify({ success: true, message: 'API root' }))
}
import app from '../server.js';

// Esta é a "ponte" que liga o Vercel ao teu server.js
export default app;