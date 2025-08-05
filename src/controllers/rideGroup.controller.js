require("dotenv").config();
const AccountRepository = require("../data-access/accounts");
const ParentRepository = require("../data-access/parent");
const RideGroupRepository = require("../data-access/rideGroup");
const ParentGroupRepository = require("../data-access/parentGroup");
const ChildrenGroupDetailsRepository = require("../data-access/childGroupDetails");
const PlanRepository = require("../data-access/plan");
const ParentGroupSubscriptionRepository = require("../data-access/parentGroupSubscription");
const loggingService = require("../services/logging.service");
const SchoolRepository = require("../data-access/school");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors/types/Api.error");
const paymobUtil = require("../utils/payment/paymob");
const redisService = require("../services/redis.service");
const openRouteUtil = require("../utils/openRoutesService");
const subscriptionDomain = require("../domain/subscription/subscription");
const { RIDE_PRICE_PER_KM, MAX_SEATS_CAR } = require("../config/upload/constants");
const logger = loggingService.getLogger();

const RideGroupController = {
  updateSubscriptionStatus: async (req, res, next) => {
    const { subscriptionStatusId } = req.params;
    const { status } = req.body;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the subscription details
      const subscription =
        await ParentGroupSubscriptionRepository.findById(subscriptionStatusId);

      if (!subscription) {
        throw new NotFoundError("Subscription not found");
      }

      // Update the subscription status
      await ParentGroupSubscriptionRepository.update(subscription.id, {
          status,
        });

      return res.success("Subscription status updated successfully", {});
    } catch (error) {
      logger.error("Error updating subscription status", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },
  createNewSubscribeRequest: async (req, res, next) => {
    const { rideGroupId } = req.params;
    const { plan_type } = req.body;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the ride group details
      const rideGroup =
        await RideGroupRepository.findOneByIdWithSchoolAndParent(
          req.account.parent.id,
          rideGroupId
        );

      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // check if a parent already has an active subscription
      const existingSubscription =
        await ParentGroupSubscriptionRepository.findActiveSubscriptionByParentAndGroup(
          req.account.parent.id,
          rideGroup.id
        );

      if (existingSubscription) {
        throw new BadRequestError(
          "You already have an active subscription for this ride group"
        );
      }

      if (rideGroup.group_type === "premium" && rideGroup.parent_creator_id !== req.account.parent.id) {
        throw new ForbiddenError(
          "Only the creator is allowed to pay for a premium ride group"
        );
      }

      // create a new subscription for the parent in this ride group
      const { distance, seatsTaken, totalDays } =
        await subscriptionDomain.getPriceFactors({
          rideGroupId: rideGroup.id,
          parentId: req.account.parent.id,
          homeLocation: {
            homeLat: rideGroup.parentGroups[0].home_lat,
            homeLng: rideGroup.parentGroups[0].home_lng,
          },
          schoolLocation: {
            schoolLat: rideGroup.school.lat,
            schoolLng: rideGroup.school.lng,
          },
        });

      const planDetails = await PlanRepository.getPlanByType(plan_type);

      if (!planDetails) {
        throw new NotFoundError("Plan not found for the specified type");
      }

      // calculate the overall price based on the plan type
      const { overallPrice, toPayPrice } =
        await subscriptionDomain.calculateOverallPrice({
          distance,
          seatsTaken: rideGroup.group_type === 'premium' ? MAX_SEATS_CAR : seatsTaken,
          totalDays,
          planDetails,
        });

      const paymobOrder = paymobUtil.createPaymobOrderObject(
        "new",
        req.account,
        rideGroup,
        planDetails,
        seatsTaken,
        totalDays,
        overallPrice,
        toPayPrice,
        {
          parent_group_id: rideGroup.parentGroups[0].id,
        }
      );

      const { clientSecret, orderId } = await paymobUtil.requestPaymentToken(
        paymobOrder
      );

      const orderDetails = {
        orderId,
        planType: plan_type,
        seats: seatsTaken,
        total_days: totalDays,
        distance,
        overallPrice: Number(overallPrice),
        toPayPrice: Number(toPayPrice),
      };

      let paymentRedirectParams = `?publicKey=${process.env.PAYMOB_PUBLIC_KEY}`;
      paymentRedirectParams += `&clientSecret=${clientSecret}`;

      return res.success("Next payment details fetched successfully", {
        paymentRedirectUrl: `${process.env.PAYMOB_CHECKOUT_URI}${paymentRedirectParams}`,
        orderDetails,
      });
    } catch (error) {
      logger.error("Error fetching next payment details", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  getCurrentSubscriptionStatus: async (req, res, next) => {
    const { rideGroupId } = req.params;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the ride group details
      const rideGroup =
        await RideGroupRepository.findOneByIdWithSchoolAndParent(
          req.account.parent.id,
          rideGroupId
        );
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // check if a parent already has an active subscription
      const existingSubscription =
        await ParentGroupSubscriptionRepository.findLatestSubscriptionByParentAndGroup(
          req.account.parent.id,
          rideGroup.id
        );

      if (!existingSubscription) {
        return res.success("No subscription was found for this ride group", {
          status: "inactive",
        });
      }

      return res.success("Current subscription status fetched successfully", {
        subscription: existingSubscription,
      });
    } catch (error) {
      logger.error("Error fetching current subscription status", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },
  updateCurrentSubscriptionStatus: async (req, res, next) => {
    const { rideGroupId } = req.params;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the ride group details
      const rideGroup =
        await RideGroupRepository.findOneByIdWithSchoolAndParent(
          req.account.parent.id,
          rideGroupId
        );
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // check if a parent already has an active subscription
      const existingSubscription =
        await ParentGroupSubscriptionRepository.findLatestSubscriptionByParentAndGroup(
          req.account.parent.id,
          rideGroup.id
        );

      if (!existingSubscription) {
        return res.success("No subscription was found for this ride group", {
          status: "inactive",
        });
      }
      const updatedSubscription =
        await ParentGroupSubscriptionRepository.update(
          existingSubscription.id,
          { status: req.body.status }
        );

      return res.success("Current subscription status updated successfully", {
        subscription: updatedSubscription,
      });
    } catch (error) {
      logger.error("Error updating current subscription status", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  extendSubscription: async (req, res, next) => {
    const { rideGroupId } = req.params;
    const { plan_type } = req.body;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the ride group details
      const rideGroup = await RideGroupRepository.findOneByIdWithSchoolAndParent(
        req.account.parent.id,
        rideGroupId
      );
      
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // Find any existing subscription (active or expired)
      const existingSubscription = await ParentGroupSubscriptionRepository
        .findSubscriptionByParentAndGroup(req.account.parent.id, rideGroup.id);

      if (!existingSubscription) {
        throw new BadRequestError("No subscription found for this ride group. Please create a new subscription.");
      }
      // Get plan details for extension
      const planDetails = await PlanRepository.getPlanByType(plan_type);
      if (!planDetails) {
        throw new NotFoundError("Plan not found for the specified type");
      }

      // Calculate price for extension
      const { distance, seatsTaken, totalDays } = await subscriptionDomain.getPriceFactors({
        rideGroupId: rideGroup.id,
        parentId: req.account.parent.id,
        homeLocation: {
          homeLat: rideGroup.parentGroups[0].home_lat,
          homeLng: rideGroup.parentGroups[0].home_lng,
        },
        schoolLocation: {
          schoolLat: rideGroup.school.lat,
          schoolLng: rideGroup.school.lng,
        },
      });

      const { overallPrice, toPayPrice } = await subscriptionDomain.calculateOverallPrice({
        distance,
        seatsTaken: rideGroup.group_type === 'premium' ? MAX_SEATS_CAR : seatsTaken,
        totalDays,
        planDetails,
      });

      // Create Paymob order for extension
      const paymobOrder = paymobUtil.createPaymobOrderObject(
        "extension",
        req.account,
        rideGroup,
        planDetails,
        seatsTaken,
        totalDays,
        overallPrice,
        toPayPrice,
        {
          subscription_id: existingSubscription.id,
          extension_months: planDetails.months_count,
        }
      );

      const { clientSecret, orderId } = await paymobUtil.requestPaymentToken(paymobOrder);

      const orderDetails = {
        orderId,
        planType: plan_type,
        seats: seatsTaken,
        total_days: totalDays,
        distance,
        overallPrice: Number(overallPrice),
        toPayPrice: Number(toPayPrice),
        extensionMonths: planDetails.months_count,
      };

      let paymentRedirectParams = `?publicKey=${process.env.PAYMOB_PUBLIC_KEY}`;
      paymentRedirectParams += `&clientSecret=${clientSecret}`;

      return res.success("Extension payment details fetched successfully", {
        paymentRedirectUrl: `${process.env.PAYMOB_CHECKOUT_URI}${paymentRedirectParams}`,
        orderDetails,
      });
    } catch (error) {
      logger.error("Error creating subscription extension", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  confirmNewSubscription: async (req, res, next) => {
    const { order_id } = req.body;

    try {
      logger.debug("Confirming new subscription", { orderId: order_id });
      const result = await redisService.get(order_id);

      if (!result) {
        throw new BadRequestError("Invalid order ID");
      }

      // Set the order as processed in Redis
      await redisService.delete(order_id);

      return res.success("Subscription with order id is paid successfully");
    } catch (error) {
      logger.error("Error confirming new subscription", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  getRideGroupById: async (req, res, next) => {
    const { rideGroupId } = req.params;
    try {
      if (!req.account.is_verified || !req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified before creating a group"
        );
      }

      const rideGroup = await RideGroupRepository.findByIdIfParent(
        req.account.parent.id,
        rideGroupId
      );

      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // Get all details for a ride group
      const rideGroupWithDetails =
        await RideGroupRepository.getRideGroupDetails(rideGroupId);

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

  getRideGroupsByParentId: async (req, res, next) => {
    try {
      // Verify account exists and is verified
      const account = await AccountRepository.findById(req.userId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before accessing ride groups"
        );
      }

      // Check if parent profile exists
      const parentProfile = await ParentRepository.findByAccountId(req.userId);
      if (!parentProfile) {
        throw new BadRequestError("Parent profile not exists for this account");
      }

      const rideGroups = await RideGroupRepository.findAllIfParent(
        parentProfile.id
      );

      if (!rideGroups) {
        throw new NotFoundError("Ride group not found");
      }

      return res.success("Ride group details fetched successfully", {
        rideGroups,
      });
    } catch (error) {
      logger.error("Error fetching ride group by ID", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  createRideGroup: async (req, res, next) => {
    try {
      logger.debug("ride group creation attempt", { accountId: req.userId });

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
      let inviteCode = "";
      if (req.body.group_type === 'premium') {
        inviteCode = await RideGroupRepository.generateUniqueInviteCode();
      }

      // check before creation if the distance can be calculated
      const school = await SchoolRepository.findById(req.body.school_id);

      if (!school) {
        throw new NotFoundError("School not found");
      }

      if (!school.lat || !school.lng) {
        throw new BadRequestError("School location is not set");
      }
      
      const countGroupsInSchool = await RideGroupRepository.countRideGroupsBySchoolId(school.id);
      const points = {
        lat_lng_house: [
          parseFloat(req.body.home.home_lng),
          parseFloat(req.body.home.home_lat),
        ],
        lat_lng_school: [
          parseFloat(school.lng),
          parseFloat(school.lat),
        ],
      };

      const dailyRideDistance = await openRouteUtil.getDistanceForRide(points);

      if (isNaN(dailyRideDistance) || dailyRideDistance <= 0 || !dailyRideDistance) {
        throw new BadRequestError("Invalid distance calculated for the ride");
      }

      try {
        const totalDays =  req.body.days.length || 0;
        const totalMonthlyDistance = dailyRideDistance * totalDays * 4;
        const pricePerKm = RIDE_PRICE_PER_KM(totalMonthlyDistance);
      } catch (error) {
        throw new BadRequestError("Distance is too large. You can't create a group with a distance that exceeds 1500km monthly");
      }

      // create a new ride group
      const payload = {
        rideGroupPayload: {
          parent_creator_id: parentProfile.id,
          group_name: `${school.school_name} - #${countGroupsInSchool + 1 || 1}`,
          school_id: req.body.school_id,
          current_seats_taken: req.body.children.length || 0,
          invite_code: inviteCode || null,
          group_type: req.body.group_type || 'regular', // Default to 'regular' if not provided
          status: "new"
        },
        parentGroupPayload: {
          parent_id: parentProfile.id,
          current_seats_taken: req.body.children.length || 0,
          home_lat: req.body.home.home_lat,
          home_lng: req.body.home.home_lng,
        },
        children: req.body.children || [],
        days: req.body.days || [],
        subscriptionPayload: {
          parent_id: parentProfile.id,
          current_seats_taken: req.body.children.length || 0,
          pickup_days_count: req.body.days.length,
          started_at: new Date(),
          status: "new",
        },
      };

      const rideGroup = await RideGroupRepository.createNewRideGroup(payload);

      logger.debug("A new ride group is created successfully");

      // Return success with parent profile
      return res.success("A new ride group has been created successfully", {
        rideGroup: rideGroup.dataValues || rideGroup,
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

      const rideGroup = await RideGroupRepository.findByInviteCode(
        invitation_code
      );

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

      const newParentGroup = await ParentGroupRepository.create(
        newParentGroupPayload
      );

      if (!newParentGroup) {
        throw new BadRequestError("Unable to create a new parent group");
      }

      return res.success("You have been added to the ride group successfully", {
        rideGroup: {
          ...rideGroup,
          parentGroup: newParentGroup,
        },
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
      logger.debug("Parent attempting to add children to group", {
        accountId: req.userId,
      });

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
      const parentGroup = await ParentGroupRepository.findByGroupAndParentId(
        rideGroup.id,
        parentProfile.id
      );

      if (!parentGroup) {
        throw new ForbiddenError("You are not a member of this group");
      }

      let hasValidSubscription = false;
      // this block is to ensure the parent has no new subscription for this ride group
      try {
        await subscriptionDomain.isParentSubscriptionValid(req.userId, rideGroup.id);

        hasValidSubscription = true;
      } catch (error) {
      }

      if (hasValidSubscription) {
        throw new BadRequestError(
          "You can't do that while having an active subscription"
        );
      }

      // Check if there are enough seats available
        
      if (rideGroup.current_seats_taken + req.body.children.length > MAX_SEATS_CAR) {
        throw new BadRequestError(
          `Not enough seats available. You can add up to ${
            rideGroup.current_seats_taken - childrenInGroup.length
          } more children`
        );
      }

      // Add the children to the group
      const childrenAdded =
        await ChildrenGroupDetailsRepository.addChildrenToParentGroup(
          parentProfile.id,
          parentGroup.id,
          req.body.children,
          {},
          { 
            parentGroup,
            rideGroup
          }
        );

      if (!childrenAdded || childrenAdded.length === 0) {
        throw new BadRequestError("Unable to add children to the group");
      }

      logger.debug(
        `${childrenAdded.length} children successfully added to the group`
      );

      return res.success("Children have been added to the group successfully", {
        children: childrenAdded,
      });
    } catch (error) {
      logger.error("Unable to add children to the group", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  getAllPlans: async (req, res, next) => {
    try {
      const plans = await PlanRepository.getAllPlans();
      
      return res.success("Plans fetched successfully", {
        plans
      });
    } catch (error) {
      logger.error("Error fetching plans", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  getAvailablePlans: async (req, res, next) => {
    const { rideGroupId } = req.params;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the ride group details
      const rideGroup = await RideGroupRepository
      .findOneByIdWithSchoolAndParent(req.account.parent.id, rideGroupId);
      
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // create a new subscription for the parent in this ride group
      const { distance, seatsTaken, totalDays } = await subscriptionDomain.getPriceFactors({
        rideGroupId: rideGroup.id,
        parentId: req.account.parent.id,
        homeLocation: {
          homeLat: rideGroup.parentGroups[0].home_lat,
          homeLng: rideGroup.parentGroups[0].home_lng
        },
        schoolLocation: {
          schoolLat: rideGroup.school.lat,
          schoolLng: rideGroup.school.lng
        }
      });

      const planDetails = await PlanRepository.getAllPlans();
  
      if (!planDetails) {
        throw new NotFoundError("Plan not found for the specified type");
      }

      const plans = [];
      for (const plan of planDetails) {
        // calculate the overall price based on the plan type        
        const { overallPrice, toPayPrice } = await subscriptionDomain.calculateOverallPrice({
          distance,
          seatsTaken: rideGroup.group_type === 'premium' ? MAX_SEATS_CAR : seatsTaken,
          totalDays,
          planDetails: plan
        });

        plans.push({
          inDayDistance: distance,
          totalDistance: distance * plan.months_count * totalDays * 4,
          totalDays: totalDays * plan.months_count * 4,
          ...plan.dataValues,
          overallPrice: Number(overallPrice.toFixed(2)),
          toPayPrice: Number(toPayPrice.toFixed(2))
        });
      }

      return res.success("Available plans fetched successfully", {
        factors: {
          seatsTaken,
          daysPerWeek: totalDays,
        },
        plans
      });
    } catch (error) {
      logger.error("Error fetching next payment details", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  updateParentGroupStatus: async (req, res, next) => {
    const { parentGroupId } = req.params;
    const { status } = req.body;

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the parent group details
      const parentGroup = await ParentGroupRepository.findById(parentGroupId);

      if (!parentGroup) {
        throw new NotFoundError("Parent group not found");
      }

      // Check if the user has permission to update this parent group
      if (parentGroup.parent_id !== req.account.parent.id) {
        throw new ForbiddenError("You don't have permission to update this parent group");
      }

      // Update the parent group status
      await ParentGroupRepository.update(parentGroupId, {
        status,
      });

      return res.success("Parent group status updated successfully", {});
    } catch (error) {
      logger.error("Error updating parent group status", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  }
};

module.exports = RideGroupController;
