const AccountRepository = require("../data-access/accounts");
const SchoolRepository = require("../data-access/school");
const schoolRepository = require("../data-access/school");
const CityRepository = require("../data-access/city");
const loggingService = require("../services/logging.service");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors/types/Api.error");
const { where } = require("sequelize");
const logger = loggingService.getLogger();

const schoolController = {
  createschool: async (req, res, next) => {
    try {
      logger.info("School profile creation attempt", { accountId: req.userId });

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

      // Check if School profile already exists BEFORE processing files
      const city_id = req.query.city_id;
      if (!city_id) {
        throw new BadRequestError("City ID is required");
      }
      const city = await CityRepository.findById(city_id);
      if (!city) {
        throw new BadRequestError("School profile not exists for this account");
      }

      const { school_name, lat, lng } = req.body;
      if (!school_name || !lat || !lng) {
        throw new BadRequestError(
          "School name, latitude and longitude are required"
        );
      }
      // Only process the profile pic if it was uploaded

      // Create School profile
      const school = await schoolRepository.create({
        city_id: city_id,
        school_name: school_name,
        lat: lat,
        lng: lng,
      });

      logger.info("School created successfully", school);

      // Return success with School profile
      return res.success("School profile created successfully", school);
    } catch (error) {
      logger.error("School profile creation error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  getschoolForCity: async (req, res, next) => {
    try {
      logger.info("chidlens get creation attempt", { accountId: req.userId });

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
      const city_id = req.query.city_id;
      if (!city_id) {
        throw new BadRequestError("City ID is required");
      }
      const city = await CityRepository.findById(city_id);
      if (!city) {
        throw new BadRequestError("School profile not exists for this account");
      }
      // Check if School profile already exists BEFORE processing files
      const schools = await SchoolRepository.findAll({
        where: { city_id: city_id },
        include: [
          {
            association: "city",
            attributes: ["id", "name"],
          },
        ],
      });

      logger.info("school retrieved successfully", schools);

      // Return success with School profile
      return res.success("schools retrieved successfully", schools);
    } catch (error) {
      logger.error("schools creation error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  updateschool: async (req, res, next) => {
    try {
      logger.info("School profile Update attempt", { accountId: req.userId });

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
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError("School ID is required");
      }
      const school = await schoolRepository.findById(id);
      if (!school) {
        throw new NotFoundError("School profile not found");
      }

      const { school_name, lat, lng, city_id } = req.body;

      if (city_id) {
        const city = await CityRepository.findById(city_id);
        if (!city) {
          throw new BadRequestError("City not found");
        }
      }
      await schoolRepository.update(id, {
        city_id: city_id || school.city_id,
        school_name: school_name || school.school_name,
        lat: lat || school.lat,
        lng: lng || school.lng,
      });
      const newSchool = await schoolRepository.findById(id);
      if (!newSchool) {
        throw new NotFoundError("School profile not found");
      }
      logger.info("School Update successfully", newSchool);

      // Return success with School profile
      return res.success("School Update successfully", newSchool);
    } catch (error) {
      logger.error("School profile Update error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  getschoolByID: async (req, res, next) => {
    try {
      logger.info("School retrieved by id attempt", { accountId: req.userId });

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
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError("School ID is required");
      }
      const school = await schoolRepository.findById(id);
      if (!school) {
        throw new NotFoundError("School profile not found");
      }
      logger.info("School retrieved by id successfully", school);

      // Return success with School profile
      return res.success("School retrieved by id successfully", school);
    } catch (error) {
      logger.error("School retrieved error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
  deleteSchollByID: async (req, res, next) => {
    try {
      logger.info("School Delete attempt", { accountId: req.userId });

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
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError("School ID is required");
      }
      const school = await schoolRepository.findById(id);
      if (!school) {
        throw new NotFoundError("School profile not found");
      }

      await schoolRepository.delete(id);

      logger.info("School Delete successfully");

      // Return success with School profile
      return res.success("School Delete successfully");
    } catch (error) {
      logger.error("School Delete error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
};

module.exports = schoolController;
