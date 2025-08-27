const RideHistoryRepository = require("../rideHistory");
const RideInstanceModel = require("../../models/RideInstance");
const BaseRepository = require("../base.repository");
const { DatabaseError, Op } = require("sequelize");
const { isLocationCloseToCheckpoint } = require("../../domain/checkpoint/detector");
const loggingService = require("../../services/logging.service");
const logger = loggingService.getLogger();

class RideInstanceRepository extends BaseRepository {
  constructor() {
    super(RideInstanceModel);
  }

  async findActiveInstanceByRideGroupAndDriver(rideGroupId, driverId) {
    try {      
      return await this.model.findOne({
        where: {
          driver_id: driverId,
          group_id: rideGroupId,
          status: {
            [Op.in]: ["started", "active"]
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  async startNewRide(rideInstance, currentLocation) {
    try {
      // Use a transaction for atomic operations
      const transaction = await this.model.sequelize.transaction();
      
      try {
        await this.model.update(
          { status: "active" },
          { 
          where: { id: rideInstance.id },
          transaction 
          }
        );
        const newRideStart = rideInstance.type === "to_school" ? "deliver the children to school" : "pickup children from school";
        
        // Create ride history record - handle missing 'type' column gracefully
        const historyData = {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          issued_at: new Date().toISOString().slice(0, 10),
          status: `Started trip: ${newRideStart}`,
          ride_instance_id: rideInstance.id
        };
        
        // Always include type field with default value to handle all schema variations
        await RideHistoryRepository.create(
          { ...historyData, type: "garage" },
          { transaction }
        );

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  async findActiveInstanceByDriverId(driverId) {
    try {      
      return await this.model.findOne({
        where: {
          driver_id: driverId,
          status: {
            [Op.in]: ["started", "active"]
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

  async finishRide(rideInstanceId) {
    try {      
      return await this.model.update({
        status: "ended",
        ended_at: new Date().toISOString()
      }, {
        where: {
          id: rideInstanceId
        }
      });
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }

    /**
   * Find all active ride instances for a specific driver across all groups
   * @param {number} driverId - The driver ID
   * @returns {Promise<Array>} Array of active ride instances
   */
  async findActiveInstancesByDriver (driverId) {
    try {
        return await this.model.findAll({
            where: {
                driver_id: driverId,
                status: {
                    [Op.in]: ['started', 'ongoing']
                }
            },
            include: [
                {
                    association: 'group',
                    attributes: ['id', 'group_name', 'school_id']
                }
            ],
            order: [['started_at', 'DESC']]
        });
      } catch (error) {
        logger.error(`Error finding active instances for driver ${driverId}`, {
            error: error.message,
            stack: error.stack
        });
        throw error;
      }
  }

  async findActiveInstanceByParentAndGroup(parentId, rideGroupId) {
    try {      
      return await this.model.findOne({
        where: {
          group_id: rideGroupId,
          status: {
            [Op.in]: ["started", "active"]
          }
        },
        include: [
          {
            association: "group",
            required: true,
            include: [
              {
                association: "parentGroups",
                required: true,
                where: {
                  parent_id: parentId
                }
              }
            ]
          }
        ]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }
  
  async findActiveInstanceByGroup(rideGroupId) {
    try {      
      return await this.model.findOne({
        where: {
          group_id: rideGroupId,
          status: {
            [Op.in]: ["started", "active"]
          }
        },
        include: [
          {
            association: "group",
            required: true,
            include: [
              {
                association: "parentGroups",
                required: true,
              }
            ]
          }
        ]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async findAllActiveInstances() {
    try {      
      return await this.model.findAll({
        where: {
          status: {
            [Op.in]: ["started", "active"]
          }
        },
        include: [
          {
            association: "group",
            required: true,
            include: [
              {
                association: "parentGroups",
                required: true,
              }
            ]
          }
        ]
      });
    } catch (error) {
      throw new DatabaseError(error);
    }
  }

  async cancelRideInstance(rideInstanceId) {
    try {
      const rideInstance = await this.model.findByPk(rideInstanceId);
      if (!rideInstance) {
        throw new DatabaseError(`Ride instance with ID ${rideInstanceId} not found`);
      }

      if (rideInstance.status === "ended") {
        throw new DatabaseError(`Ride instance with ID ${rideInstanceId} is already ended`);
      }
      
      await this.model.update(
        { status: "ended" },
        { where: { id: rideInstanceId } }
      );

      return true;
    } catch (error) {
      throw new DatabaseError(error.message);
    }
  }
}

module.exports = new RideInstanceRepository();
