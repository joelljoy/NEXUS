const express  = require('express');
const cors     = require('cors');
const fetch    = require('node-fetch');
require('dotenv').config();

const app  = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check.
app.get('/', (req, res) => {
  res.json({ status: 'NEXUS proxy running', port: PORT });
});

// Claude API proxy
app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY not set. Please check your .env file.'
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':        'application/json',
        'x-api-key':           apiKey,
        'anthropic-version':   '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: 'Failed to reach Anthropic API', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅  NEXUS proxy server running at http://localhost:${PORT}`);
  console.log(`    Claude API key: ${process.env.ANTHROPIC_API_KEY ? '✓ loaded' : '✗ NOT SET — check .env'}\n`);
});
