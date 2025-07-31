const AccountRepository = require("../data-access/accounts");
const ParentRepository = require("../data-access/parent");
const ChildRepository = require("../data-access/child");
const loggingService = require("../services/logging.service");
const { deleteUploadedFile } = require("../config/upload");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors/types/Api.error");
const logger = loggingService.getLogger();

const childController = {
  createChildProfile: async (req, res, next) => {
    try {
      logger.debug("Parent profile creation attempt", { accountId: req.userId });

      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }

      // Check if parent profile already exists BEFORE processing files
      const parentProfile = await ParentRepository.findByAccountId(req.userId);

      if (!parentProfile) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // Only process the profile pic if it was uploaded
      const profilePicUrl = req.file ? req.file.path : null;

      // Create parent profile
      const child = await ChildRepository.create({
        parent_id: parentProfile.id,
        name: req.body.name,
        gender: req.body.gender,
        grade: req.body.grade,
        profile_pic: profilePicUrl,
      });

      logger.debug("child created successfully", {
        child: child,
      });

      // Return success with parent profile
      return res.success("Parent profile created successfully", {
        child,
      });
    } catch (error) {
      logger.error("Parent profile creation error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  getChildProfileforParent: async (req, res, next) => {
    try {
      logger.debug("chidlens get creation attempt", { accountId: req.userId });

      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }
      const parentProfile = await ParentRepository.findByAccountId(req.userId);
      if (!parentProfile) {
        throw new BadRequestError("Parent profile not exists for this account");
      }
      // Check if parent profile already exists BEFORE processing files
      const childrens = await ParentRepository.findByIdWithChildren(
        parentProfile.id
      );

      logger.debug("child created successfully", {
        childrens: childrens.children,
      });

      // Return success with parent profile
      return res.success("Childrens retrieved successfully", {
        childrens: childrens.children,
      });
    } catch (error) {
      logger.error("Parent profile creation error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  updateChildProfile: async (req, res, next) => {
    try {
      logger.debug("Childen update attempt", { accountId: req.userId });
      const child_id = req.params.id;
      if (!child_id) {
        throw new BadRequestError("Child ID is required");
      }
      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }

      // Check if parent profile already exists BEFORE processing files
      const parentProfile = await ParentRepository.findByAccountId(req.userId);

      if (!parentProfile) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // Only process the profile pic if it was uploaded

      const child = await ChildRepository.findById(child_id);
      if (!child) {
        throw new NotFoundError("Child profile not found");
      }
      const profilePicUrl = req.file ? req.file.path : child.profile_pic;
      // Create parent profile
      const newChild = await ChildRepository.update(child_id, {
        parent_id: parentProfile.id,
        name: req.body.name || child.name,
        gender: req.body.gender || child.gender,
        grade: req.body.grade || child.grade,
        profile_pic: profilePicUrl,
      });

      logger.debug("child update successfully", {
        child: newChild,
      });

      // Return success with parent profile
      return res.success("Parent profile update successfully", {
        child: newChild,
      });
    } catch (error) {
      logger.error("Parent profile update error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  getByChildProfile: async (req, res, next) => {
    try {
      logger.debug("Childen retrieved attempt", { accountId: req.userId });
      const child_id = req.params.id;
      if (!child_id) {
        throw new BadRequestError("Child ID is required");
      }
      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }

      // Check if parent profile already exists BEFORE processing files
      const parentProfile = await ParentRepository.findByAccountId(req.userId);

      if (!parentProfile) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // Only process the profile pic if it was uploaded

      const child = await ChildRepository.findById(child_id);
      if (!child) {
        throw new NotFoundError("Child profile not found");
      }

      logger.debug("child created successfully", {
        child: child,
      });

      // Return success with parent profile
      return res.success("Childen retrieved successfully", {
        child: child,
      });
    } catch (error) {
      logger.error("Childen retrieved error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  deleteByChildProfile: async (req, res, next) => {
    try {
      logger.debug("Childen profile Delete attempt", { accountId: req.userId });
      const child_id = req.params.id;
      if (!child_id) {
        throw new BadRequestError("Child ID is required");
      }
      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }

      // Check if parent profile already exists BEFORE processing files
      const parentProfile = await ParentRepository.findByAccountId(req.userId);

      if (!parentProfile) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // Only process the profile pic if it was uploaded

      const child = await ChildRepository.findById(child_id);
      if (!child) {
        throw new NotFoundError("Child profile not found");
      }
      await ChildRepository.delete(child_id);
      logger.debug("child created successfully", {
        child: child,
      });

      // Return success with parent profile
      return res.success("Parent profile Delete successfully");
    } catch (error) {
      logger.error("Parent profile Deletetion error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
};

module.exports = childController;
