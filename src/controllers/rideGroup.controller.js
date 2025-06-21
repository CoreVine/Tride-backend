const AccountRepository = require("../data-access/accounts");
const ParentRepository = require("../data-access/parent");
const RideGroupRepository = require('../data-access/rideGroup');
const ParentGroupRepository = require('../data-access/parentGroup');
const ChildrenGroupDetailsRepository = require('../data-access/childGroupDetails');
const GroupDaysRepository = require('../data-access/dayDatesGroup');
const loggingService = require("../services/logging.service");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors/types/Api.error");
const logger = loggingService.getLogger();

const RideGroupController = {
  createRideGroup: async (req, res, next) => {
    try {
      logger.info("Parent profile creation attempt", { accountId: req.userId });

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
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // implement

      // step 1: create a new ride group
      const rideGroupPayload = {
        parent_creator_id: parentProfile.id,
        group_name: req.body.group_name,
        school_id: req.body.school_id,
        current_seats_taken: req.body.seats,
      }
      const rideGroup = await RideGroupRepository.create(rideGroupPayload);

      if (!rideGroup) {
        throw new BadRequestError('Failed to create a new rideGroup!');
      }
      // step 2: create a new parent group
      const parentGroupPayload = {
        group_id: rideGroup.id,
        parent_id: parentProfile.id,
        home_lat: req.body.home.home_lat,
        home_lng: req.body.home.home_lng,
      };

      const parentGroup = await ParentGroupRepository.create(parentGroupPayload);

      if (!parentGroup) {
        throw new BadRequestError('failed to create a new parent group!')
      }

      // step-3: for each child, create a new record 
      const childrenOnParentGroup = await 
      ChildrenGroupDetailsRepository
      .addChildrenToParentGroup(parentProfile.id, parentGroup.id, req.body.children);

      // step-4: add days
      const daysAdded = await GroupDaysRepository.createBulkDaysGroup(rideGroup.id, req.body.days);

      if (!daysAdded) {
        throw new BadRequestError('Unable to add new days to a group!');
      }

      logger.info("A new ride group is created successfully");

      // Return success with parent profile
      return res.success("A new ride group has been created successfully", {
        rideGroup: {
          ...rideGroup,
          parentGroup: {
            ...parentGroup,
            children: childrenOnParentGroup
          },
          days: daysAdded
        }
      });
    } catch (error) {
      logger.error("Unable to create a new ride group ", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  addNewParentGroup: async (req, res, next) => {
    try {
      logger.info("Parent attempting to add new group", { accountId: req.userId });

      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a group"
        );
      }

      // Check if parent profile exists
      const parentProfile = await ParentRepository.findByAccountId(req.userId);
      if (!parentProfile) {
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // Check if the parent is already part of the ride group with the given school_id
      const existingRideGroup = await RideGroupRepository.findBySchoolAndParent(
        req.body.school_id, 
        parentProfile.id
      );

      if (!existingRideGroup) {
        throw new NotFoundError("The requested ride group does not exist!");
      }

      // Find the parent group for this ride group
      const existingParentGroup = await ParentGroupRepository.findByGroupAndParentId(
        existingRideGroup.id,
        parentProfile.id
      );

      if (existingParentGroup) {
        // Get children in this parent group
        const children = await ChildrenGroupDetailsRepository.findByParentGroupId(existingParentGroup.id);
        
        // Get days for this ride group
        const days = await GroupDaysRepository.findByRideGroupId(existingRideGroup.id);
        
        logger.info("Parent already has a group for this school", { 
          parentId: parentProfile.id, 
          rideGroupId: existingRideGroup.id 
        });
        
        return res.success("You already have a group for this school", {
          rideGroup: {
            ...existingRideGroup,
            parentGroup: {
              ...existingParentGroup,
              children
            },
            days
          }
        });
      }
    } catch (error) {
      logger.error("Unable to create a new ride group", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  addChildToGroup: async (req, res, next) => {
    try {
      logger.info("Parent attempting to add children to group", { accountId: req.userId });

      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before modifying a group"
        );
      }

      // Check if parent profile exists
      const parentProfile = await ParentRepository.findByAccountId(req.userId);
      if (!parentProfile) {
        throw new BadRequestError("Parent profile not exists for this account");
      }

      // Get the ride group
      const rideGroup = await RideGroupRepository.findById(req.body.group_id);
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // Check if the parent is part of this group
      const parentGroup = await ParentGroupRepository.findByGroupAndParentId(rideGroup.id, parentProfile.id);

      if (!parentGroup) {
        throw new ForbiddenError("You are not a member of this group");
      }

      // Check if there are enough seats available
      const childrenInGroup = await ChildrenGroupDetailsRepository.findByParentGroupId(parentGroup.id);
      if (childrenInGroup.length + req.body.children.length > rideGroup.current_seats_taken) {
        throw new BadRequestError(`Not enough seats available. You can add up to ${rideGroup.current_seats_taken - childrenInGroup.length} more children`);
      }

      // Add the children to the group
      const childrenAdded = await ChildrenGroupDetailsRepository.addChildrenToParentGroup(
        parentProfile.id, 
        parentGroup.id, 
        req.body.children
      );

      if (!childrenAdded || childrenAdded.length === 0) {
        throw new BadRequestError('Unable to add children to the group');
      }

      logger.info(`${childrenAdded.length} children successfully added to the group`);

      return res.success("Children have been added to the group successfully", {
        children: childrenAdded
      });
    } catch (error) {
      logger.error("Unable to add children to the group", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }
};

module.exports = RideGroupController;
