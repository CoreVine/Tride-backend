/**
 * Generates a short unique code for invites
 * @param {number} length - Length of the code (default: 8)
 * @returns {string} A unique alphanumeric code
 */
const generateInviteCode = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters (O, 0, 1, I)
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

module.exports = {
  generateInviteCode
};
