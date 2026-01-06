/**
 * Semantic matching service for matching A-roll transcript segments with B-roll clips
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity score (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Find the best matching B-roll for a transcript segment
 * @param {number[]} segmentEmbedding - Embedding of transcript segment
 * @param {Array} brollEmbeddings - Array of {id, metadata, embedding} objects
 * @returns {Object} Best match with {id, confidence, reason}
 */
function findBestMatch(segmentEmbedding, brollEmbeddings) {
  let bestMatch = null;
  let bestScore = -1;

  for (const broll of brollEmbeddings) {
    const similarity = cosineSimilarity(segmentEmbedding, broll.embedding);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = {
        id: broll.id,
        confidence: similarity,
        reason: `Semantic match: ${broll.metadata.substring(0, 100)}...`,
      };
    }
  }

  return bestMatch;
}

/**
 * Plan B-roll insertions based on semantic matching
 * @param {Array} transcriptSegments - Array of {start_sec, end_sec, text, embedding}
 * @param {Array} brollEmbeddings - Array of {id, metadata, embedding}
 * @param {number} arollDuration - Total A-roll duration in seconds
 * @param {Object} options - Configuration options
 * @returns {Array} Array of insertion plans
 */
export function planInsertions(transcriptSegments, brollEmbeddings, arollDuration, options = {}) {
  const {
    minInsertionGap = 8, // Minimum seconds between insertions
    minInsertionDuration = 2, // Minimum insertion duration
    maxInsertionDuration = 5, // Maximum insertion duration
    minConfidence = 0.3, // Minimum confidence threshold
    maxInsertions = 6, // Maximum number of insertions
    avoidFirstSeconds = 2, // Avoid inserting in first N seconds
    avoidLastSeconds = 3, // Avoid inserting in last N seconds
  } = options;

  const insertions = [];
  const usedBrollIds = new Set();
  let lastInsertionEnd = avoidFirstSeconds;

  // Filter segments that are suitable for B-roll insertion
  // Avoid very short segments and segments at the beginning/end
  const suitableSegments = transcriptSegments.filter((segment) => {
    const segmentDuration = segment.end_sec - segment.start_sec;
    return (
      segment.start_sec >= avoidFirstSeconds &&
      segment.end_sec <= arollDuration - avoidLastSeconds &&
      segmentDuration >= 1.5 && // At least 1.5 seconds long
      segment.embedding // Must have embedding
    );
  });

  // Sort segments by their position in the video
  suitableSegments.sort((a, b) => a.start_sec - b.start_sec);

  for (const segment of suitableSegments) {
    // Check if we've reached max insertions
    if (insertions.length >= maxInsertions) break;

    // Check if enough time has passed since last insertion
    if (segment.start_sec < lastInsertionEnd + minInsertionGap) continue;

    // Find best matching B-roll (allow reuse if needed to reach target insertions)
    const availableBrolls = brollEmbeddings.filter((b) => !usedBrollIds.has(b.id));
    // If we haven't reached max insertions yet, allow reuse of B-rolls
    const brollsToSearch = insertions.length < maxInsertions && availableBrolls.length === 0 
      ? brollEmbeddings  // Allow reuse if we need more insertions
      : (availableBrolls.length > 0 ? availableBrolls : brollEmbeddings);

    const match = findBestMatch(segment.embedding, brollsToSearch);

    if (match && match.confidence >= minConfidence) {
      // Calculate insertion timing
      // Insert B-roll starting slightly after segment start
      const insertionStart = segment.start_sec + 0.5;
      const insertionDuration = Math.min(
        Math.max(minInsertionDuration, segment.end_sec - insertionStart - 0.5),
        maxInsertionDuration
      );

      insertions.push({
        start_sec: insertionStart,
        duration_sec: insertionDuration,
        broll_id: match.id,
        confidence: match.confidence,
        reason: match.reason,
      });

      usedBrollIds.add(match.id);
      lastInsertionEnd = insertionStart + insertionDuration;
    }
  }

  return insertions;
}

