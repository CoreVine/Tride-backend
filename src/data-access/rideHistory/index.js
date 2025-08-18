const RideHistoryModel = require("../../models/RideHistory");
const RideChildDeliveredModel = require("../../models/RideChildDelivered");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");

class RideHistoryRepository extends BaseRepository {
  constructor() {
    super(RideHistoryModel);
  }

  async getCurrentRideHistoriesByRideInstanceId(rideInstanceId) {
    try {
      return await this.model.findAll({
        where: {
          ride_instance_id: rideInstanceId
        },
        include: [{
          association: 'deliveries'
        }]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findAllByRideInstanceId(rideInstanceId) {
    try {
      return await this.model.findAll({
        where: {
          ride_instance_id: rideInstanceId
        },
        include: [
          {
            association: "deliveries",
            attributes: ["child_id"],
            include: [
              {
                association: "child",
                attributes: ["id", "parent_id"]
              }
            ]
          }
        ],
        order: [['issued_at', 'ASC']]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async getDeliveredChildrenByHistoryId(historyId) {
    try {
      const history = await this.model.findByPk(historyId, {
        include: [
          {
            association: "deliveredChildren",
            attributes: ["child_id"]
          }
        ]
      });
      
      return history ? history.deliveredChildren : [];
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  /**
   * Create ride history with optional children delivery records
   * @param {Object} rideHistoryData - Ride history data
   * @param {Array} childrenIds - Array of child IDs (optional)
   */
  async createWithChildren(rideHistoryData, childrenIds = []) {
    const transaction = await this.model.sequelize.transaction();
    
    try {
      // Create the ride history record
      const rideHistory = await this.model.create(rideHistoryData, { transaction });

      // If children IDs are provided, create delivery records
      if (childrenIds && childrenIds.length > 0) {
        const deliveryRecords = childrenIds.map(childId => ({
          ride_history_id: rideHistory.id,
          child_id: childId
        }));

        await RideChildDeliveredModel.bulkCreate(deliveryRecords, { transaction });
      }

      await transaction.commit();
      
      // Return the created ride history with delivery records
      return await this.model.findByPk(rideHistory.id, {
        include: [{
          model: RideChildDeliveredModel,
          as: 'deliveries'
        }]
      });

    } catch (error) {
      await transaction.rollback();
      throw new DatabaseError(error);
    }
  }
}

module.exports = new RideHistoryRepository();
