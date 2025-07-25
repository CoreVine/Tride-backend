const { Router } = require("express");
const profileController = require("../controllers/profile.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const { isParent, isDriver, isOneOf, isAdmin } = require("../middlewares/isAccount.middleware");
const validate = require("../middlewares/validation.middleware");
const {
  createUploader,
  cloudinaryResourceTypes,
  cloudinaryAccountTypes,
  cloudinaryPurposeTypes,
} = require("../config/upload");
const Yup = require("yup");

// Basic uploaders without validation - validation will happen in controllers
const parentProfileUploader = createUploader({
  storageType: "cloudinary",
  uploadPath: "profiles",
  fileFilter: "images",
  fileSize: 5 * 1024 * 1024,
  cloudinaryOptions: {
    resourceType: cloudinaryResourceTypes.IMAGE,
    accountType: cloudinaryAccountTypes.PARENT,
    purpose: cloudinaryPurposeTypes.PROFILE,
    transformationPreset: "profile",
    allowedFormats: ["jpg", "jpeg", "png", "webp", "heic"],
  },
});

const parentIdUploader = createUploader({
  storageType: "cloudinary",
  uploadPath: "id-documents",
  fileFilter: "images",
  fileSize: 5 * 1024 * 1024,
  cloudinaryOptions: {
    resourceType: cloudinaryResourceTypes.IMAGE,
    accountType: cloudinaryAccountTypes.PARENT,
    purpose: cloudinaryPurposeTypes.ID_CARDS,
    transformationPreset: "document",
    allowedFormats: ["jpg", "jpeg", "png", "webp", "pdf", "heic"],
  },
});

const driverProfileUploader = createUploader({
  storageType: "cloudinary",
  uploadPath: "profiles",
  fileFilter: "images",
  fileSize: 5 * 1024 * 1024,
  cloudinaryOptions: {
    resourceType: cloudinaryResourceTypes.IMAGE,
    accountType: cloudinaryAccountTypes.DRIVER,
    purpose: cloudinaryPurposeTypes.PROFILE,
    transformationPreset: "profile",
    allowedFormats: ["jpg", "jpeg", "png", "webp", "heic"],
  },
});

const driverDocumentsUploader = createUploader({
  storageType: "cloudinary",
  uploadPath: "driver-documents",
  fileFilter: "images",
  fileSize: 10 * 1024 * 1024,
  cloudinaryOptions: {
    resourceType: cloudinaryResourceTypes.IMAGE,
    accountType: cloudinaryAccountTypes.DRIVER,
    purpose: cloudinaryPurposeTypes.DOCUMENTS,
    transformationPreset: "document",
    allowedFormats: ["jpg", "jpeg", "png", "webp", "pdf", "heic"],
  },
});

// Validation schemas
const parentProfileSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string().required("Phone number is required"),
  gender: Yup.string().required("Gender is required"),
  city_id: Yup.number().required("City is required"),
  google_place_id: Yup.string(),
  lat: Yup.number().required("Latitude is required"),
  lng: Yup.number().required("Longitude is required"),
  formatted_address: Yup.string(),
  // profile_pic removed as it will be uploaded directly
});

const parentProfileUpdateSchema = Yup.object().shape({
  name: Yup.string(),
  phone: Yup.string(),
  gender: Yup.string(),
  city_id: Yup.number(),
  google_place_id: Yup.string(),
  lat: Yup.number(),
  lng: Yup.number(),
  formatted_address: Yup.string(),
  // profile_pic removed as it will be uploaded directly
});

const driverProfileSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string().required("Phone number is required"),
  license_number: Yup.string().required("License number is required"),
  gender: Yup.string().required("Gender is required"),
  city_id: Yup.number().required("City is required"),
  lat: Yup.number().required("Latitude is required"),
  lng: Yup.number().required("Longitude is required"),
  formatted_address: Yup.string(),
});

const driverProfileUpdateSchema = Yup.object().shape({
  name: Yup.string(),
  phone: Yup.string(),
  license_number: Yup.string(),
  gender: Yup.string(),
  city_id: Yup.number(),
  lat: Yup.number(),
  lng: Yup.number(),
  formatted_address: Yup.string(),
});

const driverPapersSchema = Yup.object().shape({
  car_model: Yup.string().required("Car model is required"),
  car_model_year: Yup.number().required("Car model year is required"),
  driver_license_exp_date: Yup.date().required(
    "Driver license expiration date is required"
  ),
  car_license_exp_date: Yup.date().required(
    "Car license expiration date is required"
  ),
  face_auth_complete: Yup.boolean().required(),
});

const parentApprovalSchema = Yup.object().shape({
  approved: Yup.boolean().required("Approved status is required"),
});

const profileRoutes = Router();

// Parent profile routes

profileRoutes
  .route("/profile/parent")
  .post(
    ...parentProfileUploader.single("profile_pic"),
    authMiddleware,
    verifiedEmailRequired,
    isParent,
    validate(parentProfileSchema),
    profileController.createParentProfile
  )
  .get(
    authMiddleware,
    verifiedEmailRequired,
    isParent,
    profileController.getParentProfile
  )
  .put(
    ...parentProfileUploader.single("profile_pic"),
    authMiddleware,
    verifiedEmailRequired,
    isParent,
    validate(parentProfileUpdateSchema),
    profileController.updateParentProfile
  );

// Upload parent ID documents
profileRoutes.post(
  "/profile/parent/papers",
  ...parentIdUploader.fields([
    { name: "front_side_nic", maxCount: 1 },
    { name: "back_side_nic", maxCount: 1 },
  ]),
  authMiddleware,
  verifiedEmailRequired,
  isParent,
  profileController.uploadParentIdDocuments
);

// Get parent ID documents
profileRoutes.get(
  "/profile/parent/papers",
  authMiddleware,
  verifiedEmailRequired,
  isParent,
  profileController.getParentIdDocuments
);

// Approve parent documents (Admin function)
profileRoutes.put(
  "/profile/parent/approved/:parentId",
  authMiddleware,
  verifiedEmailRequired,
  // This route is for admin to approve parent documents
  // so we need to ensure the user is a parent (or could be admin in future)
  isParent,
  validate(parentApprovalSchema),
  profileController.approveParentDocuments
);

profileRoutes
  .route("/profile/driver")
  .post(
    ...driverProfileUploader.single("profile_pic"),
    authMiddleware,
    isDriver,
    validate(driverProfileSchema),
    profileController.createDriverProfile
  )
  .get(
    authMiddleware,
    isAdmin,
    validate(Yup.object().shape({
      page: Yup.number().integer().positive().default(1),
      limit: Yup.number().integer().positive().default(10),
    })),
    profileController.getAllDriverProfiles
  )
  .put(
    ...driverProfileUploader.single("profile_pic"),
    authMiddleware,
    verifiedEmailRequired,
    isDriver,
    validate(driverProfileUpdateSchema),
    profileController.updateDriverProfile
  );

profileRoutes.route("/profile/driver/:account_id")
.get(
  authMiddleware,
  isOneOf("driver", "admin"),
  validate({
    params: Yup.object().shape({
      account_id: Yup.number().integer().positive(),
    }),
  }),
  profileController.getDriverProfile
);

// Step 2 for drivers: Upload papers - all document validation happens BEFORE upload
profileRoutes.post(
  "/profile/driver/papers",
  ...driverDocumentsUploader.fields([
    { name: "front_side_national", maxCount: 1 },
    { name: "back_side_national", maxCount: 1 },
    { name: "driver_license", maxCount: 1 },
    { name: "car_license", maxCount: 1 },
  ]),
  authMiddleware,
  verifiedEmailRequired,
  isDriver,
  validate(driverPapersSchema),
  profileController.uploadDriverPapers
);
profileRoutes.put(
  "/profile/driver/approved/:papersId",
  authMiddleware,
  verifiedEmailRequired,
  // This route is for admin to approve driver profiles
  // so we need to ensure the user is a driver
  isDriver,
  profileController.uploadDriverApproved
);

// Get profile approval status (especially for drivers)
profileRoutes.get(
  "/profile/status",
  authMiddleware,
  verifiedEmailRequired,
  profileController.getProfileStatus
);

module.exports = profileRoutes;
