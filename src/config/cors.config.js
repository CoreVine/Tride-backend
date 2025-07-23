/**
 * CORS Configuration
 */
module.exports = {
  allowedOrigins: [
    "*" // Allow all origins for testing
    // process.env.FRONTEND_URL, // Default frontend URL
    // Add more web origins as needed
  ],
  credentials: true, // Allow cookies to be sent with requests
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};
