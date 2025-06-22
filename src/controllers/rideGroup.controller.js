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
const { generateInviteCode } = require("../utils/generators/uuid-gen");
const logger = loggingService.getLogger();

const RideGroupController = {
  getRideGroupById: async (req, res, next) => {
    const { rideGroupId } = req.params;
    try {
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

      const rideGroup = await RideGroupRepository.findByIdIfParent(parentProfile.id, rideGroupId);

      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // Get all details for a ride group
      const rideGroupWithDetails = await RideGroupRepository.getRideGroupDetails(rideGroupId);

      return res.success("Ride group details fetched successfully", {
        rideGroup: rideGroupWithDetails,
      });
    } catch (error) {
      logger.error("Error fetching ride group by ID", {
        error: error.message,
        stack: error.stack,
      });
      return next(new NotFoundError("Ride group not found"));
    }
  },

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

      // Generate a unique invite code for the group
      const inviteCode = await RideGroupRepository.generateUniqueInviteCode();

      // step 1: create a new ride group
      const rideGroupPayload = {
        parent_creator_id: parentProfile.id,
        group_name: req.body.group_name,
        school_id: req.body.school_id,
        current_seats_taken: req.body.seats,
        invite_code: inviteCode
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

  // TODO: implement this method
  addNewParentGroup: async (req, res, next) => {
    const { invitation_code } = req.params;
    const { group_id, home } = req.body;

    try {

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

      const rideGroup = await RideGroupRepository.findByInviteCode(invitation_code);

      if (!rideGroup) {
        throw new NotFoundError("Invalid invitation");
      }

      // check if parent is already part of this group
      const existingRideGroup = await RideGroupRepository.findByIdIfParent(
        parentProfile.id,
        rideGroup.id
      );

      if (existingRideGroup) {
        throw new NotFoundError("Parent is a part of this group");
      }

      // Create a new parent group for this ride group
      const newParentGroupPayload = {
        group_id: rideGroup.id,
        parent_id: parentProfile.id,
        home_lat: home.home_lat,
        home_lng: home.home_lng,
      };

      const newParentGroup = await ParentGroupRepository.create(newParentGroupPayload);

      if (!newParentGroup) {
        throw new BadRequestError("Unable to create a new parent group");
      }

      return res.success("You have been added to the ride group successfully", {
        rideGroup: {
          ...rideGroup,
          parentGroup: newParentGroup
        }
      });

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
