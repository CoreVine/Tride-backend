const { Router } = require("express");
const authMiddleware = require("../../middlewares/auth.middleware");
const verifiedEmailRequired = require("../../middlewares/verifiedEmailRequired.middleware");
const validate = require("../../middlewares/validation.middleware");
const Yup = require("yup");
const { isAdminWithRole } = require("../../middlewares/isAccount.middleware");
const authController = require("../../controllers/auth.controller");
const {
    createUploader,
    cloudinaryResourceTypes,
    cloudinaryAccountTypes,
    cloudinaryPurposeTypes,
  } = require("../../config/upload");

const AdminRepository = require("../../data-access/admin");
const { ADMIN_ROLE_SUPPORT_ADMIN, ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles");

// Basic uploaders without validation - validation will happen in controllers
const adminProfileUploader = createUploader({
  storageType: "cloudinary",
  uploadPath: "profiles",
  fileFilter: "images",
  fileSize: 5 * 1024 * 1024,
  cloudinaryOptions: {
    resourceType: cloudinaryResourceTypes.IMAGE,
    accountType: cloudinaryAccountTypes.ADMIN,
    purpose: cloudinaryPurposeTypes.PROFILE,
    transformationPreset: "profile",
    allowedFormats: ["jpg", "jpeg", "png", "webp", "heic"],
  },
});

const adminRouter = Router();

// TODO: Continue
adminRouter.post('/admins/create',
    ...adminProfileUploader.single("profile_pic"),
    async (req, res, next) => {
    req.fromAdminCreation = true; // Flag to indicate this is an admin creation request
    req.body.account_type = "admin"; // Set account type to admin
    return next();
}, validate({
    email: Yup.string().email().required(),
    password: Yup.string().min(6).required(),
    first_name: Yup.string().required(),
    last_name: Yup.string().required(),
    language: Yup.string().oneOf(["en", "ar"]).default("en")
}), authController.register, async (req, res) => {
    try {
        const { first_name, last_name, language } = req.body;
        const profile_pic = req.file ? req.file.path : null;

        await AdminRepository.createNewAdmin({
            account_id: req.account.id,
            first_name,
            last_name,
            language,
            profile_pic
        });

        res.success("Admin created successfully", {
            admin: {
                id: req.account.id,
                first_name,
                last_name,
                language,
                profile_pic
            }
        });
    } catch (error) {
        console.error("Error creating admin:", error);
        res.error("Failed to create admin", 500);
    }
});

adminRouter.get('/admins', authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), 
    async (req, res) => {
    try {
        const admins = await AdminRepository.findAll();
        res.success("Admins retrieved successfully", { admins });
    } catch (error) {
        console.error("Error retrieving admins:", error);
        res.error("Failed to retrieve admins", 500);
    }
});

module.exports = adminRouter;
