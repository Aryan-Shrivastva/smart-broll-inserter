/**
 * Utility to download video files from URLs
 */

/**
 * Download a video file from a URL and return as Buffer
 * @param {string} url - Video URL
 * @returns {Promise<Buffer>} Video file buffer
 */
export async function downloadVideo(url) {
  try {
    console.log(`Downloading video from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer); // 
    
    console.log(`Downloaded ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error(`Error downloading video from ${url}:`, error);
    throw error;
  }
}

