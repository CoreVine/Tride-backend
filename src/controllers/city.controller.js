const { NotFoundError, BadRequestError } = require("../utils/errors/types/Api.error");
const loggingService = require("../services/logging.service");
const CityRepository = require("../data-access/city");
const GovernorateRepository = require("../data-access/governorate");

const logger = loggingService.getLogger();

const cityController = {
  // Get all cities
  getAllCities: async (req, res, next) => {
    try {
      logger.info("Fetching all cities");

      const cities = await CityRepository.findAll();

      return res.success("Cities fetched successfully", cities);
    } catch (error) {
      logger.error("Error fetching cities", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  // Get city by id
  getCityById: async (req, res, next) => {
    try {
      const { id } = req.params;
      logger.info("Fetching city by id", { cityId: id });

      const city = await CityRepository.findById(id);

      if (!city) {
        throw new NotFoundError(`City with ID ${id} not found`);
      }

      return res.success("City fetched successfully", city);
    } catch (error) {
      logger.error("Error fetching city", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  // Get cities by governorate
  getCitiesByGovernorate: async (req, res, next) => {
    try {
      const { governorateId } = req.params;
      logger.info("Fetching cities by governorate", { governorateId });

      // Check if governorate exists
      const governorate = await GovernorateRepository.findById(governorateId);

      if (!governorate) {
        throw new NotFoundError(
          `Governorate with ID ${governorateId} not found`
        );
      }

      const cities = await CityRepository.findAll({
        where: { governorate_id: governorateId },
      });

      return res.success("Cities fetched successfully", {
        cities,
        governorate,
      });
    } catch (error) {
      logger.error("Error fetching cities by governorate", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  /**
   * Create new city
   */
  async createCity(req, res, next) {
    try {
      const { name, governorate_id } = req.body;
      logger.info(
        `Creating new city: ${name} for country ID: ${governorate_id}`
      );

      if (!name) {
        throw new BadRequestError("City name is required");
      }

      if (!governorate_id) {
        throw new BadRequestError("Country ID is required");
      }

      // Verify Governorate exists
      const governorate = await GovernorateRepository.findById(governorate_id);
      if (!governorate) {
        logger.warn(`Governorate not found with ID: ${governorate_id}`);
        throw new NotFoundError("Governorate not found");
      }

      const city = await CityRepository.create({ name, governorate_id });

      // Get city with country information
      const cityWithCountry = await CityRepository.findById(city.id, {
        include: [{ association: "governorate" }],
      });

      logger.info(`City created successfully with ID: ${city.id}`);
      return res.success(
        "City created successfully",
        cityWithCountry,
        null,
        201
      );
    } catch (error) {
      logger.error("Error creating city", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  /**
   * Update city
   */
  async updateCity(req, res, next) {
    try {
      const { id } = req.params;
      const { name, governorate_id } = req.body;
      logger.info(`Updating city with ID: ${id}`);

      if (!name && !governorate_id) {
        throw new BadRequestError(
          "At least one field to update is required (name or governorate_id)"
        );
      }

      const city = await CityRepository.findById(id);

      if (!city) {
        logger.warn(`City not found for update with ID: ${id}`);
        throw new NotFoundError("City not found");
      }

      // If country_id is provided, verify the country exists
      if (governorate_id) {
        const governorate = await GovernorateRepository.findById(
          governorate_id
        );
        if (!governorate) {
          logger.warn(`Country not found with ID: ${governorate_id}`);
          throw new NotFoundError("Country not found");
        }
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (governorate_id) updateData.governorate_id = governorate_id;

      await CityRepository.update(id, updateData);

      const updatedCity = await CityRepository.findById(id, {
        include: [{ association: "governorate" }],
      });

      logger.info(`City updated successfully: ${updatedCity.name}`);
      return res.success("City updated successfully", updatedCity);
    } catch (error) {
      logger.error("Error updating city", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  /**
   * Delete city
   */
  async deleteCity(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`Deleting city with ID: ${id}`);

      const city = await CityRepository.findById(id);

      if (!city) {
        logger.warn(`City not found for deletion with ID: ${id}`);
        throw new NotFoundError("City not found");
      }

      // Check if city has hotels before deletion
      const cityWithParentsDriversSchools =
        await CityRepository.findByIdWithParentsDriversSchools(id);
      if (
        cityWithParentsDriversSchools.parents &&
        cityWithParentsDriversSchools.parents.length > 0 &&
        cityWithParentsDriversSchools.schools &&
        cityWithParentsDriversSchools.schools.length > 0 &&
        cityWithParentsDriversSchools.drivers &&
        cityWithParentsDriversSchools.drivers.length > 0
      ) {
        logger.warn(
          `Cannot delete city with ID: ${id} - has ${cityWithParentsDriversSchools.schools.length} schools,
          ${cityWithParentsDriversSchools.drivers.length} drivers,
          ${cityWithParentsDriversSchools.parents.length}
          parents`
        );
        throw new BadRequestError(
          "Cannot delete a city that has drivers , parents ,schools. Delete it first."
        );
      }

      await CityRepository.delete(id);

      logger.info(`City deleted successfully with ID: ${id}`);
      return res.success("City deleted successfully", null, null, 200);
    } catch (error) {
      logger.error("Error deleting city", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  /**
   * Search cities by name
   */
  async searchCities(req, res, next) {
    try {
      const { name } = req.query;
      logger.info(`Searching cities with name: ${name}`);

      if (!name) {
        throw new BadRequestError("Name query parameter is required");
      }

      const cities = await CityRepository.findByName(name);

      logger.info(`Found ${cities.length} cities matching search criteria`);
      return res.success("Cities retrieved successfully", cities);
    } catch (error) {
      logger.error("Error searching cities", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
};

module.exports = cityController;
