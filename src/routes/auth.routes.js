const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const socialAuthController = require("../controllers/socialAuth.controller");
const passwordResetController = require("../controllers/passwordReset.controller");
const emailVerificationController = require("../controllers/emailVerification.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const validate = require("../middlewares/validation.middleware");
const Yup = require("yup");

const loginSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().required(),
  account_type: Yup.string().oneOf(["parent", "driver", "admin"]).default("parent")
});

const registerSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(6).required(),
  account_type: Yup.string().oneOf(["parent", "driver", "admin"]).default("parent"),
});

const passwordResetRequestSchema = Yup.object().shape({
  email: Yup.string().email().required(),
});

const verifyCodeSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  code: Yup.string().length(6).required(),
});

const resetPasswordSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(6).required(),
  resetToken: Yup.string().required(),
});

const emailVerificationSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  code: Yup.string().length(6).required(),
});

const deviceTokenSchema = Yup.object().shape({
  device_token: Yup.string().required("Device token is required for removal."),
});

// Social auth schemas
const googleAuthSchema = Yup.object().shape({
  idToken: Yup.string().required(),
  account_type: Yup.string().oneOf(["parent", "driver"]).default("parent"),
});

const facebookAuthSchema = Yup.object().shape({
  accessToken: Yup.string().required(),
  account_type: Yup.string().oneOf(["parent", "driver"]).default("parent"),
});

const authRoutes = Router();

// Update register route to include validation
authRoutes.post(
  "/auth/register",
  validate(registerSchema),
  authController.register
);

authRoutes.post("/auth/login", validate(loginSchema), authController.login);

// register device tokens
authRoutes.post("/auth/register/firebase/device-token", authMiddleware, validate(deviceTokenSchema), authController.registerDeviceToken);

// remove device token
authRoutes.delete("/auth/remove/firebase/device-token", authMiddleware, validate(deviceTokenSchema), authController.removeDeviceToken);

authRoutes.post(
  "/auth/refresh",
  verifiedEmailRequired,
  authController.refreshToken
);

authRoutes.post("/auth/logout", authMiddleware, authController.logout);

// Get current user - requires verified email
authRoutes.get(
  "/auth/me",
  authMiddleware,
  verifiedEmailRequired,
  authController.me
);

// Email verification routes
authRoutes.post(
  "/auth/email/verify",
  validate(emailVerificationSchema),
  emailVerificationController.verifyEmail
);

authRoutes.post(
  "/auth/email/verify/resend",
  validate(passwordResetRequestSchema), // Reuse existing schema since they're identical
  emailVerificationController.resendVerificationCode
);

// Password reset routes
authRoutes.post(
  "/auth/password/request",
  validate(passwordResetRequestSchema),
  passwordResetController.requestVerificationCode
);

authRoutes.post(
  "/auth/password/resend",
  validate(passwordResetRequestSchema),
  passwordResetController.resendVerificationCode
);

authRoutes.post(
  "/auth/password/verify",
  validate(verifyCodeSchema),
  passwordResetController.verifyCode
);

authRoutes.post(
  "/auth/password/reset",
  validate(resetPasswordSchema),
  passwordResetController.resetPassword
);

// Social authentication routes
authRoutes.post(
  "/auth/google",
  validate(googleAuthSchema),
  socialAuthController.googleAuth
);

authRoutes.post(
  "/auth/facebook",
  validate(facebookAuthSchema),
  socialAuthController.facebookAuth
);

module.exports = authRoutes;
