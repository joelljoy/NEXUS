# NEXUS — Life Orchestration Engine

India's AI-powered life orchestration system. Built with React + Vite (frontend) and an Express proxy server (backend) to securely call the Anthropic Claude API.

--

## Folder Structure

```
nexus-app/
├── client/                  ← React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx          ← Main application (all UI + logic)
│   │   └── main.jsx         ← React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                  ← Express proxy (Claude API)
│   ├── server.js            ← Proxy server
│   ├── .env.example         ← Copy this to .env and add your key
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure you have these installed:
- **Node.js** v18 or higher → https://nodejs.org
- **npm** (comes with Node.js)

---

## Setup — Step by Step

### Step 1 — Get your Anthropic API key

1. Go to https://console.anthropic.com/api-keys
2. Sign in or create an account
3. Click **Create Key** and copy it (starts with `sk-ant-...`)

---

### Step 2 — Set up the proxy server

Open a terminal and run:

```bash
cd nexus-app/server
npm install
```

Then create your `.env` file:

```bash
# On Mac/Linux:
cp .env.example .env

# On Windows:
copy .env.example .env
```

Open `.env` and replace the placeholder with your real API key:

```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Start the proxy server:

```bash
npm start
```

You should see:
```
✅  NEXUS proxy server running at http://localhost:3001
    Claude API key: ✓ loaded
```

**Keep this terminal open.**

---

### Step 3 — Set up the React frontend

Open a **second terminal** and run:

```bash
cd nexus-app/client
npm install
npm run dev
```

The app will open automatically at **http://localhost:5173**

---

## Running the app

Every time you want to run NEXUS, you need **two terminals open**:

| Terminal | Command | What it does |
|----------|---------|--------------|
| Terminal 1 | `cd server && npm start` | Runs the Claude API proxy on port 3001 |
| Terminal 2 | `cd client && npm run dev` | Runs the React app on port 5173 |

---

## Without the proxy server

If you just want to see the UI without live Claude responses, you can run only the client. The app will automatically fall back to pre-built task trees for each life event — everything else (auth, domain setup, consent flow, execution, profile) works exactly the same.

---

## Security Note

- Never commit your `.env` file to Git — it's already in `.gitignore`
- Your API key stays on the server side and is never exposed to the browser
