/**
 * Email Configuration
 */
module.exports = {
  // Additional options for nodemailer transport
  additionalOptions: {
    // Set this to false in production
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    },
    // Can be used to rate limit sending
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  },

  // Template configurations
  templates: {
    // Password reset email configuration
    passwordReset: {
      subject: 'Password Reset Verification Code',
      // Default data that will be merged with the data passed when sending
      defaultData: {
        companyName: process.env.COMPANY_NAME || 'Our Company',
        companyLogo: process.env.COMPANY_LOGO_URL || 'https://example.com/logo.png',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
        expiryMinutes: 5, // Verification code expiry in minutes
      }
    },

    // Account verification email configuration
    accountVerification: {
      subject: 'Verify Your Email Address',
      defaultData: {
        companyName: process.env.COMPANY_NAME || 'Our Company',
        companyLogo: process.env.COMPANY_LOGO_URL || 'https://example.com/logo.png',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
        expiryMinutes: process.env.EMAIL_VERIFICATION_EXP_MINS || 30, // Verification code expiry in minutes
        currentYear: new Date().getFullYear()
      }
    },

    // Welcome email configuration
    welcome: {
      subject: 'Welcome to Our Platform',
      defaultData: {
        companyName: process.env.COMPANY_NAME || 'Our Company',
        companyLogo: process.env.COMPANY_LOGO_URL || 'https://example.com/logo.png',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
      }
    }
  }
};
