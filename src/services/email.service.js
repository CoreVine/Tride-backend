const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('../utils/handlebarsHelpers');  // Use our custom helpers
const emailConfig = require('../config/email.config');
const loggingService = require('./logging.service');

const logger = loggingService.getLogger();

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = {};
  }

  /**
   * Initialize the email service with configuration from environment variables
   */
  async init() {
    try {
      const service = process.env.EMAIL_HOST ? {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
      } : { service: 'gmail' };
      // Create transporter with config from environment/config
      this.transporter = nodemailer.createTransport({
        ...service,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        ...emailConfig.additionalOptions
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('[EMAIL] Email service initialized successfully');
      return this;
    } catch (error) {
      logger.error('[EMAIL] Failed to initialize email service', error);
      // throw error;
    }
  }

  /**
   * Send a plain text email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} text - Plain text content
   * @param {object} options - Additional email options
   * @returns {Promise} Mail send result
   */
  async sendTextEmail(to, subject, text, options = {}) {
    try {
      const mailOptions = {
        from: options.from || `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        text,
        ...options
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL] Text email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`[EMAIL] Failed to send text email to ${to}`, error);
      throw error;
    }
  }

  /**
   * Send an HTML email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {object} options - Additional email options
   * @returns {Promise} Mail send result
   */
  async sendHtmlEmail(to, subject, html, options = {}) {
    try {
      const mailOptions = {
        from: options.from || `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        html,
        ...options
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EMAIL] HTML email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`[EMAIL] Failed to send HTML email to ${to}`, error);
      throw error;
    }
  }

  /**
   * Load and cache an email template
   * @param {string} templateName - Name of the template file without extension
   * @returns {Promise<Function>} Compiled template function
   */
  async loadTemplate(templateName) {
    try {
      // Check if template is already cached
      if (this.templateCache[templateName]) {
        return this.templateCache[templateName];
      }

      const templatePath = path.join(
        __dirname, 
        '../../templates/emails', 
        `${templateName}.html`
      );
      
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateSource);
      
      // Cache the template for future use
      this.templateCache[templateName] = compiledTemplate;
      
      return compiledTemplate;
    } catch (error) {
      logger.error(`[EMAIL] Failed to load email template: ${templateName}`, error);
      throw error;
    }
  }

  /**
   * Send an email using a template
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} templateName - Name of the template file without extension
   * @param {object} data - Data to be injected into the template
   * @param {object} options - Additional email options
   * @returns {Promise} Mail send result
   */
  async sendTemplateEmail(to, subject, templateName, data = {}, options = {}) {
    try {
      // Load and compile the template
      const template = await this.loadTemplate(templateName);
      
      // Render the template with data
      const html = template(data);
      
      // Send the email with rendered HTML
      return this.sendHtmlEmail(to, subject, html, options);
    } catch (error) {
      logger.error(`[EMAIL] Failed to send template email to ${to}`, error);
      throw error;
    }
  }

  /**
   * Send a password reset email
   * @param {string} to - Recipient email address
   * @param {object} data - User data including reset token
   * @returns {Promise} Mail send result
   */
  async sendPasswordResetEmail(to, data) {
    const subject = emailConfig.templates.passwordReset.subject;
    
    // Make sure resetLink is provided in data
    if (!data.resetLink) {
      data.resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${data.token}`;
    }
    
    // Add additional template data from config
    const templateData = {
      ...emailConfig.templates.passwordReset.defaultData,
      ...data
    };
    
    return this.sendTemplateEmail(
      to, 
      subject, 
      'password-reset', 
      templateData
    );
  }

  /**
   * Send a password reset verification code email
   * @param {string} to - Recipient email address
   * @param {object} data - User data including verification code
   * @returns {Promise} Mail send result
   */
  async sendPasswordResetCode(to, data) {
    const subject = emailConfig.templates.passwordReset.subject;
    
    // Add additional template data from config
    const templateData = {
      ...emailConfig.templates.passwordReset.defaultData,
      ...data
    };
    
    return this.sendTemplateEmail(
      to, 
      subject, 
      'password-reset', 
      templateData
    );
  }
  
  /**
   * Send an account verification code email
   * @param {string} to - Recipient email address
   * @param {object} data - User data including verification code
   * @returns {Promise} Mail send result
   */
  async sendAccountVerificationCode(to, data) {
    const subject = emailConfig.templates.accountVerification.subject;
    
    // Add additional template data from config
    const templateData = {
      ...emailConfig.templates.accountVerification.defaultData,
      ...data,
      currentYear: new Date().getFullYear() // Ensure current year is available
    };
    
    return this.sendTemplateEmail(
      to, 
      subject, 
      'account-verification', 
      templateData
    );
  }
  
  /**
   * Generate a random verification code
   * @param {number} length - The length of the code (default: 6)
   * @returns {string} The generated verification code
   */
  generateVerificationCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }
}

module.exports = new EmailService();
