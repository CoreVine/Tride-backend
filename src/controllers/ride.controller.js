const RideGroupRepository = require("../data-access/rideGroup");
const RideInstanceRepository = require("../data-access/rideInstance");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();
const { MAX_SEATS_CAR } = require("../config/upload/constants");

const rideController = {
    createRideInstance: async (req, res, next) => {
        const { ride_group_id, type } = req.body;
        const driver_id = req.account.driver.id;

        try {
            const rideGroup = await RideGroupRepository.findOneIfDriver(ride_group_id, driver_id);

            if (!rideGroup) {
                throw new NotFoundError("Ride group is not found");
            }

            const existingRideInstance = await RideInstanceRepository.findActiveInstanceByRideGroupAndDriver(ride_group_id, driver_id);

            if (existingRideInstance) {
                logger.warn(`Driver ${driver_id} attempted to create duplicate ride instance for group ${ride_group_id}`, {
                    existingInstanceId: existingRideInstance.id,
                    status: existingRideInstance.status
                });
                
                return res.success("A ride instance is already active for this group", {
                    rideInstance: existingRideInstance,
                    message: "Cannot create multiple ride instances. Please complete or cancel the existing ride first."
                });
            }

            const driverActiveRides = await RideInstanceRepository.findActiveInstancesByDriver(driver_id);
            
            if (driverActiveRides && driverActiveRides.length > 0) {
                logger.warn(`Driver ${driver_id} has active rides in other groups`, {
                    activeRides: driverActiveRides.map(r => ({ id: r.id, groupId: r.group_id, status: r.status }))
                });
                
                throw new BadRequestError(`You have ${driverActiveRides.length} active ride(s) in other groups. Please complete them before starting a new ride.`);
            }

            if (rideGroup.current_seats_taken !== MAX_SEATS_CAR) {
                throw new BadRequestError(`Cannot start a ride on a group that is not ${MAX_SEATS_CAR} members!`);
            }

            // create a new ride instance
            const newRideInstance = await RideInstanceRepository.create({
                type,
                driver_id,
                group_id: ride_group_id
            });

            return res.success("Created a new ride instance", {
                rideInstance: newRideInstance
            });

        } catch (error) {
            logger.error(`Error creating ride instance: ${error.message}`);
            next(error);
        }
    }
};

module.exports = rideController;
