const { Router } = require("express");
const authMiddleware = require("../../middlewares/auth.middleware");
const verifiedEmailRequired = require("../../middlewares/verifiedEmailRequired.middleware");
const validate = require("../../middlewares/validation.middleware");
const Yup = require("yup");
const { isAdmin } = require("../../middlewares/isAccount.middleware");

const adminRouter = Router();

// TODO: Continue
adminRouter.post('/admin/create', authMiddleware, isAdmin);

module.exports = authRoutes;
