import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import multer from "multer";
import { downloadVideo } from "./utils/videoDownloader.js";
import { transcribeVideo, getEmbeddings } from "./services/openaiService.js";
import { planInsertions } from "./services/matchingService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors());

// Configure Multer for file uploads (stored in memory)
const upload = multer({ storage: multer.memoryStorage() });

//pipeline(includes transcribe, generate embeddings, plan insertions)
// Shared helper to generate a plan from an A-roll buffer and B-roll metadata
async function generatePlanFromArollBuffer(arollBuffer, b_rolls) {
  //Transcribe A-roll video
  console.log("\n[Step 2/5] Transcribing A-roll video with OpenAI Whisper...");
  const transcriptResult = await transcribeVideo(arollBuffer, "a_roll.mp4");

  if (!transcriptResult.segments || transcriptResult.segments.length === 0) {
    throw new Error("Transcription returned no segments.");
  }

  console.log(`Transcribed ${transcriptResult.segments.length} segments`);

  //Generate embeddings for transcript segments
  console.log("\n[Step 3/5] Generating embeddings for transcript segments...");
  const segmentTexts = transcriptResult.segments.map((seg) => seg.text);
  const segmentEmbeddings = await getEmbeddings(segmentTexts);

  // Attach embeddings to segments
  const segmentsWithEmbeddings = transcriptResult.segments.map((seg, idx) => ({
    ...seg,
    embedding: segmentEmbeddings[idx],
  }));

  //Generate embeddings for B-roll metadata
  console.log("\n[Step 4/5] Generating embeddings for B-roll metadata...");
  const brollMetadataTexts = b_rolls.map((broll) => broll.metadata || "");
  const brollEmbeddings = await getEmbeddings(brollMetadataTexts);

  // Create B-roll objects with embeddings
  const brollEmbeddingObjects = b_rolls.map((broll, idx) => ({
    id: broll.id,
    metadata: broll.metadata,
    embedding: brollEmbeddings[idx],
  }));

  //Plan insertions using semantic matching
  console.log("\n[Step 5/5] Planning B-roll insertions using semantic matching...");
  const insertions = planInsertions(
    segmentsWithEmbeddings,
    brollEmbeddingObjects,
    transcriptResult.duration_sec,
    {
      minInsertionGap: 3, // More frequent insertions
      minInsertionDuration: 2,
      maxInsertionDuration: 4,
      minConfidence: 0.08,
      maxInsertions: 4,
      avoidFirstSeconds: 0.5, // Allow very early insertions
      avoidLastSeconds: 1,
    }
  );

  console.log(`Planned ${insertions.length} B-roll insertions`);

  return {
    aroll_duration_sec: transcriptResult.duration_sec,
    transcript_segments: transcriptResult.segments.map((seg) => ({
      start_sec: seg.start_sec,
      end_sec: seg.end_sec,
      text: seg.text,
    })),
    insertions,
  };
}


app.get('/', (req, res) => {
  res.send('Smart B-Roll Inserter API. Try /api/health');
});

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /api/plan
 * Reads video_url.json, downloads videos, transcribes A-roll, and generates B-roll insertion plan.
 *
 * Optionally accepts a JSON body with video URLs, otherwise reads from video_url.json file.
 */
app.post("/api/plan", async (req, res) => {
  try {
    let videoConfig;

    // Checks if video URLs are provided in request body
    if (req.body && req.body.a_roll) {
      videoConfig = req.body;
    } else {
      // Read from video_url.json file
      const videoUrlPath = join(__dirname, "../../video_url.json");
      if (!fs.existsSync(videoUrlPath)) {
        return res.status(400).json({
          error:
            "video_url.json not found. Please provide video URLs in request body or create video_url.json file.",
        });
      }
      const videoUrlContent = fs.readFileSync(videoUrlPath, "utf-8");
      videoConfig = JSON.parse(videoUrlContent);
    }

    const { a_roll, b_rolls } = videoConfig;

    if (!a_roll || !a_roll.url) {
      return res.status(400).json({ error: "A-roll URL is required." });
    }

    if (!b_rolls || !Array.isArray(b_rolls) || b_rolls.length === 0) {
      return res.status(400).json({ error: "At least one B-roll is required." });
    }

    console.log("Starting plan generation (URL-based)...");
    console.log(`A-roll URL: ${a_roll.url}`);
    console.log(`B-rolls: ${b_rolls.length} clips`);

    // Step 1: Download A-roll video
    console.log("\n[Step 1/5] Downloading A-roll video...");
    const arollBuffer = await downloadVideo(a_roll.url);

    const response = await generatePlanFromArollBuffer(arollBuffer, b_rolls);

    res.json(response);
  } catch (err) {
    console.error("Plan generation error:", err);
    res.status(500).json({
      error: "Failed to generate plan.",
      details: err.message,
    });
  }
});

/**
 * POST /api/plan/upload
 * Accepts uploaded A-roll and optional B-roll clips, uses A-roll file instead of URL.
 * For this assignment, B-roll video content is not analyzed directly; we still rely on metadata
 * from video_url.json (or provided config) for semantic matching.
 */
app.post(
  "/api/plan/upload",
  upload.fields([
    { name: "aroll", maxCount: 1 },
    { name: "brolls", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const arollFile = req.files?.aroll?.[0];
      const brollFiles = req.files?.brolls || [];

      if (!arollFile) {
        return res
          .status(400)
          .json({ error: "A-roll video file (field 'aroll') is required." });
      }

      const videoUrlPath = join(__dirname, "../../video_url.json");
      if (!fs.existsSync(videoUrlPath)) {
        return res.status(400).json({
          error:
            "video_url.json not found. Please create video_url.json file with B-roll metadata.",
        });
      }
      const videoUrlContent = fs.readFileSync(videoUrlPath, "utf-8");
      const videoConfig = JSON.parse(videoUrlContent);
      const { b_rolls } = videoConfig;

      if (!b_rolls || !Array.isArray(b_rolls) || b_rolls.length === 0) {
        return res.status(400).json({ error: "At least one B-roll is required." });
      }

      console.log("Starting plan generation (file upload)...");
      console.log(`Uploaded A-roll file: ${arollFile.originalname}`);
      console.log(`Uploaded B-roll files: ${brollFiles.length}`);

      const arollBuffer = arollFile.buffer;

      const response = await generatePlanFromArollBuffer(arollBuffer, b_rolls);

      res.json(response);
    } catch (err) {
      console.error("Plan generation error (upload):", err);
      res.status(500).json({
        error: "Failed to generate plan from uploaded files.",
        details: err.message,
      });
    }
  }
);

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});


