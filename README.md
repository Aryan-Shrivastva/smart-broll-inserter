# Smart B-Roll Inserter

An intelligent system that automatically plans how B-roll clips should be inserted into an A-roll (talking-head / UGC) video using semantic matching and AI-powered transcription.

## Overview

This system analyzes an A-roll video (person speaking to camera) and multiple B-roll clips, then automatically determines:
- **When** to insert B-roll clips (timestamps)
- **Which** B-roll clip to use at each moment
- **Why** that clip was chosen (semantic reasoning)

The system uses OpenAI's Whisper API for transcription and embeddings for semantic matching to create intelligent, context-aware B-roll insertion plans.

## Features

- **A-Roll Understanding**: Extracts transcript with sentence-level timestamps using OpenAI Whisper
- **B-Roll Understanding**: Uses metadata descriptions to understand B-roll content
- **Semantic Matching**: Uses cosine similarity on embeddings to match A-roll segments with B-roll clips
- **Intelligent Planning**: Avoids over-insertion, respects timing gaps, and prefers high-value moments
- **React Frontend**: Simple UI to trigger plan generation and view results
- **RESTful API**: Clean backend API that returns structured JSON timeline plans

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **OpenAI API Key** (with billing enabled)
  - Sign up at https://platform.openai.com
  - Add payment method (required even for free credits)
  - Get your API key from https://platform.openai.com/api-keys

## Project Structure

```
smart-broll-inserter/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express server and API endpoints
│   │   ├── services/
│   │   │   ├── openaiService.js   # OpenAI API integration (transcription, embeddings)
│   │   │   └── matchingService.js # Semantic matching logic
│   │   └── utils/
│   │       └── videoDownloader.js # Video download utility
│   ├── package.json
│   └── .env                       # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main React component
│   │   └── App.css                # Styles
│   └── package.json
├── examples/
│   └── sample_plan.json           # Sample output JSON plan
├── video_url.json                 # Video URLs and metadata
└── README.md
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smart-broll-inserter
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
# Copy the template below and add your OpenAI API key
```

Create `backend/.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
PORT=4000
```

**Important**: Replace `sk-your-openai-api-key-here` with your actual OpenAI API key.

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

### 4. Configure Video URLs

The `video_url.json` file in the project root contains the A-roll and B-roll URLs. This file is already configured with sample videos. You can modify it if needed.

## Running the Project

### Start Backend Server

```bash
# From backend directory
cd backend
npm run dev
```

The backend will start on `http://localhost:4000`

You should see:
```
Backend server listening on http://localhost:4000
```

### Start Frontend (in a new terminal)

```bash
# From frontend directory
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy)

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Access the Application

1. Open your browser and go to `http://localhost:5173`
2. Click the **"Generate Plan"** button
3. Wait 10-20 seconds for processing (video download + transcription + matching)
4. View the results:
   - Video duration
   - Transcript with timestamps
   - B-roll insertions with timing and reasoning

## API Endpoints

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### `POST /api/plan`

Generates a B-roll insertion plan.

**Request Body:** (optional - reads from `video_url.json` if empty)
```json
{}
```

Or provide video URLs directly:
```json
{
  "a_roll": {
    "url": "https://...",
    "metadata": "..."
  },
  "b_rolls": [
    {
      "id": "broll_1",
      "metadata": "...",
      "url": "https://..."
    }
  ]
}
```

**Response:**
```json
{
  "aroll_duration_sec": 40.5,
  "transcript_segments": [
    {
      "start_sec": 0.0,
      "end_sec": 4.2,
      "text": "Transcript text here..."
    }
  ],
  "insertions": [
    {
      "start_sec": 13.0,
      "duration_sec": 2.5,
      "broll_id": "broll_1",
      "confidence": 0.28,
      "reason": "Semantic match: Mumbai street food context..."
    }
  ]
}
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `PORT` | Backend server port (default: 4000) | No |

## Sample Output

When you click "Generate Plan", you'll see:

1. **Video Info**: Duration of the A-roll video
2. **Transcript**: All speech segments with timestamps
3. **B-Roll Insertions**: 3-6 planned insertions, each showing:
   - Start time and duration
   - Which B-roll clip to use
   - Confidence score
   - Reasoning for the match

Example insertion:
- **Time**: `0:13.0` (duration: `2.5s`)
- **B-Roll**: `broll_1`
- **Confidence**: `28.2%`
- **Reason**: "Semantic match: Mumbai street food context shot..."

**Note**: See `examples/sample_plan.json` for a complete example of the JSON output format.

## Technologies Used

- **Backend**:
  - Node.js + Express
  - OpenAI API (Whisper for transcription, Embeddings for semantic matching)
  - Fetch API (for downloading videos)

- **Frontend**:
  - React
  - Vite (build tool)

## How It Works

1. **Video Download**: Downloads A-roll video from URL
2. **Transcription**: Uses OpenAI Whisper to extract speech with timestamps
3. **Embedding Generation**: Creates embeddings for:
   - Each transcript segment
   - Each B-roll metadata description
4. **Semantic Matching**: Uses cosine similarity to find best B-roll matches
5. **Planning**: Applies rules to:
   - Avoid over-insertion (minimum gaps)
   - Respect timing constraints
   - Prefer high-confidence matches
6. **Output**: Returns structured JSON plan with all insertions

## Troubleshooting

### Backend won't start
- Check if port 4000 is already in use: `netstat -ano | findstr :4000`
- Kill the process or change PORT in `.env`

### Frontend can't connect to backend
- Ensure backend is running on `http://localhost:4000`
- Check browser console for CORS errors
- Verify the API URL in `frontend/src/App.jsx` matches your backend port

### No insertions showing
- Check backend terminal logs for errors
- Verify `video_url.json` has valid URLs

## License

This project is created for assignment purposes.
