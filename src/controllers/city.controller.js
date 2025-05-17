const { NotFoundError } = require('../utils/errors/types/Api.error');
const loggingService = require('../services/logging.service');
const CityRepository = require('../data-access/city');
const GovernorateRepository = require('../data-access/governorate');

const logger = loggingService.getLogger();

const cityController = {
  // Get all cities
  getAllCities: async (req, res, next) => {
    try {
      logger.info('Fetching all cities');
      
      const cities = await CityRepository.findAll();
      
      return res.success('Cities fetched successfully', { cities });
    } catch (error) {
      logger.error('Error fetching cities', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  // Get city by id
  getCityById: async (req, res, next) => {
    try {
      const { id } = req.params;
      logger.info('Fetching city by id', { cityId: id });
      
      const city = await CityRepository.findById(id);
      
      if (!city) {
        throw new NotFoundError(`City with ID ${id} not found`);
      }
      
      return res.success('City fetched successfully', { city });
    } catch (error) {
      logger.error('Error fetching city', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  // Get cities by governorate
  getCitiesByGovernorate: async (req, res, next) => {
    try {
      const { governorateId } = req.params;
      logger.info('Fetching cities by governorate', { governorateId });
      
      // Check if governorate exists
      const governorate = await GovernorateRepository.findById(governorateId);
      
      if (!governorate) {
        throw new NotFoundError(`Governorate with ID ${governorateId} not found`);
      }
      
      const cities = await CityRepository.findAll({
        where: { governorate_id: governorateId }
      });
      
      return res.success('Cities fetched successfully', { cities, governorate });
    } catch (error) {
      logger.error('Error fetching cities by governorate', { error: error.message, stack: error.stack });
      next(error);
    }
  }
};

module.exports = cityController;
