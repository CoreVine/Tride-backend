# Developer Guide

This document provides detailed information about the project structure, how to add new features, and development best practices for the Express Sequelize Boilerplate.

## Table of Contents

- [Developer Guide](#developer-guide)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [Core Concepts](#core-concepts)
    - [Response Handling](#response-handling)
      - [Success Responses](#success-responses)
      - [Error Handling](#error-handling)
    - [Authentication System](#authentication-system)
      - [Components](#components)
      - [Custom Auth Middlewares](#custom-auth-middlewares)
    - [Error Handling System](#error-handling-system)
      - [Error Types](#error-types)
    - [Rate Limiting](#rate-limiting)
      - [Standard Rate Limiting](#standard-rate-limiting)
      - [Strict Rate Limiting](#strict-rate-limiting)
      - [Custom Rate Limiting](#custom-rate-limiting)
      - [Rate Limit Headers](#rate-limit-headers)
    - [Pagination](#pagination)
    - [File Uploads](#file-uploads)
    - [Logging](#logging)
  - [Adding New Features](#adding-new-features)
    - [Creating Models](#creating-models)
    - [Creating Repositories](#creating-repositories)
    - [Creating Controllers](#creating-controllers)
    - [Creating Routes](#creating-routes)
    - [Creating Validations](#creating-validations)
      - [1. Inline Schema Definition (Simple)](#1-inline-schema-definition-simple)
      - [2. Multiple Source Validation](#2-multiple-source-validation)
  - [Middlewares](#middlewares)
    - [Authentication Middleware](#authentication-middleware)
    - [Role-Based Authorization Middlewares](#role-based-authorization-middlewares)
      - [1. isAdmin Middleware](#1-isadmin-middleware)
      - [2. isUser Middleware](#2-isuser-middleware)
    - [Validation Middleware](#validation-middleware)
    - [Response Middleware](#response-middleware)
    - [Error Handler Middleware](#error-handler-middleware)
    - [Multer Error Handler](#multer-error-handler)
    - [File Upload Middleware](#file-upload-middleware)
      - [Basic Usage](#basic-usage)
      - [Configuring the Uploader](#configuring-the-uploader)
      - [Handling Multiple Files](#handling-multiple-files)
      - [Using S3 Storage](#using-s3-storage)
      - [Deleting Uploaded Files](#deleting-uploaded-files)
      - [Custom File Filters](#custom-file-filters)
    - [Rate Limiting Middleware](#rate-limiting-middleware)
      - [Global Rate Limiting](#global-rate-limiting)
      - [Route-Specific Rate Limiting](#route-specific-rate-limiting)
      - [Sensitive Routes Protection](#sensitive-routes-protection)
    - [Creating Custom Middlewares](#creating-custom-middlewares)
  - [Application Setup and Configuration](#application-setup-and-configuration)
    - [Environment Variables](#environment-variables)
    - [Setting Up Different Environments](#setting-up-different-environments)
    - [Database Setup](#database-setup)
    - [AWS S3 Integration](#aws-s3-integration)
  - [Getting Started: Creating a Complete Feature](#getting-started-creating-a-complete-feature)
    - [1. Plan Your Feature](#1-plan-your-feature)
    - [2. Create the Database Migration](#2-create-the-database-migration)
    - [3. Create the Model](#3-create-the-model)
    - [4. Create the Repository](#4-create-the-repository)
    - [5. Create Validation Schemas](#5-create-validation-schemas)
    - [6. Create the Controller](#6-create-the-controller)
    - [7. Create Routes](#7-create-routes)
    - [8. Test the Feature](#8-test-the-feature)
    - [9. Document the API](#9-document-the-api)
  - [Best Practices](#best-practices)
    - [Repository Pattern](#repository-pattern)
    - [Error Handling](#error-handling-1)
    - [Security](#security)
    - [Database Management](#database-management)
    - [Performance](#performance)
    - [API Design](#api-design)
    - [Code Quality](#code-quality)
    - [Monitoring and Maintenance](#monitoring-and-maintenance)
  - [Testing](#testing)
  - [Contributing](#contributing)

## Project Structure

```
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # Database configuration
│   │   ├── multer.config.js # File upload configuration
│   │   └── ...
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   └── ...
│   ├── data-access/         # Repository layer for database operations
│   │   ├── base.repository.js
│   │   ├── users/
│   │   ├── products/
│   │   └── ...
│   ├── database/            # Database migrations and seeders
│   │   ├── migrations/
│   │   └── seeders/
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   ├── validation.middleware.js
│   │   └── ...
│   ├── models/              # Sequelize models
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── ...
│   ├── routes/              # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── ...
│   ├── services/            # Business logic and external services
│   │   ├── aws.service.js
│   │   ├── jwt.service.js
│   │   ├── sequelize.service.js
│   │   ├── express.service.js
│   │   ├── rateLimit.service.js
│   │   └── ...
│   ├── utils/               # Utility functions and helpers
│   │   ├── errors/
│   │   ├── responseHandler.js
│   │   └── ...
│   └── index.js             # Application entry point
├── .env                     # Environment variables
├── .sequelizerc             # Sequelize configuration
├── package.json
└── README.md
```

## Core Concepts

### Response Handling

The boilerplate provides a standardized way to format API responses and handle errors.

#### Success Responses

The application uses the `res.success()` method (added by the response middleware) to send consistent success responses:

```javascript
// Basic success response
return res.success('Item created successfully', item);

// With pagination
return res.success('Items retrieved successfully', rows, pagination, 200);
```

The response format will be:

```json
{
  "success": true,
  "message": "Item created successfully",
  "status": 200,
  "data": {
    "id": 1,
    "name": "Example Item",
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
}
```

With pagination, it includes additional metadata:

```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "status": 200,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Error Handling

For error handling, use the custom error classes and pass them to the `next()` function:

```javascript
try {
  const user = await UserRepository.findById(id);
  
  if (!user) {
    // This error will be caught by the global error handler
    throw new NotFoundError('User not found');
  }
  
  // Continue processing if user exists...
} catch (error) {
  // Log the error and pass to the global handler
  logger.error('Error retrieving user', { error });
  next(error);
}
```

The error will be formatted as:

```json
{
  "success": false,
  "message": "User not found",
  "status": 404
}
```

### Authentication System

The authentication system uses JWT (JSON Web Tokens) for user authentication and authorization.

#### Components

1. `auth.controller.js`: Handles user registration, login, and profile retrieval
2. `auth.middleware.js`: Validates JWT tokens and adds user information to request
3. `jwt.service.js`: Creates and verifies JWT tokens

#### Custom Auth Middlewares

To create authorization middleware, use this pattern:

```javascript
// src/middlewares/isAdmin.middleware.js
const { ForbiddenError } = require('../utils/errors/types/Api.error');

const isAdminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new ForbiddenError('Admin access required'));
  }
};

module.exports = isAdminMiddleware;
```

### Error Handling System

The boilerplate includes a comprehensive error handling system:

1. `errorHandler.middleware.js`: Catches and formats all errors
2. `Api.error.js`: Base error classes for different HTTP status codes
3. `responseHandler.js`: Standardizes API responses

#### Error Types

The application provides the following error types:

1. **Base Errors**:
   - `BaseError`: Abstract base error class for all custom errors

2. **API Errors** (all extend from ApiError, which extends BaseError):
   - `NotFoundError` (404): Resource not found
   - `BadRequestError` (400): Invalid request parameters or format
   - `ValidationError` (400): Request data failed validation
   - `UnauthorizedError` (401): Authentication required or failed
   - `ForbiddenError` (403): Permission denied
   - `InternalServerError` (500): Server-side error
   - `BadTokenError` (401): Invalid authentication token
   - `TokenExpiredError` (401): Authentication token expired

3. **Database Errors**:
   - `DatabaseError` (500): Database operation failed

To use custom errors:

```javascript
const { NotFoundError, BadRequestError } = require('../utils/errors/types/Api.error');

// Throw an error
throw new NotFoundError('Resource not found');
```

### Rate Limiting

The application includes a rate limiting system to protect against abuse and DoS attacks. Rate limiting restricts the number of requests a client can make within a specific time window.

#### Standard Rate Limiting

By default, a standard rate limiter is applied to all API routes:

```javascript
// This is applied automatically in express.service.js
server.use(rateLimitService.standardLimiter());
```

The standard limiter allows:
- 100 requests per 15-minute window per IP address
- Appropriate headers to inform clients about limits
- Custom error responses when limits are exceeded

#### Strict Rate Limiting

For sensitive operations like authentication, a stricter rate limiter is available:

```javascript
const { strictLimiter } = require('../services/rateLimit.service');

// Apply to login route
router.post('/login', strictLimiter(), authController.login);
```

The strict limiter allows:
- 10 requests per hour per IP address
- Suitable for protecting authentication endpoints from brute force attacks

#### Custom Rate Limiting

Create custom rate limiters for specific requirements:

```javascript
const { createLimiter } = require('../services/rateLimit.service');

// Create a custom rate limiter
const apiKeyLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many API requests, please slow down'
});

// Apply to a route
router.get('/external-api', apiKeyLimiter, controller.fetchExternalData);
```

#### Rate Limit Headers

Rate limit information is included in response headers:
- `RateLimit-Limit`: Maximum requests allowed in the window
- `RateLimit-Remaining`: Remaining requests in the current window
- `RateLimit-Reset`: Time when the rate limit window resets (in seconds)

### Pagination

The boilerplate includes pagination support for listing endpoints:

```javascript
const { count, rows } = await repository.findAllPaginated(page, limit, options);
const pagination = createPagination(page, limit, count);

return res.success('Items retrieved', rows, pagination);
```

### File Uploads

File uploads are handled using Multer and can be stored locally or on AWS S3:

1. `multer.config.js`: Configure file upload settings
2. `aws.service.js`: Handle S3 uploads

To use file uploads in a route:

```javascript
const multerConfig = require('../config/multer.config');
const upload = multerConfig.createUploader();

// Single file upload
router.post('/upload', upload.single('file'), controller.uploadHandler);

// Multiple file upload
router.post('/upload-multiple', upload.array('files', 5), controller.uploadMultipleHandler);
```

### Logging

The boilerplate uses a dedicated logging service:

```javascript
const loggingService = require('../services/logging.service');
const logger = loggingService.getLogger();

// Usage
logger.info('This is an info message', { context: 'additional data' });
logger.error('This is an error', { error });
logger.warn('This is a warning');
logger.debug('This is a debug message');
```

## Adding New Features

### Creating Models

Models represent your database tables. To create a new model:

1. Create a new file in the `src/models` directory:

```javascript
// src/models/YourModel.js
import Sequelize, { Model } from "sequelize";

class YourModel extends Model {
  static init(sequelize) {
    super.init(
      {
        model_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        // Add other fields
      },
      {
        sequelize,
        modelName: 'YourModel',
        tableName: 'your_table_name',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );
    
    return this;
  }

  static associate(models) {
    // Define associations here
    this.belongsTo(models.OtherModel, {
      foreignKey: 'other_model_id',
      as: 'otherModel'
    });
  }
}

export default YourModel;
```

Models are automatically loaded by the application - no need to register them manually. The `sequelize.service.js` file dynamically imports all models from the models directory.

2. Create a migration file for your model:

```bash
yarn sequelize migration:generate --name create-your-model-table
```

3. Edit the generated migration file:

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('your_table_name', {
      model_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      // Add other fields
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('your_table_name');
  }
};
```

### Creating Repositories

Repositories handle database operations for specific models. To create a new repository:

1. Create a directory for the repository in `src/data-access`:

```
mkdir -p src/data-access/your-models
```

2. Create an index.js file in the new directory:

```javascript
// src/data-access/your-models/index.js
import YourModel from '../../models/YourModel';
import BaseRepository from '../base.repository';
import { DatabaseError, Op } from "sequelize";

class YourModelRepository extends BaseRepository {
    constructor() {
        super(YourModel);
    }

    async findByName(name) {
        try {
            return await this.model.findOne({
                where: { name }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
    
    // Add other custom query methods
    
    async findAllPaginated(page = 1, limit = 10) {
        try {
            const options = {
                order: [['created_at', 'DESC']]
            };
            
            return await this.findAllPaginated(page, limit, options);
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new YourModelRepository();
```

### Creating Controllers

Controllers handle HTTP requests and responses. To create a new controller:

1. Create a file in the `src/controllers` directory:

```javascript
// src/controllers/your-model.controller.js
const YourModelRepository = require('../data-access/your-models');
const { createPagination } = require('../utils/responseHandler');
const { BadRequestError, NotFoundError } = require('../utils/errors/types/Api.error');
const loggingService = require('../services/logging.service');
const logger = loggingService.getLogger();

const yourModelController = {
  getAll: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      
      const { count, rows } = await YourModelRepository.findAllPaginated(page, limit);
      
      const pagination = createPagination(page, limit, count);
      
      return res.success('Items retrieved successfully', rows, pagination);
    } catch (error) {
      logger.error('Error retrieving items', { error });
      next(error);
    }
  },
  
  getOne: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const item = await YourModelRepository.findById(id);
      
      if (!item) {
        throw new NotFoundError('Item not found');
      }
      
      return res.success('Item retrieved successfully', item);
    } catch (error) {
      logger.error(`Error retrieving item with ID ${req.params.id}`, { error });
      next(error);
    }
  },
  
  create: async (req, res, next) => {
    try {
      const item = await YourModelRepository.create(req.body);
      
      return res.success('Item created successfully', item);
    } catch (error) {
      logger.error('Error creating item', { error });
      next(error);
    }
  },
  
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const updated = await YourModelRepository.update(id, req.body);
      
      if (!updated) {
        throw new NotFoundError('Item not found');
      }
      
      const item = await YourModelRepository.findById(id);
      
      return res.success('Item updated successfully', item);
    } catch (error) {
      logger.error(`Error updating item with ID ${req.params.id}`, { error });
      next(error);
    }
  },
  
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const deleted = await YourModelRepository.delete(id);
      
      if (!deleted) {
        throw new NotFoundError('Item not found');
      }
      
      return res.success('Item deleted successfully');
    } catch (error) {
      logger.error(`Error deleting item with ID ${req.params.id}`, { error });
      next(error);
    }
  }
};

module.exports = yourModelController;
```

### Creating Routes

Routes define the API endpoints. To create new routes:

1. Create a file in the `src/routes` directory:

```javascript
// src/routes/your-model.routes.js
const { Router } = require('express');
const yourModelController = require('../controllers/your-model.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const Yup = require('yup');

// Define validation schemas directly in the route file
const yourModelSchema = Yup.object().shape({
  name: Yup.string().required(),
  description: Yup.string().nullable()
  // Add other validations
});

const yourModelRoutes = Router();

// Get all items
yourModelRoutes.get(
  '/your-models',
  yourModelController.getAll
);

// Get one item
yourModelRoutes.get(
  '/your-models/:id',
  validate(Yup.object().shape({
    id: Yup.number().positive().integer().required()
  }), 'params'),
  yourModelController.getOne
);

// Create a new item (protected route)
yourModelRoutes.post(
  '/your-models',
  authMiddleware,
  validate(yourModelSchema),
  yourModelController.create
);

// Update an item (protected route)
yourModelRoutes.put(
  '/your-models/:id',
  authMiddleware,
  validate(Yup.object().shape({
    id: Yup.number().positive().integer().required()
  }), 'params'),
  validate(yourModelSchema),
  yourModelController.update
);

// Delete an item (protected route)
yourModelRoutes.delete(
  '/your-models/:id',
  authMiddleware,
  validate(Yup.object().shape({
    id: Yup.number().positive().integer().required()
  }), 'params'),
  yourModelController.delete
);

module.exports = yourModelRoutes;
```

Routes are automatically loaded by the application - no need to register them manually. The `express.service.js` file dynamically imports all route files from the routes directory.

### Creating Validations

Validations are handled by the `validation.middleware.js` file which uses Yup for schema validation. There are two ways to create validations:

#### 1. Inline Schema Definition (Simple)

```javascript
// In your route file
const Yup = require('yup');
const validate = require('../middlewares/validation.middleware');

// Define schema directly in the route
router.post(
  '/resource',
  validate(Yup.object().shape({
    name: Yup.string().required(),
    email: Yup.string().email().required()
  })), 
  controller.createResource
);
```

#### 2. Multiple Source Validation

When you need to validate multiple sources (body, params, query):

```javascript
// In your route file
const Yup = require('yup');
const validate = require('../middlewares/validation.middleware');

// Validate multiple sources
router.put(
  '/resources/:id',
  validate({
    params: Yup.object().shape({
      id: Yup.number().positive().integer().required()
    }),
    body: Yup.object().shape({
      name: Yup.string().required(),
      description: Yup.string()
    })
  }),
  controller.updateResource
);
```

The validation middleware will handle validation errors and format them appropriately.

## Middlewares

The application includes several middleware functions that handle different aspects of the request/response cycle.

### Authentication Middleware

`auth.middleware.js` verifies JWT tokens and adds user information to the request.

**Usage:**

```javascript
const authMiddleware = require('../middlewares/auth.middleware');

// Protect a route with authentication
router.get('/protected-resource', authMiddleware, controller.getResource);
```

When a request is made to a protected route:
- The middleware extracts the token from the Authorization header or cookies
- Verifies the token's validity
- Adds the user ID to the request object as `req.userId`
- If the token is invalid or missing, returns a 401 error

### Role-Based Authorization Middlewares

These middlewares check if the authenticated user has specific roles:

#### 1. isAdmin Middleware

`isAdmin.middleware.js` ensures the user has admin privileges:

```javascript
const isAdmin = require('../middlewares/isAdmin.middleware');

router.delete('/users/:id', authMiddleware, isAdmin, userController.delete);
```

#### 2. isUser Middleware

`isUser.middleware.js` ensures the authenticated user exists in the database:

```javascript
const isUser = require('../middlewares/isUser.middleware');

router.get('/user-dashboard', authMiddleware, isUser, dashboardController.getUserDashboard);
```

### Validation Middleware

`validation.middleware.js` validates request data against Yup schemas:

```javascript
const validate = require('../middlewares/validation.middleware');
const Yup = require('yup');

// Define a validation schema
const userSchema = Yup.object().shape({
  name: Yup.string().required(),
  email: Yup.string().email().required()
});

// Apply validation to a route
router.post('/users', validate(userSchema), userController.create);

// Validate parameters
router.get('/users/:id', validate(Yup.object().shape({
  id: Yup.number().integer().positive().required()
}), 'params'), userController.getById);

// Validate multiple sources
router.put('/users/:id', validate({
  params: Yup.object().shape({
    id: Yup.number().integer().positive().required()
  }),
  body: userSchema
}), userController.update);
```

### Response Middleware

`response.middleware.js` adds standardized response methods to the Express response object:

- `res.success(message, data, pagination, status)`: Sends a successful response
- `res.error(message, status)`: Sends an error response

This middleware is applied globally, so these methods are available in all route handlers.

### Error Handler Middleware

`errorHandler.middleware.js` provides global error handling:

1. **globalErrorHandler**: Catches errors from all routes and formats them consistently
2. **notFoundHandler**: Handles 404 errors for undefined routes

These are applied at the application level:

```javascript
// In your main application setup
app.use(routes);
app.use('*', notFoundHandler);
app.use(globalErrorHandler);
```

### Multer Error Handler

`multerErrorHandler.middleware.js` catches and formats errors from the Multer file upload library:

```javascript
// In your main application setup
app.use(multerErrorHandler);
```

### File Upload Middleware

The application provides a flexible file upload system based on Multer. This is configured in `multer.config.js`.

#### Basic Usage

```javascript
const { createUploader } = require('../config/multer.config');

// Create an uploader with default settings (local storage)
const upload = createUploader();

// Add file upload to a route
router.post('/upload', upload.single('file'), controller.handleUpload);
```

#### Configuring the Uploader

```javascript
// Configure with options
const upload = createUploader({
  storageType: 'disk',  // 'disk' or 's3'
  uploadPath: 'uploads/profile-pictures',  // Directory for disk storage or prefix for S3
  fileFilter: 'images',  // Predefined filter or custom function
  fileSize: 2 * 1024 * 1024,  // 2MB max size
  fileNamePrefix: 'profile'  // Add prefix to filenames
});
```

#### Handling Multiple Files

```javascript
// Upload multiple files with the same field name
router.post('/gallery', upload.array('photos', 10), controller.uploadGallery);

// Upload multiple files with different field names
router.post('/product', upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'gallery', maxCount: 5 }
]), controller.createProduct);
```

#### Using S3 Storage

```javascript
// AWS S3 storage requires additional environment variables
const s3upload = createUploader({
  storageType: 's3',
  uploadPath: 'user-uploads/documents',
  fileFilter: 'documents'
});

router.post('/documents', s3upload.single('document'), controller.uploadDocument);
```

#### Deleting Uploaded Files

```javascript
const { deleteUploadedFile } = require('../config/multer.config');

// Delete a file (works for both local and S3 storage)
await deleteUploadedFile(filePath);
```

#### Custom File Filters

```javascript
const { createFileFilter } = require('../config/multer.config');

// Create a custom file filter
const csvFilter = createFileFilter(
  ['text/csv', 'application/vnd.ms-excel'],
  'Only CSV files are allowed'
);

// Use the custom filter
const upload = createUploader({
  fileFilter: csvFilter
});
```

### Rate Limiting Middleware

The application provides rate limiting middleware to protect your API from excessive requests and potential abuse.

#### Global Rate Limiting

Global rate limiting is applied to all routes by default in `express.service.js`:

```javascript
// Applied automatically to all routes
server.use(rateLimitService.standardLimiter());
```

This provides basic protection against abuse without additional configuration.

#### Route-Specific Rate Limiting

Apply different rate limits to specific routes:

```javascript
const rateLimitService = require('../services/rateLimit.service');

// Apply standard limiter to a specific route
router.get('/api/data', rateLimitService.standardLimiter(), controller.getData);

// Apply strict limiter to sensitive route
router.post('/api/password-reset', rateLimitService.strictLimiter(), controller.resetPassword);
```

#### Sensitive Routes Protection

For routes that need extra protection (login, registration, password reset):

```javascript
const { strictLimiter } = require('../services/rateLimit.service');

// Auth routes with stricter rate limiting
router.post('/login', strictLimiter(), authController.login);
router.post('/register', strictLimiter(), authController.register);
router.post('/forgot-password', strictLimiter(), authController.forgotPassword);
```

The strict limiter allows only 10 requests per hour, protecting against brute force attacks.

For custom requirements, create a custom limiter:

```javascript
const { createLimiter } = require('../services/rateLimit.service');

// Custom limiter for specific API endpoint
const userActionsLimiter = createLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 requests per 10 minutes
  message: 'Too many actions performed. Please try again later.'
});

router.post('/user/actions', userActionsLimiter, userController.performAction);
```

### Creating Custom Middlewares

To create your own middleware:

```javascript
/**
 * Custom middleware template
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
const customMiddleware = (req, res, next) => {
  // 1. Extract data or perform checks
  const someData = req.headers['x-custom-header'];
  
  // 2. Add data to the request object for later use
  req.customData = someData;
  
  // 3. Optionally end the request-response cycle early
  if (!someData) {
    return res.error('Missing required header', 400);
  }
  
  // 4. Call next() to continue to the next middleware or controller
  next();
};

module.exports = customMiddleware;
```

## Application Setup and Configuration

This section describes how to properly set up and configure the application for different environments.

### Environment Variables

The application uses the following environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| SERVER_PORT | Port on which the Express server runs | 3000 | No |
| NODE_ENV | Environment mode (development, production, test) | development | No |
| SERVER_JWT | Enable JWT authentication | true | No |
| SERVER_JWT_SECRET | Secret key for JWT signing | - | Yes, if JWT enabled |
| SERVER_JWT_USE_EXPIRY | Enable token expiration | true | No |
| SERVER_JWT_TIMEOUT | JWT token expiry time in seconds | 3600 | Yes, if USE_EXPIRY enabled |
| SERVER_JWT_REFRESH_ENABLED | Enable refresh token functionality | false | No |
| SERVER_JWT_REFRESH_SECRET | Secret for refresh token signing | - | Yes, if REFRESH_ENABLED |
| SERVER_JWT_REFRESH_MAX_AGE | Refresh token expiry time in seconds | 604800 | Yes, if REFRESH_ENABLED |
| DB_DIALECT | Database dialect (mysql, postgres, sqlite) | mysql | Yes |
| DB_HOST | Database host | localhost | Yes |
| DB_USER | Database username | - | Yes |
| DB_PASS | Database password | - | Yes |
| DB_NAME | Database name | - | Yes |
| AWS_KEYID | AWS access key ID for S3 | - | Only for S3 uploads |
| AWS_SECRETKEY | AWS secret access key | - | Only for S3 uploads |
| AWS_BUCKET | AWS S3 bucket name | - | Only for S3 uploads |

### Setting Up Different Environments

1. **Development**:
   - Set `NODE_ENV=development`
   - Detailed error messages are displayed
   - Sequelize logging is enabled

2. **Production**:
   - Set `NODE_ENV=production`
   - Generic error messages for clients
   - Optimized for performance
   - Logging focused on critical issues

3. **Testing**:
   - Set `NODE_ENV=test`
   - Uses separate test database

### Database Setup

1. Configure database connection in `.env`
2. Run migrations: `yarn sequelize db:migrate`
3. Run seeders (if needed): `yarn sequelize db:seed:all`

### AWS S3 Integration

For file uploads to S3:

1. Create an AWS account and S3 bucket
2. Create an IAM user with S3 access
3. Set AWS environment variables in `.env`
4. In your code, use the S3 upload option: `createUploader({ storageType: 's3' })`

## Getting Started: Creating a Complete Feature

This section provides a step-by-step guide to creating a complete feature in the application.

### 1. Plan Your Feature

- Define the model/entity and its attributes
- Determine required API endpoints
- Identify relationships with other models
- Consider validation requirements

### 2. Create the Database Migration

- Generate a migration file
- Define table structure
- Add indexes and foreign keys
- Run the migration

### 3. Create the Model

- Define Sequelize model
- Set up associations
- Add any instance or static methods

### 4. Create the Repository

- Extend the base repository
- Add specific query methods
- Handle complex data operations

### 5. Create Validation Schemas

- Define Yup validation schemas
- Set field requirements and constraints
- Create composite validations if needed

### 6. Create the Controller

- Set up CRUD operation handlers
- Use repository for data access
- Handle errors properly
- Format responses consistently

### 7. Create Routes

- Define API endpoints
- Apply validation middleware
- Add authentication/authorization as needed
- Connect to controllers

### 8. Test the Feature

- Test each endpoint manually
- Write automated tests (if applicable)
- Verify error handling
- Check performance with larger datasets

### 9. Document the API

- Document endpoints
- Describe request/response formats
- Provide example requests

Following this workflow ensures a consistent approach to feature development and helps maintain code quality throughout the project.

## Best Practices

This section outlines recommended practices for developing with this boilerplate to ensure code quality, maintainability, and performance.

### Repository Pattern

The application implements the repository pattern to abstract database operations away from business logic:

1. **Use the BaseRepository for common operations:**
   - The `BaseRepository` provides standard CRUD methods (findAll, findById, create, update, delete)
   - Avoid duplicating these methods in your specific repositories
   ```javascript
   // Leverage the base repository methods
   const users = await userRepository.findAll();
   const user = await userRepository.findById(1);
   ```

2. **Create specific repositories for each model:**
   - Place repositories in the `src/data-access/{entity-name}` folder
   - Each repository should focus on a single model/entity
   - Name repository methods based on their purpose, not SQL operations:
     - Good: `findActiveUsers()`, `getUsersWithRoles()`
     - Avoid: `selectUsersWhereActive()`, `joinUsersAndRoles()`

3. **Implement custom query methods in repositories:**
   - Put all database query logic inside repository methods
   - Handle complex queries, joins, and transactions in the repository, not controllers
   ```javascript
   // In user repository
   async findActiveUsersByRole(role) {
     try {
       return await this.model.findAll({
         where: { 
           role,
           status: 'active'
         },
         order: [['created_at', 'DESC']]
       });
     } catch (error) {
       throw new DatabaseError(error);
     }
   }
   ```

4. **Error handling in repositories:**
   - Use try/catch blocks in repository methods
   - Wrap database errors in `DatabaseError` for consistent handling
   - Don't expose ORM-specific errors to controllers

5. **Transaction management:**
   - Create methods that accept transaction objects for coordinated operations
   - Handle commits and rollbacks in service layers when needed
   ```javascript
   // Repository method supporting transactions
   async updateUserProfile(userId, data, transaction = null) {
     const options = transaction ? { transaction } : {};
     return await this.model.update(data, { 
       where: { user_id: userId },
       ...options
     });
   }
   ```

### Error Handling

A robust error handling strategy is essential for application stability and security:

1. **Use custom error classes for different scenarios:**
   - Select the appropriate error type based on the situation
   - Be specific with error messages to help with debugging
   ```javascript
   // Instead of generic errors:
   if (!user) throw new Error('Problem with user');
   
   // Use specific errors with clear messages:
   if (!user) throw new NotFoundError('User with ID 123 not found');
   ```

2. **Central error handling:**
   - Let the global error handler format errors for clients
   - Pass errors to `next()` in controllers instead of handling responses there
   ```javascript
   try {
     // Operation that might fail
   } catch (error) {
     logger.error('Operation failed', { error });
     next(error); // Let the global handler take care of it
   }
   ```

3. **Validation errors:**
   - Use validation middleware to catch input errors early
   - Return all validation errors at once, not one by one
   - Be explicit about what went wrong and how to fix it

4. **Operational vs. Programmer errors:**
   - Operational errors (like validation errors) are expected - handle them gracefully
   - Programmer errors (like undefined variables) indicate bugs - log them thoroughly
   - Set `isOperational: true` for expected errors

5. **Security in error handling:**
   - Never expose stack traces or system details in production
   - Sanitize error messages before sending to clients
   - Log detailed errors server-side but return generic messages to users

### Security

Implementing robust security measures is critical for protecting your application and data:

1. **Authentication and Authorization:**
   - Use JWT tokens with appropriate expiration times
   - Store tokens securely (HTTP-only cookies when possible)
   - Implement role-based access control
   - Validate permissions for each sensitive operation
   ```javascript
   // Check if user has appropriate role before operation
   if (req.user.role !== 'admin') {
     throw new ForbiddenError('Admin access required');
   }
   ```

2. **Data Protection:**
   - Hash passwords with bcrypt (or similar algorithms) with appropriate salt rounds
   - Never store sensitive data in plain text
   - Use environment variables for sensitive configuration
   ```javascript
   // Hash password before storing
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

3. **Input Validation and Sanitization:**
   - Validate all input data regardless of source
   - Use Yup schemas to define expected data formats
   - Sanitize inputs to prevent XSS and injection attacks
   - Apply param validation for route parameters and query strings

4. **HTTP Security Headers:**
   - Set appropriate security headers for all responses
   - Use Helmet.js to simplify implementation
   ```javascript
   // In your app configuration
   app.use(helmet());
   ```

5. **Rate Limiting and Brute Force Protection:**
   - Implement rate limiting for authentication endpoints
   - Add temporary account lockouts after failed login attempts
   - Use CAPTCHA for public-facing forms

6. **HTTPS:**
   - Use HTTPS in all environments, including development
   - Configure proper SSL/TLS settings
   - Redirect HTTP to HTTPS

7. **Dependency Security:**
   - Regularly audit dependencies for vulnerabilities (npm audit)
   - Keep dependencies updated to secure versions
   - Minimize unnecessary dependencies

### Database Management

Proper database management ensures data integrity and application performance:

1. **Schema Design:**
   - Design schemas with normalization in mind
   - Use appropriate data types for columns
   - Set default values when meaningful
   - Add constraints to enforce data integrity

2. **Indexing Strategy:**
   - Create indexes on frequently queried columns
   - Add composite indexes for multi-column queries
   - Don't over-index as it affects write performance
   - Include indexing in migrations

3. **Migrations:**
   - Make migrations small and focused
   - Write both up and down migrations
   - Test migrations before applying to production
   - Version control all migrations

4. **Connection Management:**
   - Use connection pooling for efficiency
   - Set appropriate pool size based on workload
   - Handle connection errors gracefully
   - Close connections when not needed

5. **Data Seeding:**
   - Use factories to generate realistic test data
   - Create seeders for populating development and test databases
   - Structure seeders to maintain referential integrity
   - Build seeders that can be safely run multiple times

### Performance

Optimizing performance ensures a responsive and scalable application:

1. **Query Optimization:**
   - Use specific queries instead of retrieving unnecessary data
   - Select only needed columns rather than using `SELECT *`
   - Use `findOne()` over `findAll()` when retrieving a single record
   - Apply pagination for large result sets
   ```javascript
   // Instead of
   const users = await User.findAll();
   
   // Use pagination
   const { rows, count } = await User.findAndCountAll({
     offset: (page - 1) * limit,
     limit
   });
   ```

2. **Caching:**
   - Cache frequent and expensive database queries
   - Use Redis or memory cache for session data
   - Implement cache invalidation strategies
   - Consider caching at different levels (database, API, client)

3. **Asynchronous Processing:**
   - Move time-consuming tasks to background jobs
   - Use queues for handling operations that don't need immediate response
   - Implement retry mechanisms for failed operations

4. **Database Optimization:**
   - Use eager loading to avoid N+1 query problems
   ```javascript
   // Instead of loading associations separately
   const user = await User.findByPk(id);
   const posts = await user.getPosts();
   
   // Use eager loading
   const user = await User.findByPk(id, {
     include: [{ model: Post, as: 'posts' }]
   });
   ```
   - Use database indexes strategically
   - Consider read replicas for read-heavy applications

5. **API Response Optimization:**
   - Implement compression for HTTP responses
   - Structure API responses to minimize payload size
   - Use appropriate data formats (JSON vs. MessagePack)
   - Consider using HTTP/2 for multiplexing

### API Design

Following API design best practices ensures a consistent and usable interface:

1. **RESTful Resource Naming:**
   - Use nouns for resources, not verbs
   - Use plural forms for collection endpoints
   - Keep URLs simple and intuitive
   ```
   Good: /api/users, /api/users/123
   Avoid: /api/getUsers, /api/user_get/123
   ```

2. **Standard HTTP Methods:**
   - Use GET for retrieving data
   - Use POST for creating resources
   - Use PUT/PATCH for updating resources
   - Use DELETE for removing resources

3. **Status Codes:**
   - Use appropriate status codes for different scenarios
   - 200-299 for successful operations
   - 400-499 for client errors
   - 500-599 for server errors

4. **Versioning:**
   - Include API version in the URL or headers
   - Maintain backward compatibility when possible
   - Document breaking changes

5. **Response Format:**
   - Use consistent response structures across endpoints
   - Include metadata with responses (pagination, counts)
   - Handle errors in a consistent format

### Code Quality

Maintaining code quality is essential for long-term project health:

1. **Consistent Coding Style:**
   - Follow a consistent style guide (Airbnb, Standard.js, etc.)
   - Use ESLint and Prettier to enforce standards
   - Configure editorconfig for consistency across editors

2. **Code Organization:**
   - Keep functions small and focused on a single task
   - Organize code by feature when possible
   - Separate concerns (business logic vs. data access)
   - Use meaningful variable and function names
   ```javascript
   // Avoid
   function handle(d) {
     const r = doSomething(d);
     return r;
   }
   
   // Better
   function processUserData(userData) {
     const processedData = transformUserFields(userData);
     return processedData;
   }
   ```

3. **Documentation:**
   - Document public APIs and important functions
   - Use JSDoc comments for functions and classes
   - Keep README and other docs up-to-date
   - Document configuration options and environment variables

4. **Testing:**
   - Write unit tests for isolated functionality
   - Add integration tests for API endpoints
   - Implement test coverage reporting
   - Practice test-driven development when applicable

5. **Code Reviews:**
   - Review all code changes before merging
   - Use pull requests for meaningful changes
   - Focus on logic, security, and maintainability in reviews
   - Automate checks when possible (CI/CD pipeline)

6. **Refactoring:**
   - Regularly refactor complex or duplicate code
   - Address technical debt systematically
   - Follow the "Boy Scout Rule" (leave code cleaner than you found it)

### Monitoring and Maintenance

Keeping your application running smoothly in production:

1. **Logging:**
   - Use structured logging (JSON format)
   - Include contextual information in logs
   - Use different log levels appropriately
   - Avoid logging sensitive information

2. **Error Tracking:**
   - Implement automated error reporting
   - Set up alerts for critical errors
   - Track error trends over time

3. **Performance Monitoring:**
   - Monitor API response times
   - Track database query performance
   - Set up health check endpoints
   - Use APM tools when possible

4. **Backups:**
   - Regularly back up database and user content
   - Test backup restoration procedures
   - Implement point-in-time recovery options

5. **Updating Dependencies:**
   - Regularly update dependencies
   - Test thoroughly after updates
   - Plan for major version migrations

## Testing

Coming soon.

## Contributing

Please refer to the main README.md for contribution guidelines.
