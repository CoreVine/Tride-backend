const RideGroupModel = require("../../models/RideGroup");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");
const { generateInviteCode } = require("../../utils/generators/uuid-gen");
const ParentGroupSubscriptionRepository = require("../parentGroupSubscription");
const ParentGroupRepository = require("../parentGroup");
const ChildGroupDetailsRepository = require("../childGroupDetails");
const GroupDaysRepository = require("../dayDatesGroup");

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
            attributes: { exclude: ["id", "parent_id", "ride_group_id", "current_seats_taken", "pickup_days_count", "started_at", "valid_until", "plan_id", "total_amount"] },
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
      const subscription = await ParentGroupSubscriptionRepository.create(subscriptionPayload, { transaction: t });

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
}

module.exports = new RideGroupRepository();
