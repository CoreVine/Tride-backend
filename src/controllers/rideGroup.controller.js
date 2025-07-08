require('dotenv').config();
const AccountRepository = require("../data-access/accounts");
const ParentRepository = require("../data-access/parent");
const RideGroupRepository = require('../data-access/rideGroup');
const ParentGroupRepository = require('../data-access/parentGroup');
const ChildrenGroupDetailsRepository = require('../data-access/childGroupDetails');
const PlanRepository = require('../data-access/plan');
const ParentGroupSubscriptionRepository = require('../data-access/parentGroupSubscription');
const loggingService = require("../services/logging.service");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors/types/Api.error");
const paymobUtil = require("../utils/payment/paymob");
const redisService = require('../services/redis.service');
const subscriptionDomain = require('../domain/subscription/subscription');
const logger = loggingService.getLogger();

const RideGroupController = {
  createNewSubscribeRequest: async (req, res, next) => {
    const { rideGroupId } = req.params;
    const { plan_type, installment_plan } = req.body;  // installment_plan:boolean

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

      // check if a parent already has an active subscription
      const existingSubscription = await ParentGroupSubscriptionRepository
      .findActiveSubscriptionByParentAndGroup(
        req.account.parent.id,
        rideGroup.id
      );

      if (existingSubscription) {
        throw new BadRequestError("You already have an active subscription for this ride group");
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

      const planDetails = await PlanRepository.getPlanByType(plan_type, installment_plan);
  
      if (!planDetails) {
        throw new NotFoundError("Plan not found for the specified type");
      }

      // calculate the overall price based on the plan type
      const { overallPrice, toPayPrice } = await subscriptionDomain.calculateOverallPrice({
        distance,
        seatsTaken,
        totalDays,
        planDetails,
        installment_plan
      });

      const paymobOrder = paymobUtil.createPaymobOrderObject(
        "new",
        req.account,
        rideGroup,
        planDetails,
        seatsTaken,
        totalDays,
        overallPrice,
        toPayPrice
      );

      const { clientSecret, orderId } = await paymobUtil.requestPaymentToken(paymobOrder);

      const orderDetails = {
        orderId,
        planType: plan_type,
        installmentPlan: installment_plan,
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
        orderDetails
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
      const rideGroup = await RideGroupRepository.findOneByIdWithSchoolAndParent(req.account.parent.id, rideGroupId);
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // check if a parent already has an active subscription
      const existingSubscription = await ParentGroupSubscriptionRepository
      .findLatestSubscriptionByParentAndGroup(
        req.account.parent.id,
        rideGroup.id
      );

      if (!existingSubscription) {
        return res.success("No subscription was found for this ride group", {
          status: "inactive"
        });
      }

      return res.success("Current subscription status fetched successfully", {
        subscription: existingSubscription
      });
    } catch (error) {
      logger.error("Error fetching current subscription status", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  payInstallments: async (req, res, next) => {
    const { rideGroupId } = req.params;
    const { plan_type, installment_plan } = req.body;  // installment_plan:boolean

    try {
      if (!req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified, have a valid parent profile"
        );
      }

      // Get the ride group details
      const rideGroup = await RideGroupRepository.findOneByIdWithSchoolAndParent(req.account.parent.id, rideGroupId);
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      // check if a parent already has an active subscription
      const existingSubscription = await ParentGroupSubscriptionRepository
      .findActiveSubscriptionByParentAndGroup(
        req.account.parent.id,
        rideGroup.id
      );

      if (!existingSubscription) {
        throw new BadRequestError("You do not have an active subscription for this ride group");
      }
      
      // TODO: Implement logic to handle existing subscription
      if (
        existingSubscription.plan.range === plan_type &&
        existingSubscription.plan.installment_plan === installment_plan
      ) {
        // We are paying installments, or resubscribing to the same plan if next_payment_due is null
        if(installment_plan) {
          // Check if the next payment is due
          if (existingSubscription.payment_history[0].next_payment_due) {
            // we are paying installments
            const paymobOrderObject = paymobUtil.createPaymobOrderObject(
              "existing/installment",
              req.account,
              rideGroup,
              existingSubscription.plan,
              existingSubscription.current_seats_taken,
              existingSubscription.total_days,
              existingSubscription.total_amount,
              existingSubscription.payment_history[0].next_payment_amount,
              {
                subscription_id: existingSubscription.id,
                remaining_months: existingSubscription.plan.months_count - existingSubscription.payment_history.length,
              }
            );

            const { clientSecret, orderId } = await paymobUtil.requestPaymentToken(paymobOrderObject);

            const orderDetails = {
              orderId,
              planType: existingSubscription.plan.range,
              installmentPlan: existingSubscription.plan.installment_plan,
              seats: existingSubscription.current_seats_taken,
              total_days: existingSubscription.total_days,
              distance: existingSubscription.distance,
              overallPrice: Number(existingSubscription.total_amount),
              toPayPrice: Number(existingSubscription.payment_history[0].next_payment_amount),
            };

            let paymentRedirectParams = `?publicKey=${process.env.PAYMOB_PUBLIC_KEY}`;
            paymentRedirectParams += `&clientSecret=${clientSecret}`;

            return res.success("Next payment details fetched successfully", {
              paymentRedirectUrl: `${process.env.PAYMOB_CHECKOUT_URI}${paymentRedirectParams}`,
              orderDetails
            });
          } else {
            // We are resubscribing to the same plan but installments
            throw new BadRequestError("Resubscription to the same plan is not yet implemented!");
          }
        } else {
          // we are resubscribing to the same plan but full payment
          throw new BadRequestError("Resubscription to the same plan with full payment is not yet implemented!");
        }
      } else {
        // We are changing the plan
        throw new BadRequestError("You cannot change the plan type or installment option, not implemented yet!");
        if (installment_plan) {
          
        } else {

        }
      }

    } catch (error) {
      logger.error("Error fetching next payment details for installments", {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  },

  confirmNewSubscription: async (req, res, next) => {
    const { order_id } = req.body;

    try {
      logger.info("Confirming new subscription", { orderId: order_id });
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
      if (!req.account.is_verified  || !req.account.parent) {
        throw new ForbiddenError(
          "Account email must be verified before creating a group"
        );
      }

      const rideGroup = await RideGroupRepository.findByIdIfParent(req.account.parent.id, rideGroupId);

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

  getRideGroups: async (req, res, next) => {
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

      const rideGroups = await RideGroupRepository.findAllIfParent(parentProfile.id);

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

      // create a new ride group
      const payload = {
        rideGroupPayload: {
          parent_creator_id: parentProfile.id,
          group_name: req.body.group_name,
          school_id: req.body.school_id,
          current_seats_taken: req.body.seats,
          invite_code: inviteCode
        },
        parentGroupPayload: {
          parent_id: parentProfile.id,
          current_seats_taken: req.body.seats,
          home_lat: req.body.home.home_lat,
          home_lng: req.body.home.home_lng,
        },
        children: req.body.children || [],
        days: req.body.days || [],
        
      };

      const rideGroup = await RideGroupRepository.createNewRideGroup(payload);

      logger.info("A new ride group is created successfully");

      // Return success with parent profile
      return res.success("A new ride group has been created successfully", {
        rideGroup
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
