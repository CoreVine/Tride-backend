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
    super(RideGroupModel, isParentSubscriptionValid, ["createNewRideGroup"]);
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

  async findAllDetailedPaginated(page, limit) {
    try {
      const { count, rows } = await this.model.findAndCountAll({
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
        offset: (page - 1) * limit,
        limit,
      });

      return { count, rows };
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
    
    try {
      const t = await this.model.sequelize.transaction();
      const groupSrc = await this.model.findByPk(groupSrcId, {
        include: ['parentGroups', 'parent_group_subscription', 'dayDates', 'rideInstances'],
        transaction: t
      });
      const groupDest = await this.model.findByPk(groupDestId);

      if (!groupSrc || !groupDest || groupSrc.driver_id) {
        throw new DatabaseError("Cannot merge groups: source or destination group not found or has a driver assigned");
      }

      if (groupSrc.group_type === 'premium' || groupDest.group_type === 'premium') {
        throw new BadRequestError("Cannot merge premium groups");
      }
      
      if (groupSrc.current_seats_taken + groupDest.current_seats_taken > MAX_SEATS_CAR) {
        throw new DatabaseError("Unable to merge groups: total seats exceed maximum allowed");
      }

      // point source's parent group, subscriptions, and day dates to the destination ride group
      for (const parentGroup of groupSrc.parentGroups) {
        parentGroup.group_id = groupDest.id;
        await parentGroup.save({ transaction: t });
      }
      for (const subscription of groupSrc.parent_group_subscription) {
        subscription.ride_group_id = groupDest.id;
        await subscription.save({ transaction: t });
      }
      for (const dayDate of groupSrc.dayDates) {
        try {
          dayDate.ride_group_detailsid = groupDest.id;
          await dayDate.save({ transaction: t });
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            // destroy the day date if it already exists in the destination group
            dayDate.destroy({ transaction: t });
          } else {
            throw error;
          }
        }
      }

      for (const rideInstance of groupSrc.rideInstances) {
        rideInstance.group_id = groupDest.id;
        await rideInstance.save({ transaction: t });
      }

      // Update the current seats taken in the destination group
      groupDest.current_seats_taken += groupSrc.current_seats_taken;
      await groupDest.save({ transaction: t });

      // remove the source group
      await groupSrc.destroy({ transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new RideGroupRepository();
