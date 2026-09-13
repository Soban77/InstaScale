const path = require('path');
const sharp = require('sharp');

/**
 * Generates a compressed JPEG thumbnail next to an uploaded image, e.g.
 * "posts/169..." -> "posts/169..._thumb.jpg". Used for feed/grid previews
 * so full-resolution originals aren't loaded for every scroll position.
 *
 * @param {string} absoluteFilePath - full path to the uploaded image on disk
 * @returns {Promise<string>} the public URL path of the generated thumbnail
 */
async function generateImageThumbnail(absoluteFilePath) {
  const dir = path.dirname(absoluteFilePath);
  const ext = path.extname(absoluteFilePath);
  const base = path.basename(absoluteFilePath, ext);
  const thumbPath = path.join(dir, `${base}_thumb.jpg`);

  await sharp(absoluteFilePath)
    .resize(480, 480, { fit: 'cover' })
    .jpeg({ quality: 78 })
    .toFile(thumbPath);

  const publicRoot = path.join(__dirname, '..', 'public');
  return `/${path.relative(publicRoot, thumbPath).split(path.sep).join('/')}`;
}

/**
 * Video compression + thumbnail extraction for Reels/IGTV.
 *
 * NOT YET WIRED into the upload pipeline: this requires the `ffmpeg`
 * binary to be installed on the host (fluent-ffmpeg is a wrapper around
 * it, not a standalone encoder), which isn't guaranteed in every
 * deployment environment. The interface below is the intended shape -
 * swap the body in once an ffmpeg binary is available, e.g. via a
 * Docker base image that includes it, and call it from
 * postController.createPost for mediaType 'video'/'reel'.
 *
 * @param {string} absoluteFilePath - full path to the uploaded video
 * @returns {Promise<{ compressedPath: string, thumbnailPath: string }>}
 */
async function processVideo(absoluteFilePath) {
  throw new Error(
    'processVideo() is a stub. Install ffmpeg on the host, then implement ' +
      'compression + thumbnail extraction here with fluent-ffmpeg, e.g.:\n' +
      "  ffmpeg(absoluteFilePath).videoCodec('libx264').outputOptions(['-crf 28'])...\n" +
      "  ffmpeg(absoluteFilePath).screenshots({ timestamps: ['1'], filename: 'thumb.jpg' })..."
  );
}

module.exports = { generateImageThumbnail, processVideo };
