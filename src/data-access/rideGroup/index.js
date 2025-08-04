const RideGroupModel = require("../../models/RideGroup");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");
const { generateInviteCode } = require("../../utils/generators/uuid-gen");
const ParentGroupSubscriptionRepository = require("../parentGroupSubscription");
const ParentGroupRepository = require("../parentGroup");
const ChildGroupDetailsRepository = require("../childGroupDetails");
const GroupDaysRepository = require("../dayDatesGroup");
const { MAX_SEATS_CAR } = require("../../config/upload/constants");
const { BadRequestError } = require("../../utils/errors/types/Api.error");
const { isParentSubscriptionValid } = require("../../domain/subscription/subscription");

class RideGroupRepository extends BaseRepository {
  constructor() {
    super(RideGroupModel);
  }

  async getRideGroupDetails(rideGroupId) {
    try {
      return await this.model.findByPk(rideGroupId, {
        include: [
          {
            association: "creator",
            attributes: ["id"],
          },
          {
            association: "parent_group_subscription",
          },
          {
            association: "driver",
            attributes: { exclude: ["created_at", "updated_at"] },
          },
          {
            association: "school",
          },
          {
            association: "parentGroups",
            include: [
              {
                association: "parent",
                attributes: { exclude: ["created_at", "updated_at"] },
              },
              {
                association: "childDetails",
                include: [
                  {
                    association: "child",
                  },
                ],
              },
            ],
          },
          {
            association: "dayDates",
          },

        ],
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findOneIfDriver(ride_group_id, drive_id) {
    try {
      await this.model.findOne({
        where: {
          id: ride_group_id,
          driver_id: drive_id
        },
        include: [
          {
            association: "driver",
            required: true,
            attributes: ["id", "account_id", "name"]
          }
        ]
      });
      return ride_group_id;
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findAllIfParent(parentId, options = {}) {
    try {
      const queryOptions = {
        where: {
          "$parentGroups.parent_id$": parentId,
          "$parent_group_subscription.status$": {
            [Op.ne]: "remove"
          },
        },
        include: [
          {
            association: "parentGroups",
            where: {
              status: {
                [Op.ne]: "removed"
              }
            },
            required: true,
          },
          {
            association: "creator",
            attributes: { exclude: ["created_at", "updated_at"] },
          },
          {
            association: "driver",
            attributes: { exclude: ["created_at", "updated_at"] },
          },
          {
            association: "school",
          },
          {
            association: "parent_group_subscription",
            attributes: { exclude: [
                "id",
                "parent_id",
                "ride_group_id",
                "current_seats_taken",
                "pickup_days_count",
                "started_at",
                "valid_until",
                "plan_id",
                "total_amount",
            ] },
          },
          {
            association: "parentGroups",
            include: [
              {
                association: "parent",
                attributes: { exclude: ["created_at", "updated_at"] },
              },
              {
                association: "childDetails",
                include: [
                  {
                    association: "child",
                  },
                ],
              },
            ],
          },
          {
            association: "dayDates",
          },
        ],
        ...options,
      };
      return await this.model.findAll(queryOptions);
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async createNewRideGroup(payload) {
    let { rideGroupPayload, parentGroupPayload, children, days } = payload;
    const t = await this.model.sequelize.transaction();
    try {
      // Step 1: Create the ride group
      const rideGroup = await this.model.create(rideGroupPayload, {
        transaction: t,
      });

      if (!rideGroup) {
        throw new DatabaseError("Failed to create a new ride group!");
      }

      // Step 2: Create the parent group
      parentGroupPayload = {
        ...parentGroupPayload,
        group_id: rideGroup.id,
      };

      const parentGroup = await ParentGroupRepository.create(
        parentGroupPayload,
        { transaction: t }
      );

      if (!parentGroup) {
        throw new DatabaseError("Failed to create a new parent group!");
      }

      // Step 3: Associate children with the parent group
      const childrenOnParentGroup =
        await ChildGroupDetailsRepository.addChildrenToParentGroup(
          parentGroupPayload.parent_id,
          parentGroup.id,
          children,
          { transaction: t }
        );

      // step-4: add days
      const daysAdded = await GroupDaysRepository.createBulkDaysGroup(
        rideGroup.id,
        days,
        { transaction: t }
      );

      if (!daysAdded) {
        throw new DatabaseError("Unable to add new days to a group!");
      }

      // step-5: add subscription
      const subscription = await ParentGroupSubscriptionRepository.create({
        ...payload.subscriptionPayload,
        ride_group_id: rideGroup.id,
      }, { transaction: t });

      if (!subscription) {
        throw new DatabaseError("Failed to create a new subscription!");
      }
      await t.commit();

      return {
        ...rideGroup,
        parentGroup: {
          ...parentGroup,
          children: childrenOnParentGroup,
        },
        days: daysAdded,
        subscription: {
          status: subscription.status,
        },
      };
    } catch (error) {
      await t.rollback();

      throw error;
    }
  }

  async countRideGroupsBySchoolId(schoolId) {
    try {
      return await this.model.count({
        where: {
          school_id: schoolId
        }
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findOneByIdWithSchoolAndParent(parentId, rideGroupId, options = {}) {
    try {
      const queryOptions = {
        where: {
          id: rideGroupId,
          "$parentGroups.parent_id$": parentId,
        },
        include: [
          {
            association: "parentGroups",
            where: {
              parent_id: parentId,
            },
            required: true,
          },
          {
            association: "school",
            required: true,
          },
        ],
        ...options,
      };

      return await this.model.findOne(queryOptions);
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findByIdIfParent(parentId, rideGroupId, options = {}) {
    try {
      const queryOptions = {
        where: {
          id: rideGroupId,
          "$parentGroups.parent_id$": parentId,
        },
        include: [
          {
            association: "parentGroups",
            required: true,
          },
        ],
        ...options,
      };

      return await this.model.findOne(queryOptions);
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findByIdDetailed(rideGroupId, options = {}) {
    try {
      const queryOptions = {
        where: { id: rideGroupId },
        include: [
          {
            association: "creator",
            attributes: ["id"],
          },
          {
            association: "parent_group_subscription",
            include: [
              "plan",
              {
                association: "payment_history",
              },
            ],
          },
          {
            association: "driver",
            attributes: { exclude: ["created_at", "updated_at"] },
          },
          {
            association: "school",
          },
          {
            association: "parentGroups",
            include: [
              {
                association: "parent",
                attributes: { exclude: ["created_at", "updated_at"] },
              },
              {
                association: "childDetails",
                include: [
              {
                association: "child",
              },
                ],
              },
            ],
          },
          {
            association: "dayDates",
          },
        ],
        ...options,
      };
      return await this.model.findOne(queryOptions);
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findIfAccountIdInsideGroup(rideGroupId, accountId, accountType) {
    try {
      const whereClause = {
        id: rideGroupId
      };

      let includeOptions = [];

      if (accountType === "parent") {
        whereClause["$parentGroups.parent.account_id$"] = accountId;
        includeOptions = [
          {
            association: "parentGroups",
            required: true,
            include: [
              {
                association: "parent",
                required: true,
                where: { account_id: accountId },
              },
            ],
          },
        ];
      } else if (accountType === "driver") {
        whereClause["$driver.account_id$"] = accountId;
      } else if (accountType === "admin") {
        return null;
      } else {
        throw new DatabaseError("Invalid account type provided");
      }

      return await this.model.findOne({
        where: whereClause,
        include: includeOptions,
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }
  /**
   * Generates a unique invite code for a ride group
   * @param {number} length - Length of the invite code
   * @returns {Promise<string>} A unique invite code
   */
  async generateUniqueInviteCode(length = 8) {
    try {
      let isUnique = false;
      let inviteCode = "";

      // Keep generating codes until we find a unique one
      while (!isUnique) {
        inviteCode = generateInviteCode(length);

        // Check if this code already exists
        const existingGroup = await this.model.findOne({
          where: { invite_code: inviteCode },
        });

        if (!existingGroup) {
          isUnique = true;
        }
      }

      return inviteCode;
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findAllDetailedPaginated(page, limit, filters = {}) {
    try {
      const filter = {};

      if (filters.name) {
        filter.group_name = {
          [Op.like]: `%${filters.name}%`
        };
      }

      if (filters.seats) {        
        filter.current_seats_taken = {
          [Op.gte]: filters.seats
        };
      }

      if (filters.type) {
        filter.group_type = filters.type;
      }

      if (filters.school_id) {
        filter.school_id = filters.school_id;
      }

      const { count, rows } = await this.model.findAndCountAll({
        where: filter,
        include: [
          {
            association: "creator",
            attributes: ["id"],
          },
          {
            association: "parent_group_subscription",
          },
          {
            association: "driver",
            attributes: { exclude: ["created_at", "updated_at"] },
          },
          {
            association: "school",
          },
          {
            association: "parentGroups",
            where: {
              status: {
                [Op.ne]: "removed"
              }
            },
            include: [
              {
                association: "parent",
                attributes: { exclude: ["created_at", "updated_at"] },
              },
              {
                association: "childDetails",
                include: [
                  {
                    association: "child",
                  },
                ],
              },
            ],
          },
          {
            association: "dayDates",
          },
        ],
        offset: (page - 1) * limit,
        limit,
      });

      return { count, rows };
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findAllDetailedPaginatedByParentId(parentId, page, limit, filters = {}) {
    try {
      const filter = {};

      if (filters.name) {
        filter.group_name = {
          [Op.like]: `%${filters.name}%`
        };
      }

      if (filters.seats) {        
        filter.current_seats_taken = {
          [Op.gte]: filters.seats
        };
      }

      if (filters.type) {
        filter.group_type = filters.type;
      }


      const { count, rows } = await this.model.findAndCountAll({
        where: {
          ...filter,
          parent_creator_id: parentId,
        },
        include: [
          {
            association: "creator",
            attributes: ["id"],
          },
          {
            association: "parent_group_subscription",
          },
          {
            association: "driver",
            attributes: { exclude: ["created_at", "updated_at"] },
          },
          {
            association: "school",
          },
          {
            association: "parentGroups",
            where: {
              status: {
                [Op.ne]: "removed"
              }
            },
            include: [
              {
                association: "parent",
                attributes: { exclude: ["created_at", "updated_at"] },
              },
              {
                association: "childDetails",
                include: [
                  {
                    association: "child",
                  },
                ],
              },
            ],
          },
          {
            association: "dayDates",
          },
        ],
        offset: (page - 1) * limit,
        limit,
      });

      const hasNextPage = count > page * limit;
      const hasPreviousPage = page > 1;

      return { count, rows, hasNextPage,hasPreviousPage };
    } catch (error) {
      throw new DatabaseError(error);
    }
  }


  async findByInviteCode(inviteCode) {
    try {
      return await this.model.findOne({
        where: {
          invite_code: inviteCode,
        },
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async mergeRideGroups(groupSrcId, groupDestId) {
    const t = await this.model.sequelize.transaction();
    
    try {
      const groupSrc = await this.model.findByPk(groupSrcId, {
        include: [
          {
            association: 'parentGroups',
            include: [
              {
                association: 'childDetails',
                include: ['child']
              }
            ]
          },
          'parent_group_subscription', 
          'dayDates', 
          'rideInstances'
        ],
        transaction: t
      });
      const groupDest = await this.model.findByPk(groupDestId, {
        include: [
          {
            association: "parentGroups",
            include: [
              {
                association: 'childDetails'
              },
              {
                association: "parent",
                attributes: ["account_id"],
              }
            ]
          },
          {
            association: "driver",
            attributes: ["account_id"],
          },
        ],
        transaction: t
      });

      if (!groupSrc || !groupDest) {
        throw new BadRequestError("Cannot merge groups: source or destination group not found.");
      }

      if (groupSrc.group_type === 'premium' || groupDest.group_type === 'premium') {
        throw new BadRequestError("Cannot merge premium groups");
      }
      
      if (groupSrc.current_seats_taken + groupDest.current_seats_taken > MAX_SEATS_CAR) {
        throw new BadRequestError("Unable to merge groups: total seats exceed maximum allowed");
      }

      // Check for duplicate parents between source and destination groups
      const destParentIds = new Set(groupDest.parentGroups.map(pg => pg.parent_id));
      const duplicateParents = groupSrc.parentGroups.filter(pg => destParentIds.has(pg.parent_id));
      const remainingParentGroups = groupSrc.parentGroups.filter(pg => !destParentIds.has(pg.parent_id));
      
      if (duplicateParents.length > 0) {
        // For each duplicate parent, merge their data into the existing parent group in destination
        for (const duplicateParent of duplicateParents) {
          const existingParentGroup = groupDest.parentGroups.find(pg => pg.parent_id === duplicateParent.parent_id);
          
          if (existingParentGroup && duplicateParent.childDetails?.length > 0) {
            // Update child details to point to the existing parent group in destination
            for (const childDetail of duplicateParent.childDetails) {
              childDetail.parent_group_id = existingParentGroup.id;
              await childDetail.save({ transaction: t });
            }
            
            // Update the existing parent group's seat count
            existingParentGroup.current_seats_taken += duplicateParent.current_seats_taken;
            await existingParentGroup.save({ transaction: t });
          }
          
          // Remove the duplicate parent group after moving its data
          await duplicateParent.destroy({ transaction: t });
        }
      }

      // Move remaining parent groups to destination
      for (const parentGroup of remainingParentGroups) {
        parentGroup.group_id = groupDest.id;
        await parentGroup.save({ transaction: t });
      }
      
      // Handle subscriptions - only move non-duplicate parent subscriptions
      const remainingParentIds = new Set(remainingParentGroups.map(pg => pg.parent_id));
      const subscriptionsToMove = groupSrc.parent_group_subscription.filter(sub => remainingParentIds.has(sub.parent_id));
      for (const subscription of subscriptionsToMove) {
        subscription.ride_group_id = groupDest.id;
        await subscription.save({ transaction: t });
      }
      
      // Remove subscriptions for duplicate parents (they should keep their existing subscriptions in destination)
      const duplicateSubscriptions = groupSrc.parent_group_subscription.filter(sub => !remainingParentIds.has(sub.parent_id));
      for (const subscription of duplicateSubscriptions) {
        await subscription.destroy({ transaction: t });
      }

      // ...existing code for dayDates and rideInstances...
      for (const dayDate of groupSrc.dayDates) {
        try {
          dayDate.ride_group_detailsid = groupDest.id;
          await dayDate.save({ transaction: t });
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            // destroy the day date if it already exists in the destination group, and continue
            await dayDate.destroy({ transaction: t });
          } else {
            throw error;
          }
        }
      }

      for (const rideInstance of groupSrc.rideInstances) {
        rideInstance.group_id = groupDest.id;
        await rideInstance.save({ transaction: t });
      }

      // make an array of participants for the chat room
      const participants = [
        ...remainingParentGroups.map(pg => ({
          user_id: pg.parent.account_id,
          user_type: "parent",
          name: pg.parent.name || null
        })),
        ...groupDest.parentGroups.map(pg => ({
          user_id: pg.parent.account_id,
          user_type: "parent",
          name: pg.parent.name || null
        })),
      ];

      if (groupDest.driver_id) {
        participants.push({
          user_id: groupSrc.driver.account_id,
          user_type: "driver",
          name: groupSrc.driver.name || null
        });
      }

      // Update the current seats taken in the destination group
      groupDest.current_seats_taken += groupSrc.current_seats_taken;
      await groupDest.save({ transaction: t });

      // remove the source group
      await groupSrc.destroy({ transaction: t });

      await t.commit();

      return {
        participants,
        groupName: groupDest.group_name || `Chat Room for ${groupDest.id}`,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getAllParentsLocationsByRideGroupId(rideGroupId) {
    try {
      return await this.model.findAll({
        where: {
          id: rideGroupId
        },
        attributes: [],
        include: [
          {
            association: "parentGroups",
            attributes: ["parent_id", "home_lat", "home_lng"],
            include: [
              {
                association: "parent",
                attributes: ["account_id", "name"]
              }
            ],
          }
        ]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }
}

module.exports = new RideGroupRepository();
