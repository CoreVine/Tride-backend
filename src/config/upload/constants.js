/**
 * Constants for the upload module
 */

// Resource type constants
const RESOURCE_TYPES = {
  AUTO: 'auto',
  IMAGE: 'image',
  VIDEO: 'video',
  RAW: 'raw'
};

// Account types for folder structure
const ACCOUNT_TYPES = {
  PARENT: 'parent',
  DRIVER: 'driver',
  ADMIN: 'admin',
  SYSTEM: 'system'
};

// Purpose types for folder structure
const PURPOSE_TYPES = {
  PROFILE: 'profile',
  DOCUMENTS: 'documents',
  LICENSES: 'licenses',
  VEHICLES: 'vehicles',
  ID_CARDS: 'id-cards',
  MISC: 'misc'
};

// Transformation presets for Cloudinary
const TRANSFORMATIONS = {
  // Profile picture transformations
  profile: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto', fetch_format: 'auto' }
  ],
  
  // Document optimizations
  document: [
    { quality: 'auto', fetch_format: 'auto' }
  ],
  
  // License images
  license: [
    { width: 1000, crop: 'limit' },
    { quality: 'auto', fetch_format: 'auto' }
  ],
  
  // Thumbnail versions
  thumbnail: [
    { width: 150, height: 150, crop: 'fill' },
    { quality: 'auto', fetch_format: 'auto' }
  ]
};

const MAX_SEATS_CAR = 5;
const RIDE_PRICE_PER_KM = (distance) => {
  if (distance <= 600)
    return 9000;
  else if (distance <= 800)
    return 10500;
  else if (distance <= 1000)
    return 12500;
  else if (distance <= 1200)
    return 14000;
  else
    return 11.5 * totalMonthlyDistance;
}; // Example price per km, adjust as needed
/**
 * Get a transformation configuration
 * @param {Array} customTransformation - Custom transformation array
 * @param {string} presetName - Name of a transformation preset
 * @returns {Array} Transformation configuration
 */
const getTransformation = (customTransformation, presetName) => {
  if (customTransformation) {
    return customTransformation;
  }
  
  if (presetName && TRANSFORMATIONS[presetName]) {
    return TRANSFORMATIONS[presetName];
  }
  
  return [];
};

module.exports = {
  RESOURCE_TYPES,
  ACCOUNT_TYPES,
  PURPOSE_TYPES,
  TRANSFORMATIONS,
  MAX_SEATS_CAR,
  RIDE_PRICE_PER_KM,
  getTransformation
};
