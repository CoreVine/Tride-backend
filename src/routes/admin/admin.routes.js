const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth.middleware")
const validate = require("../../middlewares/validation.middleware")
const Yup = require("yup")
const { isAdminWithRole, isAdmin } = require("../../middlewares/isAccount.middleware")
const authController = require("../../controllers/auth.controller")
const { createUploader, cloudinaryResourceTypes, cloudinaryAccountTypes, cloudinaryPurposeTypes } = require("../../config/upload")

const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles")
const adminController = require("../../controllers/admins.controller")

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
    allowedFormats: ["jpg", "jpeg", "png", "webp", "heic"]
  }
})

const createNewAdminSchema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(6).required(),
  first_name: Yup.string().required(),
  last_name: Yup.string().required(),
  language: Yup.string().oneOf(["en", "ar"]).default("en")
})

const updateAdminRoleSchema = {
  params: Yup.object().shape({
    adminId: Yup.number().required().positive().integer()
  }),
  body: Yup.object().shape({
    role_id: Yup.number().required().positive().integer()
  })
}

const adminRouter = Router()

adminRouter.post(
  "/admins/create",
  authMiddleware,
  isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN),
  adminProfileUploader.single("profile_pic"),
  async (req, res, next) => {
    req.fromAdminCreation = true; // Flag to indicate this is an admin creation request
    req.body.account_type = "admin"; // Set account type to admin
    return next()
  },
  validate(createNewAdminSchema),
  authController.register,
  adminController.createNewAdmin
)

adminRouter.get("/admins", authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), adminController.getAllAdminsExceptMe)

adminRouter.get("/admins/me", authMiddleware, isAdmin, adminController.me)

adminRouter.patch("/admins/:adminId/role", authMiddleware, isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN), validate(updateAdminRoleSchema), adminController.updateAdminRole)

module.exports = adminRouter
