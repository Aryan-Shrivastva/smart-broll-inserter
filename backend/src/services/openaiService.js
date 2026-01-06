import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe A-roll video using OpenAI Whisper API
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} filename - Original filename (for file extension)
 * @returns {Promise<Object>} Transcript with segments and timestamps
 */
export async function transcribeVideo(videoBuffer, filename = "video.mp4") {
  let tempFilePath = null;
  try {
    // Create a temporary file for OpenAI API
    // OpenAI SDK requires a File object, which works best with an actual file
    tempFilePath = join(__dirname, "../../temp_video.mp4");
    fs.writeFileSync(tempFilePath, videoBuffer);

    console.log("Calling OpenAI Whisper API for transcription...");

    // Create a File object from Buffer (Node.js 18+ supports File API)
    // If File API is not available, we'll use the temp file path approach
    let file;
    try {
      // Try to create File from Buffer (Node.js 18+)
      file = new File([videoBuffer], filename, {
        type: "video/mp4",
      });
    } catch (e) {
      // Fallback: use fs.createReadStream with the temp file
      // OpenAI SDK accepts File, but we can also pass a stream-like object
      const fileStream = fs.createReadStream(tempFilePath);
      file = fileStream;
    }

    // Call Whisper API with verbose_json format for segment-level timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"], // Get segment-level timestamps
    });

    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Transform OpenAI response to our format
    const segments = transcription.segments || [];
    const transcriptSegments = segments.map((segment) => ({
      start_sec: segment.start,
      end_sec: segment.end,
      text: segment.text.trim(),
    }));

    console.log(`Transcription completed: ${segments.length} segments`);

    return {
      segments: transcriptSegments,
      duration_sec: segments.length > 0 ? segments[segments.length - 1].end : 0,
    };
  } catch (error) {
    console.error("OpenAI transcription error:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function getEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("OpenAI batch embedding error:", error);
    throw new Error(`Batch embedding failed: ${error.message}`);
  }
}

