# Hyperzod Dashboard

A modern React dashboard for managing and monitoring Hyperzod merchants (chefs). Built with Vite, React, TypeScript, and Tailwind CSS.

## Features

- 📊 **Real-time Stats**: View total chefs, published/unpublished status, and online merchants
- 🔍 **Search & Filter**: Search by name or city, filter by publication status
- 📱 **Responsive Design**: Beautiful UI that works on all devices
- ⚡ **Fast Performance**: Built with Vite for lightning-fast development and builds

## Project Structure

```
hyperzod-dashboard/
├── client/          # React frontend (Vite + TypeScript)
└── server/          # Express backend (API proxy)
```

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Hyperzod API credentials

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Add your Hyperzod credentials to `.env`:
   ```
   HYPERZOD_API_KEY=your_api_key_here
   HYPERZOD_TENANT_ID=3331
   HYPERZOD_BASE_URL=https://api.hyperzod.app
   PORT=3001
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5174` (or the port shown in terminal)

## Usage

1. **Start the backend**: The Express server must be running on port 3001
2. **Start the frontend**: The Vite dev server will proxy API requests to the backend
3. **View the dashboard**: Open your browser and explore the chef statistics and directory

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Express** - Web server
- **Node.js** - Runtime
- **CORS** - Cross-origin support

## API Endpoints

- `GET /api/merchants` - Fetch all merchants with stats

## Development

The dashboard automatically refreshes data and provides loading states. The Tailwind CSS warnings in the IDE are expected and don't affect functionality.

## License

MIT
