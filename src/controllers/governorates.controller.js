const GovernorateRepository = require("../data-access/governorate")
const { BadRequestError, NotFoundError } = require("../utils/errors")
const loggingService = require("../services/logging.service")

const logger = loggingService.getLogger()

module.exports = {
  /**
   * Get all Governorates
   */
  async getAllGovernorates(req, res, next) {
    try {
      logger.info("Fetching all Governorates")

      const Governorates = await GovernorateRepository.findAll({
        order: [["governorate_name", "ASC"]]
      })

      return res.success("Governorates retrieved successfully", Governorates)
    } catch (error) {
      logger.error("Error fetching Governorates", { error: error.message })
      next(error)
    }
  },

  async getPaginatedGovernorates(req, res, next) {
    try {
      const { page, limit } = req.query
      logger.info(`Fetching paginated Governorates: page ${page}, limit ${limit}`)

      const Governorates = await GovernorateRepository.findAllPaginated(page, limit, {
        order: [["governorate_name", "ASC"]]
      })

      return res.success("Governorates retrieved successfully", Governorates)
    } catch (error) {
      logger.error("Error fetching paginated Governorates", {
        error: error.message
      })
      next(error)
    }
  },

  /**
   * Get Governorate by ID with cities
   */
  async getGovernorateById(req, res, next) {
    try {
      const { id } = req.params
      logger.info(`Fetching Governorate with ID: ${id}`)

      const Governorate = await GovernorateRepository.findByIdWithCities(id)

      if (!Governorate) {
        logger.warn(`Governorate not found with ID: ${id}`)
        throw new NotFoundError("Governorate not found")
      }

      logger.info(`Governorate retrieved successfully: ${Governorate.name}`)
      return res.success("Governorate retrieved successfully", Governorate)
    } catch (error) {
      logger.error("Error fetching Governorate", {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  },

  /**
   * Create new Governorate
   */
  async createGovernorate(req, res, next) {
    try {
      const { governorate_name } = req.body
      logger.info(`Creating new Governorate: ${governorate_name}`)

      if (!governorate_name) {
        throw new BadRequestError("Governorate name is required")
      }

      const Governorate = await GovernorateRepository.create({
        governorate_name
      })

      logger.info(`Governorate created successfully with ID: ${Governorate.id}`)
      return res.success("Governorate created successfully", Governorate, null, 201)
    } catch (error) {
      logger.error("Error creating Governorate", {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  },

  /**
   * Update Governorate
   */
  async updateGovernorate(req, res, next) {
    try {
      const { id } = req.params
      const { governorate_name } = req.body
      logger.info(`Updating Governorate with ID: ${id}`)

      if (!governorate_name) {
        throw new BadRequestError("Governorate name is required")
      }

      const Governorate = await GovernorateRepository.findById(id)

      if (!Governorate) {
        logger.warn(`Governorate not found for update with ID: ${id}`)
        throw new NotFoundError("Governorate not found")
      }

      await GovernorateRepository.update(id, { governorate_name })

      const updatedGovernorate = await GovernorateRepository.findById(id)

      logger.info(`Governorate updated successfully: ${updatedGovernorate.governorate_name}`)
      return res.success("Governorate updated successfully", updatedGovernorate)
    } catch (error) {
      logger.error("Error updating Governorate", {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  },

  /**
   * Delete Governorate with all its cities
   */
  async deleteGovernorate(req, res, next) {
    try {
      const { id } = req.params
      logger.info(`Deleting Governorate with ID: ${id} and all its cities`)

      const Governorate = await GovernorateRepository.findById(id)

      if (!Governorate) {
        logger.warn(`Governorate not found for deletion with ID: ${id}`)
        throw new NotFoundError("Governorate not found")
      }

      try {
        const result = await GovernorateRepository.deleteWithCities(id)
        logger.info(`Governorate deleted successfully with ID: ${id} along with ${result.citiesDeleted} cities`)
        return res.success(result.message)
      } catch (error) {
        if (error.message.includes("Cannot delete Governorate because")) {
          logger.warn(`Cannot delete Governorate - ${error.message}`)
          throw new BadRequestError(error.message)
        }
        throw error
      }
    } catch (error) {
      logger.error("Error deleting Governorate", {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  },

  /**
   * Search Governorates by name
   */
  async searchGovernorates(req, res, next) {
    try {
      const { name } = req.query
      logger.info(`Searching Governorates with name: ${name}`)

      if (!name) {
        throw new BadRequestError("Name query parameter is required")
      }

      const Governorates = await GovernorateRepository.findByName(name)

      logger.info(`Found ${Governorates.length} Governorates matching search criteria`)
      return res.success("Governorates retrieved successfully", Governorates)
    } catch (error) {
      logger.error("Error searching Governorates", {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  }
}
