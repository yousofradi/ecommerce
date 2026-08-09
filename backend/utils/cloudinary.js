const cloudinary = require('cloudinary').v2;

// Check for Cloudinary credentials
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Uploads an image from a URL or Local Path to Cloudinary
 * @param {string} source - URL or local file path
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<string>} - The uploaded image URL
 */
async function uploadToCloudinary(source, folder = 'ecommerce-products') {
  if (!isCloudinaryConfigured) {
    console.warn('⚠️ Cloudinary not configured, returning original source');
    return source;
  }

  try {
    const result = await cloudinary.uploader.upload(source, {
      folder: folder,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 800, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    });
    
    let finalUrl = result.secure_url;
    // Force the URL to end in .webp explicitly
    finalUrl = finalUrl.replace(/\.(png|jpe?g|gif)$/i, '.webp');
    return optimizeCloudinaryUrl(finalUrl);
  } catch (err) {
    console.error('❌ Cloudinary Upload Error:', err);
    return source; // Fallback to original
  }
}

/**
 * Checks if a URL is from Google Drive
 * @param {string} url 
 * @returns {boolean}
 */
function isDriveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com') || url.includes('googleusercontent.com');
}

/**
 * Injects clean bandwidth-saving transformations into a Cloudinary URL.
 * @param {string} url - The original Cloudinary image URL.
 * @returns {string} - The optimized URL.
 */
function optimizeCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Check if it's actually a Cloudinary URL
  if (url.includes('res.cloudinary.com')) {
    // Force the URL to explicitly end in .webp
    url = url.replace(/\.(png|jpe?g|gif)$/i, '.webp');
    
    if (url.includes('/upload/')) {
      // Strip any dynamic transformations from the URL.
      // Since images are already optimized during upload (800w, webp), serving the raw URL costs 0 transformation credits.
      url = url.replace(/\/upload\/(?:[^\/]+\/)?/, '/upload/');
    }
  }
  
  return url;
}

module.exports = {
  uploadToCloudinary,
  isDriveUrl,
  isCloudinaryConfigured,
  optimizeCloudinaryUrl
};
