const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors/types/Api.error');
const loggingService = require('../services/logging.service');
const AccountRepository = require('../data-access/accounts');
const ParentRepository = require('../data-access/parent');
const DriverRepository = require('../data-access/driver');
const DriverPapersRepository = require('../data-access/driverPapers');
const CityRepository = require('../data-access/city');
const JwtService = require('../services/jwt.service');
const { deleteUploadedFile } = require('../config/upload');

const logger = loggingService.getLogger();

const profileController = {
  // Create Parent Profile (Step 2 for parents)
  createParentProfile: async (req, res, next) => {
    try {
      logger.info('Parent profile creation attempt', { accountId: req.userId });
      
      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      
      if (!account) {
        throw new NotFoundError('Account not found');
      }
      
      if (!account.is_verified) {
        throw new ForbiddenError('Account email must be verified before creating a profile');
      }
      
      // Check if parent profile already exists BEFORE processing files
      const existingProfile = await ParentRepository.findByAccountId(req.userId);
      
      if (existingProfile) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError('Parent profile already exists for this account');
      }
      
      const cityExists = await CityRepository.exists(req.body.city_id);
      if (!cityExists) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError(`City with ID ${req.body.city_id} does not exist`);
      }
      
      // Only process the profile pic if it was uploaded
      const profilePicUrl = req.file ? req.file.path : null;
      
      // Create parent profile
      const parent = await ParentRepository.create({
        account_id: req.userId,
        name: req.body.name,
        phone: req.body.phone,
        gender: req.body.gender,
        city_id: req.body.city_id,
        google_place_id: req.body.google_place_id || null,
        lat: req.body.lat || null,
        lng: req.body.lng || null,
        formatted_address: req.body.formatted_address || null,
        profile_pic: profilePicUrl
      });
      
      logger.info('Parent profile created successfully', { 
        accountId: req.userId, 
        parentId: parent.id 
      });
      
      // Update JWT with new profile info
      const newToken = JwtService.jwtSign(req.userId, {
        accountType: 'parent',
        profileComplete: true,
        accountTypeId: parent.id
      });
      
      // Return success with parent profile
      return res.success('Parent profile created successfully', {
        parent,
        token: newToken.token,
        refreshToken: newToken.refreshToken
      });
    } catch (error) {
      logger.error('Parent profile creation error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  // Upload Parent ID Documents
  uploadParentIdDocuments: async (req, res, next) => {
    try {
      logger.info('Parent ID documents upload attempt', { accountId: req.userId });
      
      // Find parent profile first
      const parent = await ParentRepository.findByAccountId(req.userId);
      
      if (!parent) {
        // Clean up any uploaded files since we won't use them
        if (req.files) {
          Object.values(req.files).forEach(fileArray => {
            fileArray.forEach(async file => {
              deleteUploadedFile(file.path);
            });
          });
        }
        throw new NotFoundError('Parent profile not found');
      }
      
      // Check if required files are present
      if (!req.files || !req.files.front_side_nic || !req.files.back_side_nic) {
        throw new BadRequestError('Both front and back sides of ID card are required');
      }
      
      // Get document URLs from uploaded files
      const updateData = {
        front_side_nic: req.files.front_side_nic[0].path,
        back_side_nic: req.files.back_side_nic[0].path
      };
      
      // Update parent profile with document URLs
      await ParentRepository.update(parent.id, updateData);
      
      // Fetch updated profile
      const updatedParent = await ParentRepository.findById(parent.id);
      
      logger.info('Parent ID documents uploaded successfully', { 
        accountId: req.userId, 
        parentId: parent.id 
      });
      
      // Return success with updated profile
      return res.success('ID documents uploaded successfully', {
        parent: updatedParent
      });
    } catch (error) {
      logger.error('Parent ID documents upload error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  // Create Driver Profile (Step 2 for drivers)
  createDriverProfile: async (req, res, next) => {
    try {
      logger.info('Driver profile creation attempt', { accountId: req.userId });
      
      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      
      if (!account) {
        // Clean up file if uploaded
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new NotFoundError('Account not found');
      }
      
      if (!account.is_verified) {
        // Clean up file if uploaded
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new ForbiddenError('Account email must be verified before creating a profile');
      }
      
      // Check if driver profile already exists BEFORE processing files
      const existingProfile = await DriverRepository.findByAccountId(req.userId);
      
      if (existingProfile) {
        // Clean up file if uploaded
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError('Driver profile already exists for this account');
      }
      
      // Check for required profile picture
      if (!req.file) {
        throw new BadRequestError('Profile picture is required for driver registration');
      }
      
      const cityExists = await CityRepository.exists(req.body.city_id);
      if (!cityExists) {
        // Clean up file if uploaded
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new BadRequestError(`City with ID ${req.body.city_id} does not exist`);
      }
      
      // Get profile picture URL from uploaded file
      const profilePicUrl = req.file.path;
      
      // Create driver profile
      const driver = await DriverRepository.create({
        account_id: req.userId,
        name: req.body.name,
        phone: req.body.phone,
        license_number: req.body.license_number,
        gender: req.body.gender,
        city_id: req.body.city_id,
        lat: req.body.lat || null,
        lng: req.body.lng || null,
        formatted_address: req.body.formatted_address || null,
        profile_pic: profilePicUrl
      });
      
      logger.info('Driver profile created successfully', { 
        accountId: req.userId, 
        driverId: driver.id 
      });
      
      // Update JWT with new profile info - profile not complete since papers still needed
      const newToken = JwtService.jwtSign(req.userId, {
        accountType: 'driver',
        profileComplete: false,
        accountTypeId: driver.id,
        stepsCompleted: { basicInfo: true, papers: false }
      });
      
      // Return success with driver profile
      return res.success('Driver profile created successfully', {
        driver,
        token: newToken.token,
        refreshToken: newToken.refreshToken,
        nextStep: 'upload_papers'
      });
    } catch (error) {
      logger.error('Driver profile creation error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  // Upload Driver Papers (Step 3 for drivers)
  uploadDriverPapers: async (req, res, next) => {
    try {
      logger.info('Driver papers upload attempt', { accountId: req.userId });
      
      // Verify driver profile exists FIRST before processing any files
      const driver = await DriverRepository.findByAccountId(req.userId);
      
      if (!driver) {
        // Clean up any uploaded files since we won't use them
        if (req.files) {
          Object.values(req.files).forEach(fileArray => {
            fileArray.forEach(async file => {
              deleteUploadedFile(file.path);
            });
          });
        }
        throw new BadRequestError('Driver profile must be created before uploading papers');
      }
      
      // Check if papers already exist BEFORE processing files further
      const existingPapers = await DriverPapersRepository.findByDriverId(driver.id);
      
      if (existingPapers) {
        // Clean up any uploaded files since we won't use them
        if (req.files) {
          Object.values(req.files).forEach(fileArray => {
            fileArray.forEach(async file => {
              deleteUploadedFile(file.path);
            });
          });
        }
        throw new BadRequestError('Driver papers already uploaded');
      }
      
      // Check if all required files are present
      const requiredFields = ['front_side_national', 'back_side_national', 'driver_license', 'car_license'];
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!req.files || !req.files[field] || req.files[field].length === 0) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        // Clean up any uploaded files since we won't use them
        if (req.files) {
          Object.values(req.files).forEach(fileArray => {
            fileArray.forEach(async file => {
              deleteUploadedFile(file.path);
            });
          });
        }
        throw new BadRequestError(`The following documents are required: ${missingFields.join(', ')}`);
      }
      
      // Upload driver papers - now we're sure we have all required files
      const driverPapers = await DriverPapersRepository.create({
        driver_id: driver.id,
        front_side_national_url: req.files.front_side_national[0].path,
        back_side_national_url: req.files.back_side_national[0].path,
        car_model: req.body.car_model,
        car_model_year: req.body.car_model_year,
        driver_license_url: req.files.driver_license[0].path,
        driver_license_exp_date: req.body.driver_license_exp_date,
        car_license_url: req.files.car_license[0].path,
        car_license_exp_date: req.body.car_license_exp_date,
        face_auth_complete: req.body.face_auth_complete,
        approved: false // Default to not approved, admin will review
      });
      
      logger.info('Driver papers uploaded successfully', { 
        accountId: req.userId, 
        driverId: driver.id,
        papersId: driverPapers.id
      });
      
      // Update JWT with completed profile
      const newToken = JwtService.jwtSign(req.userId, {
        accountType: 'driver',
        profileComplete: true,
        accountTypeId: driver.id,
        stepsCompleted: { basicInfo: true, papers: true }
      });
      
      // Return success with driver papers
      return res.success('Driver papers uploaded successfully', {
        papers: driverPapers,
        token: newToken.token,
        refreshToken: newToken.refreshToken,
        message: 'Your documents have been uploaded and are pending approval'
      });
    } catch (error) {
      logger.error('Driver papers upload error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  // Update Parent Profile
  updateParentProfile: async (req, res, next) => {
    try {
      logger.info('Parent profile update attempt', { accountId: req.userId });
      
      // Find parent profile FIRST before processing any files
      const parent = await ParentRepository.findByAccountId(req.userId);
      
      if (!parent) {
        // Clean up any uploaded file since we won't use it
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new NotFoundError('Parent profile not found');
      }
      
      // Store the old profile picture URL for later deletion if it exists
      const oldProfilePicUrl = parent.profile_pic;
      
      // Validate city_id if provided
      if (req.body.city_id) {
        const cityExists = await CityRepository.exists(req.body.city_id);
        if (!cityExists) {
          // Clean up any uploaded file since we won't use it
          if (req.file) {
            deleteUploadedFile(req.file.path);
          }
          throw new BadRequestError(`City with ID ${req.body.city_id} does not exist`);
        }
      }
      
      // Update the fields that are provided
      const { name, phone, gender, city_id, google_place_id, lat, lng, formatted_address } = req.body;
      const updateData = {
        name,
        phone,
        gender,
        city_id,
        google_place_id,
        lat,
        lng,
        formatted_address
      };
      
      // Add profile picture if uploaded
      if (req.file) {
        updateData.profile_pic = req.file.path;
      }
      
      // Update parent profile
      await ParentRepository.update(parent.id, updateData);
      
      // Delete the old profile picture if a new one was uploaded
      if (req.file && oldProfilePicUrl) {
        try {
          deleteUploadedFile(oldProfilePicUrl);
          logger.debug(`Deleted old parent profile picture: ${oldProfilePicUrl}`);
        } catch (deleteError) {
          logger.warn(`Failed to delete old profile picture: ${deleteError.message}`, { url: oldProfilePicUrl });
        }
      }
      
      // Fetch updated profile
      const updatedParent = await ParentRepository.findById(parent.id);
      
      logger.info('Parent profile updated successfully', { 
        accountId: req.userId, 
        parentId: parent.id 
      });
      
      // Return success with updated profile
      return res.success('Parent profile updated successfully', {
        parent: updatedParent
      });
    } catch (error) {
      logger.error('Parent profile update error', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  // Update Driver Profile
  updateDriverProfile: async (req, res, next) => {
    try {
      logger.info('Driver profile update attempt', { accountId: req.userId });
      
      // Find driver profile
      const driver = await DriverRepository.findByAccountId(req.userId);
      
      if (!driver) {
        // Clean up any uploaded file
        if (req.file) {
          deleteUploadedFile(req.file.path);
        }
        throw new NotFoundError('Driver profile not found');
      }
      
      // Store the old profile picture URL for later deletion if it exists
      const oldProfilePicUrl = driver.profile_pic;
      
      // Validate city_id if provided
      if (req.body.city_id) {
        const cityExists = await CityRepository.exists(req.body.city_id);
        if (!cityExists) {
          // Clean up any uploaded file
          if (req.file) {
            deleteUploadedFile(req.file.path);
          }
          throw new BadRequestError(`City with ID ${req.body.city_id} does not exist`);
        }
      }
      
      // Update the fields that are provided
      const updateData = {
        name: req.body.name,
        phone: req.body.phone,
        gender: req.body.gender,
        city_id: req.body.city_id,
        license_number: req.body.license_number,
        lat: req.body.lat,
        lng: req.body.lng,
        formatted_address: req.body.formatted_address
      };
      
      // Add profile picture if uploaded
      if (req.file) {
        updateData.profile_pic = req.file.path;
      }
      
      // Update driver profile
      await DriverRepository.update(driver.id, updateData);
      
      // Delete the old profile picture if a new one was uploaded
      if (req.file && oldProfilePicUrl) {
        try {
          await deleteUploadedFile(oldProfilePicUrl);
          logger.debug(`Deleted old driver profile picture: ${oldProfilePicUrl}`);
        } catch (deleteError) {
          logger.warn(`Failed to delete old profile picture: ${deleteError.message}`, { url: oldProfilePicUrl });
        }
      }
      
      // Fetch updated profile
      const updatedDriver = await DriverRepository.findById(driver.id);
      
      logger.info('Driver profile updated successfully', { 
        accountId: req.userId, 
        driverId: driver.id 
      });
      
      // Return success with updated profile
      return res.success('Driver profile updated successfully', {
        driver: updatedDriver
      });
    } catch (error) {
      logger.error('Driver profile update error', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  // Get profile status - especially useful for drivers to check approval
  getProfileStatus: async (req, res, next) => {
    try {
      logger.info('Profile status check', { accountId: req.userId });
      
      // Get the account
      const account = await AccountRepository.findById(req.userId);
      
      if (!account) {
        throw new NotFoundError('Account not found');
      }
      
      // Initialize status data
      const statusData = {
        accountType: account.account_type,
        isVerified: account.is_verified,
        profileComplete: false,
        steps: {
          registration: true,
          emailVerification: account.is_verified,
          profileCreation: false,
          documentsUpload: false,
          documentsApproval: false
        },
        nextStep: null
      };
      
      // Determine status based on account type
      if (account.account_type === 'parent') {
        const parent = await ParentRepository.findByAccountId(account.id);
        
        if (parent) {
          statusData.profileComplete = true;
          statusData.steps.profileCreation = true;
          statusData.profile = parent;
        } else {
          statusData.nextStep = 'create_parent_profile';
        }
      } 
      else if (account.account_type === 'driver') {
        const driver = await DriverRepository.findByAccountIdWithPapers(account.id);
        
        if (driver) {
          statusData.steps.profileCreation = true;
          statusData.profile = driver;
          
          if (driver.papers) {
            statusData.steps.documentsUpload = true;
            statusData.documents = driver.papers;
            
            if (driver.papers.approved) {
              statusData.profileComplete = true;
              statusData.steps.documentsApproval = true;
            } else {
              statusData.nextStep = 'pending_approval';
              statusData.message = 'Your documents are under review. You will be notified when they are approved.';
            }
          } else {
            statusData.nextStep = 'upload_documents';
          }
        } else {
          statusData.nextStep = 'create_driver_profile';
        }
      }
      
      return res.success('Profile status retrieved successfully', statusData);
    } catch (error) {
      logger.error('Profile status check error', { error: error.message, stack: error.stack });
      next(error);
    }
  }
};

module.exports = profileController;
