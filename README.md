# 🛣️ AI Road Condition Detector

AI-powered road condition detection and reporting system. Upload road images, detect potholes/bumps/cracks, plan safe routes, and view community reports on an interactive map.

## 🏗️ Architecture

```
├── client/        → React + Vite + Tailwind CSS (Frontend)
├── server/        → Node.js + Express + MongoDB (Backend API)
└── ai-service/    → Python Flask (AI Detection Microservice)
```

## ⚡ Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.9+
- **MongoDB** (local or Atlas connection string)

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install

# AI Service
cd ../ai-service
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `server/.env`:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/road-condition-detector
JWT_SECRET=your_super_secret_key
AI_SERVICE_URL=http://localhost:5000
```

### 3. Start All Services

Open **3 terminals**:

```bash
# Terminal 1: Backend API
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev

# Terminal 3: AI Service
cd ai-service
python app.py
```

### 4. Open App

Navigate to **http://localhost:5173** in your browser.

## 🔥 Features

| Feature | Description |
|---------|-------------|
| 📸 **AI Detection** | Upload road images → detect potholes, bumps, cracks with confidence scores |
| 📍 **Smart Mapping** | Interactive map with clustered markers, heatmap, and issue popups |
| 🗺️ **Route Planner** | Enter source/destination → get safety score and hazard warnings |
| 👤 **User System** | JWT auth with login/register, user contributions tracking |
| 📊 **Dashboard** | Analytics charts, severity breakdown, top contributors |
| 🌙 **Dark Mode** | Full dark mode support across all pages |
| 📱 **Responsive** | Mobile-first design with glassmorphism UI |
| ⚡ **Real-time** | WebSocket updates for new issue reports |

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → get JWT token |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/upload` | Upload image + AI detection |
| GET | `/api/issues` | Fetch all road issues |
| PUT | `/api/issues/:id/upvote` | Upvote/confirm an issue |
| POST | `/api/route-analysis` | Analyze route for hazards |
| GET | `/api/stats` | Dashboard statistics |

## 🤖 Using a Real AI Model

The AI service uses simulated detection by default. To use a real YOLOv8 model:

1. Install ultralytics: `pip install ultralytics torch`
2. Place your trained `best.pt` model in `ai-service/models/`
3. Uncomment the real detection code in `ai-service/app.py`

## 📦 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Leaflet, Recharts, Framer Motion
- **Backend**: Express.js, Mongoose, JWT, Socket.IO, Multer
- **AI**: Python Flask, Pillow (YOLOv8-ready)
- **Maps**: Leaflet + OpenStreetMap (free, no API key)
- **Routing**: OSRM (free routing engine)
