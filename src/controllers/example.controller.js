const { NotFoundError } = require('../utils/errors/types/Api.error');
const loggingService = require('../services/logging.service');
const { createPagination } = require('../utils/responseHandler');
const logger = loggingService.getLogger();

/**
 * Example controller to demonstrate typical CRUD operations
 * Replace with your own implementation
 */
const exampleController = {
  /**
   * Get all examples with pagination
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  getAll: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      
      // TODO: Replace with actual repository call
      // Example: const { count, rows } = await exampleRepository.findAllPaginated(page, limit);
      
      // Mock response for template purposes
      const count = 100;
      const rows = [
        { id: 1, name: 'Example 1', status: 'active' },
        { id: 2, name: 'Example 2', status: 'inactive' }
      ];
      
      // Use the createPagination utility from responseHandler
      const pagination = createPagination(page, limit, count);
      
      logger.info('Examples retrieved successfully', { count, page, limit });
      return res.success('Examples retrieved successfully', rows, pagination);
    } catch (error) {
      logger.error('Error retrieving examples', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  /**
   * Get example by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validation should be done in routes with middleware      
      // TODO: Replace with actual repository call
      // Example: const example = await exampleRepository.findById(id);
      
      // Mock response for template purposes
      const example = id == 1 
        ? { id: 1, name: 'Example 1', status: 'active' } 
        : null;
      
      if (!example) {
        logger.warn(`Example with ID ${id} not found`);
        throw new NotFoundError(`Example with ID ${id} not found`);
      }
      
      logger.info(`Example retrieved successfully`, { id });
      return res.success('Example retrieved successfully', example);
    } catch (error) {
      logger.error(`Error retrieving example with ID ${req.params.id}`, { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  /**
   * Create new example
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  create: async (req, res, next) => {
    try {
      const data = req.body;
      
      // Validation should be done in routes with middleware
      
      // TODO: Replace with actual repository call
      // Example: const example = await exampleRepository.create(data);
      
      // Mock response for template purposes
      const example = {
        id: Math.floor(Math.random() * 1000) + 1,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      logger.info('Example created successfully', { id: example.id });
      return res.success('Example created successfully', example, null, 201);
    } catch (error) {
      logger.error('Error creating example', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  /**
   * Update example by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // Validation should be done in routes with middleware
      
      // TODO: Replace with actual repository calls
      // Example: 
      // const exists = await exampleRepository.exists(id);
      // if (!exists) throw new NotFoundError(`Example with ID ${id} not found`);
      // const updated = await exampleRepository.update(id, data);
      // const example = await exampleRepository.findById(id);
      
      // Mock response for template purposes
      const example = {
        id: parseInt(id),
        ...data,
        updated_at: new Date().toISOString()
      };
      
      logger.info('Example updated successfully', { id });
      return res.success('Example updated successfully', example);
    } catch (error) {
      logger.error(`Error updating example with ID ${req.params.id}`, { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  /**
   * Delete example by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validation should be done in routes with middleware
      
      // TODO: Replace with actual repository call
      // Example: 
      // const exists = await exampleRepository.exists(id);
      // if (!exists) throw new NotFoundError(`Example with ID ${id} not found`);
      // await exampleRepository.delete(id);
      
      logger.info('Example deleted successfully', { id });
      return res.success('Example deleted successfully');
    } catch (error) {
      logger.error(`Error deleting example with ID ${req.params.id}`, { error: error.message, stack: error.stack });
      next(error);
    }
  }
};

module.exports = exampleController;
