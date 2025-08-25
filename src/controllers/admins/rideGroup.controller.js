require("dotenv").config();

const { BadRequestError, NotFoundError, ForbiddenError } = require("../../utils/errors/types/Api.error");
const { createPagination } = require("../../utils/responseHandler");

const AccountRepository = require("../../data-access/accounts");
const RideInstanceRepository = require("../../data-access/rideInstance");
const RideInstanceLocationRepository = require("../../data-access/rideInstanceLocation");
const DriverRepository = require("../../data-access/driver");
const RideGroupRepository = require("../../data-access/rideGroup");
const ParentGroupRepository = require("../../data-access/parentGroup");
const ParentRepository = require("../../data-access/parent");
const ParentGroupSubscriptionRepository = require("../../data-access/parentGroupSubscription");
const ChildrenGroupDetailsRepository = require("../../data-access/childGroupDetails");
const loggingService = require("../../services/logging.service");
const SchoolRepository = require("../../data-access/school");
const openRouteUtil = require("../../utils/openRoutesService");
const subscriptionDomain = require("../../domain/subscription/subscription");

const ChatRoom = require("../../mongo-model/ChatRoom");

const { RIDE_PRICE_PER_KM, MAX_SEATS_CAR } = require("../../config/upload/constants");

const logger = loggingService.getLogger();

const rideGroupController = {
    getRideGroups: async (req, res, next) => {
        try {
          const { page = 1, limit = 10, name, seats, type, school_id, ride_group_id } = req.query;
            const { count, rows: rideGroups } = await RideGroupRepository.findAllDetailedPaginated(
            parseInt(page, 10) || 1,
            parseInt(limit, 10) || 10,
            { name, seats: parseInt(seats, 10) || 0, type, school_id, ride_group_id }
            );
    
          const pagination = createPagination(page, limit, count);
    
          return res.success("Ride groups fetched successfully", { pagination, rideGroups });
        } catch (error) {
          logger.error("Error fetching ride groups", {
            error: error.message,
            stack: error.stack,
          });
          return next(error);
        }
    },

    getRideGroupDetails: async (req, res, next) => {
        try {
            const { rideGroupId } = req.params;
            const rideGroup = await RideGroupRepository.findByIdDetailed(rideGroupId);

            if (!rideGroup) {
                return res.error("Ride group not found", 404);
            }

            return res.success("Ride group details fetched successfully", { rideGroup });
        } catch (error) {
            logger.error("Error fetching ride group details", {
                error: error.message,
                stack: error.stack,
            });
            return next(error);
        }
    },

    getRideGroupInstances: async (req, res, next) => {
      try {
        const { rideGroupId, page = 1, limit = 10 } = req.params;
        
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        if (isNaN(+page) || isNaN(+limit)) throw new BadRequestError("Invalid pagination parameters");

        const data = await RideInstanceRepository.findAllPaginated(page, limit, {
          where: {
            group_id: rideGroupId,
            status: 'ended'
          },
          include: [
            { association: 'group' },
            { association: 'driver' }
          ]
        });

        return res.success("Ride group instances fetched successfully", data);
        
      } catch (error) {
        logger.error("Error fetching ride group instances", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    getParentGroupsOfRideGroup: async (req, res, next) => {
      try {
        const { rideGroupId } = req.params;
        
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        const data = await ParentGroupRepository.findAll({
          where: {
            group_id: rideGroupId,
          },
          include: [
            { association: 'group' },
            { association: 'parent' }
          ]
        });

        return res.success("parents groups fetched successfully", data);
        
      } catch (error) {
        logger.error("Error fetching parent grooups", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    getSingleParentGroupForAdmin: async (req, res, next) => {
      try {
        const { rideGroupId, parentId } = req.params;
        
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        const data = await ParentGroupRepository.findAll({
          where: {
            group_id: rideGroupId,
          },
          include: [
            { association: 'group' },
            { association: 'parent' }
          ]
        });

        return res.success("parents groups fetched successfully", data);
        
      } catch (error) {
        logger.error("Error fetching parent grooups", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    getGroupSubscriptionOfParentFromAdmin: async (req, res, next) => {
      try {
        const { rideGroupId, parentId } = req.params;
        
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        const parent = await ParentRepository.findById(parentId);
        if (!parent) throw new NotFoundError("Parent not found");

        const data = await ParentGroupSubscriptionRepository.findOne({
          where: {
            ride_group_id: rideGroupId,
            parent_id: parentId
          },
          include: [
            { association: 'rideGroup', include: [{ association: 'school' }] },
            { association: 'parent' },
            { association: 'plan' }
          ]
        });

        return res.success("parents groups fetched successfully", data);
        
      } catch (error) {
        logger.error("Error fetching parent grooups", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    updateParentGroupStatusFromAdmin: async (req, res, next) => {
      try {
        const { rideGroupId, parentId } = req.params;
        
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        const parent = await ParentRepository.findById(parentId);
        if (!parent) throw new NotFoundError("Parent not found");

        const data = await ParentGroupRepository.findOne({
          where: {
            group_id: rideGroupId,
            parent_id: parentId
          }
        });
        if (!data) throw new NotFoundError("Parent group not found");

        await ParentGroupRepository.update(data.id, {
          status: req.body.status
        });

        return res.success("Parent Group Status Updated Successfully", data);
        
      } catch (error) {
        logger.error("Error fetching parent grooups", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    updateParentGroupSubscriptionStatus: async (req, res, next) => {
      try {
        const { rideGroupId, parentId } = req.params;
        
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        const parent = await ParentRepository.findById(parentId);
        if (!parent) throw new NotFoundError("Parent not found");

        const data = await ParentGroupSubscriptionRepository.findOne({
          where: {
            ride_group_id: rideGroupId,
            parent_id: parentId
          }
        });
        if (!data) throw new NotFoundError("No subscription was found");

        await ParentGroupSubscriptionRepository.update(data.id, {
          status: req.body.status
        });

        return res.success("Subscription updated successfully", data);
        
      } catch (error) {
        logger.error("Error fetching parent grooups", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    getRideGroupInstanceDetails: async (req, res, next) => {
      try {
        const { rideGroupId, instanceId } = req.params;
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
        if (!rideGroup) throw new NotFoundError("Ride group not found");

        const instance = await RideInstanceRepository.findById(instanceId, {
          include: [
            { association: 'group' },
            { association: 'driver' }
          ]
        })
        if (!instance) throw new NotFoundError("Ride instance not found");

        const locations = await RideInstanceLocationRepository.findAll({
          where: { ride_instance_id: instanceId },
          order: [['id', 'ASC']],
        });

        return res.success("Ride group instance details fetched successfully", {
          instance,
          locations
        });

      } catch (error) {
        logger.error("Error fetching ride group instance details", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    getRideGroupChat: async (req, res, next) => {
      try {
        const { rideGroupId } = req.params;
        const rideGroup = await RideGroupRepository.findById(rideGroupId);
    
        if (!rideGroup) {
          return res.error("Ride group not found", 404);
        }
    
        const chatRoom = await ChatRoom.findOne({
          ride_group_id: rideGroupId,
          room_type: "ride_group"
        }).populate("last_message");
    
        if (!chatRoom) {
          return res.error("Chat room not found", 404);
        }
    
        let data = chatRoom.toObject();
    
        data.participants = await Promise.all(
          data.participants.map(async (part) => {
            const user = await AccountRepository.findByIdIncludeDetails(part.user_id);
            let name = '';
            if (part.user_type === 'driver') {
              name = user?.driver?.name || 'N/A'
            } else if (part.user_type === 'parent') {
              name = user?.parent?.name || 'N/A';
            } else if (part.user_type === 'admin') {
              name = user?.admin?.name || 'N/A';
            } else {
              name = 'Unknown';
            }

            return {
              ...part,
              name,
            };
          })
        );
    
        return res.success("Ride group details fetched successfully", data);
      } catch (error) {
        logger.error("Error fetching ride group details", {
          error: error.message,
          stack: error.stack,
        });
        return next(error);
      }
    },

    createRideGroupChat: async (req, res, next) => {
      try {
        const { rideGroupId } = req.params;
        const rideGroup = await RideGroupRepository.findById(rideGroupId);

        if (!rideGroup) throw new NotFoundError("Ride group not found");

        let chatRoom = await ChatRoom.findOne({
          ride_group_id: rideGroupId,
          room_type: "ride_group"
        });

        if (chatRoom) throw new BadRequestError("Chat room already exists for this ride group");

        const driver = await DriverRepository.findById(rideGroup.driver_id);

        let participants = []

        if (driver) {
          participants.push({
            user_id: driver.id,
            user_type: "driver",
            name: driver.name,
            last_seen: null,
          });
        }

        const parentGroups = await ParentGroupRepository.findAll({
          where: {
            group_id: rideGroupId,
          },
          include: [
            { association: 'parent', attributes: ['name', 'id'] },
            { association: 'group', attributes: ['id', 'group_name'] }
          ]
        })


        if (parentGroups && parentGroups.length > 0) {
          parentGroups.map(item => {
            participants.push({
              user_id: item.parent.id,
              user_type: "parent",
              name: item.parent.name,
              last_seen: null,
            });
          })
        }

        chatRoom = await ChatRoom.create({
          ride_group_id: rideGroupId,
          room_type: "ride_group",
          name: rideGroup.group_name,
          participants,
        }); 


        return res.success("Chat room created successfully", chatRoom);
      } catch (error) {
        return next(error)
      }
    },

    mergeRideGroups: async (req, res, next) => {
        try {
            const { group_src, group_dest } = req.body;

            // Validate that both groups exist and are not the same
            if (group_src === group_dest) {
              throw new BadRequestError("Source and destination groups cannot be the same");
            }

            // Call the service to merge ride groups
            const { participants, groupName } = await RideGroupRepository.mergeRideGroups(group_src, group_dest);

            // remove the ride group chat room for the source group
            await ChatRoom.deleteMany({ ride_group_id: group_src, room_type: "ride_group" });

            const chatRoom = await ChatRoom.findOne({
                ride_group_id: group_dest,
                room_type: "ride_group"
            });

            if (!chatRoom) {
              await ChatRoom.create({
                ride_group_id: group_dest,
                room_type: "ride_group",
                name: groupName,
                participants
              });
            } else {
              // add new participants to the existing chat room
              for (const participant of participants) {
                await chatRoom.addParticipant(participant.user_id, participant.user_type, participant.name);
              }
            }

            return res.success("Ride groups merged successfully.");
        } catch (error) {
            console.error("Error merging ride groups:", error);
            return next(error);
        }
    },

    mergeManyRideGroups: async (req, res, next) => {
        try {
            const { group_src_list, group_dest } = req.body;
          
            if (group_src_list.includes(group_dest)) {
                throw new BadRequestError("Source and destination groups cannot be the same");
            }
    
            const { participants, groupName } = await RideGroupRepository.mergeRideGroupsArray(group_src_list, group_dest);
    
            // Delete chat rooms for merged groups
            await ChatRoom.deleteMany({ ride_group_id: { $in: group_src_list }, room_type: "ride_group" });
    
            // Handle chat room for destination group
            const chatRoom = await ChatRoom.findOne({
                ride_group_id: group_dest,
                room_type: "ride_group"
            });
    
            if (!chatRoom) {
                await ChatRoom.create({
                    ride_group_id: group_dest,
                    room_type: "ride_group",
                    name: groupName,
                    participants: participants
                });
            } else {
                for (const participant of participants) {
                    await chatRoom.addParticipant(participant.user_id, participant.user_type, participant.name);
                }
            }
    
            return res.success("Ride groups merged successfully.");
        } catch (error) {
            console.error("Error merging ride groups:", error);
            return next(error);
        }
    },

    assignDriverToRideGroup: async (req, res, next) => {
        try {
            const { rideGroupId } = req.params
            const { driverId } = req.body

            const rideGroup = await RideGroupRepository.findById(rideGroupId)
            if (!rideGroup) throw new NotFoundError("Ride group not found")

            /* if (rideGroup.driver_id) {
              throw new BadRequestError("This ride group already has a driver assigned")
            } */

            const updatedRideGroup = await RideGroupRepository.update(rideGroupId, {
              driver_id: driverId
            })

            if (!updatedRideGroup) {
              throw new NotFoundError("Failed to assign driver to ride group")
            }

            return res.success("Driver assigned to ride group successfully")
        
          } catch (error) {
    				return next(error)
          }

    },

    getAllParentsLocations: async (req, res, next) => {
      try {
        const { rideGroupId } = req.params;
  
        const locations = await RideGroupRepository.getAllParentsLocationsByRideGroupId(rideGroupId);

        return res.success("Locations are retrieved successfully!", {
          locations
        });
      } catch (error) {
        return next(error);
      }
    },

    createRideGroup: async (req, res, next) => {
      try {
        logger.debug("ride group creation attempt", { accountId: req.userId });
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
            parent_creator_id: req.body.parent_id,
            group_name: `${school.school_name} - #${countGroupsInSchool + 1 || 1} - ${Math.floor(1000 + Math.random() * 9999999)}`,
            school_id: req.body.school_id,
            current_seats_taken: req.body.children.length || 0,
            invite_code: inviteCode || null,
            group_type: req.body.group_type || 'regular', // Default to 'regular' if not provided
            status: "new"
          },
          parentGroupPayload: {
            parent_id: req.body.parent_id,
            current_seats_taken: req.body.children.length || 0,
            home_lat: req.body.home.home_lat,
            home_lng: req.body.home.home_lng,
          },
          children: req.body.children || [],
          days: req.body.days || [],
          subscriptionPayload: {
            parent_id: req.body.parent_id,
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

    manageChildrenOffGroup: async (req, res, next) => {
      try {
        logger.debug("Parent attempting to add children to group", {
          accountId: req.userId,
        });
  
        const account = await AccountRepository.findById(req.userId);
        if (!account) {
          throw new NotFoundError("Account not found");
        }
  
        if (!account.is_verified) {
          throw new ForbiddenError(
            "Account email must be verified before modifying a group"
          );
        }
  
        // Get the ride group
        const rideGroup = await RideGroupRepository.findById(req.body.group_id);
        if (!rideGroup) {
          throw new NotFoundError("Ride group not found");
        }
  
        // Check if the parent is part of this group
        const parentGroup = await ParentGroupRepository.findByGroupAndParentId(
          rideGroup.id,
          req.body.parent_id
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
            req.body.parent_id,
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
    },

    deleteChildrenFromGroup: async (req, res, next) => {
      try {
        logger.debug("Parent attempting to delete children from group", {
          accountId: req.userId,
        });

        const { id, parent_group_id } = req.body

        const deletedChild = await ChildrenGroupDetailsRepository.delete(id);

        if (!deletedChild) throw new NotFoundError("Child not found in the group");

        const seats_taken = await ParentGroupRepository.getSeatsTaken(rideGroup.id, rideGroup.parent_creator_id)
        await RideGroupRepository.update(rideGroup.id, {
          current_seats_taken: seats_taken - 1 < 0 ? 0 : seats_taken - 1,
        });
        
        return res.success("Child has been removed from the group successfully", {
          children: deletedChild,
        });
      } catch (error) {
        logger.error("Unable to remove children from the group", {
          error: error.message,
          stack: error.stack,
        });
        next(error);
      }
    }
};

module.exports = rideGroupController;
