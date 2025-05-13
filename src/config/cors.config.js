/**
 * CORS Configuration
 */
module.exports = {
  allowedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:5173', // Default frontend URL
    // Add more web origins as needed
  ],
  credentials: true, // Allow cookies to be sent with requests
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};
