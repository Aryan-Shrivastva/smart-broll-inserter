import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors());

// Configure Multer for file uploads (stored in memory for now)
const upload = multer({ storage: multer.memoryStorage() });

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /api/plan
 * For now: accepts A-roll + B-roll uploads and returns a dummy plan.
 * Later: we'll plug in OpenAI and real matching logic here.
 *
 * Expected form-data:
 * - aroll: single video file
 * - brolls: multiple video files
 */
app.post(
  "/api/plan",
  upload.fields([
    { name: "aroll", maxCount: 1 },
    { name: "brolls", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const arollFile = req.files?.aroll?.[0];
      const brollFiles = req.files?.brolls || [];

      if (!arollFile) {
        return res
          .status(400)
          .json({ error: "A-roll video (field 'aroll') is required." });
      }

      // For now, we just simulate a short A-roll and dummy insertions.
      // In the next steps we will:
      // 1) Use OpenAI to get a transcript with timestamps
      // 2) Describe B-rolls
      // 3) Do semantic matching for real insertions

      const dummyTranscript = [
        {
          start_sec: 0.0,
          end_sec: 10.0,
          text: "Intro and hook about the product."
        },
        {
          start_sec: 10.0,
          end_sec: 20.0,
          text: "Explaining how the product works."
        },
        {
          start_sec: 20.0,
          end_sec: 30.0,
          text: "Talking about using the product in real life."
        }
      ];

      const dummyInsertions = [
        {
          start_sec: 5.0,
          duration_sec: 3.0,
          broll_id: brollFiles[0]?.originalname || "broll_01",
          confidence: 0.7,
          reason: "Early mention of product, good time for product close-up."
        },
        {
          start_sec: 22.0,
          duration_sec: 4.0,
          broll_id: brollFiles[1]?.originalname || "broll_02",
          confidence: 0.8,
          reason: "Describing real-life usage, good time for lifestyle footage."
        }
      ];

      const response = {
        aroll_duration_sec: 30.0,
        transcript_segments: dummyTranscript,
        insertions: dummyInsertions
      };

      res.json(response);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate plan." });
    }
  }
);

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});


