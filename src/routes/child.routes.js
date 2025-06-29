const { Router } = require("express");
const childController = require("../controllers/childern.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const { isParent } = require("../middlewares/isAccount.middleware");
const validate = require("../middlewares/validation.middleware");
const {
  createUploader,
  cloudinaryResourceTypes,
  cloudinaryAccountTypes,
  cloudinaryPurposeTypes,
} = require("../config/upload");
const Yup = require("yup");

// Basic uploaders without validation - validation will happen in controllers
const childenUploader = createUploader({
  storageType: "cloudinary",
  uploadPath: "child-profiles",
  fileFilter: "images",
  fileSize: 5 * 1024 * 1024,
  cloudinaryOptions: {
    resourceType: cloudinaryResourceTypes.IMAGE,
    accountType: cloudinaryAccountTypes.PARENT,
    purpose: cloudinaryPurposeTypes.PROFILE,
    transformationPreset: "child",
    allowedFormats: ["jpg", "jpeg", "png", "webp", "heic"],
  },
});

// Validation schemas
const childSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  gender: Yup.string().required("Gender is required"),
  grade: Yup.string().required("grade is required"),
});

const childSchemaUpdateSchema = Yup.object().shape({
  name: Yup.string(),
  gender: Yup.string(),
  grade: Yup.string(),
});  

const childRoutes = Router();

childRoutes.use(authMiddleware, verifiedEmailRequired, isParent);
childRoutes
  .route("/child")
  .get(childController.getChildProfileforParent)
  .post(
    ...childenUploader.single("profile_pic"),
    validate(childSchema),
    childController.createChildProfile
  );
childRoutes
  .route("/child/:id")
  .get(childController.getByChildProfile)
  .put(
    ...childenUploader.single("profile_pic"),
    validate(childSchemaUpdateSchema),
    childController.updateChildProfile
  )
  .delete(childController.deleteByChildProfile);

module.exports = childRoutes;
