const ParentGroupRepository = require('../../data-access/parentGroup');
const GroupDaysRepository = require('../../data-access/dayDatesGroup');
const openRouteUtil = require("../../utils/openRoutesService");
const { BadRequestError, ForbiddenError } = require('../../utils/errors/types/Api.error');
const parentGroupSubscriptionRepository = require('../../data-access/parentGroupSubscription');
const { RIDE_PRICE_PER_KM, MAX_SEATS_CAR } = require('../../config/upload/constants');

// TODO: Figure out where to store the ride price per km
const calculateOverallPrice = async (details) => {
  try {
    const {
      planDetails,
      distance,
      seatsTaken,
      totalDays,
    } = details;
    // Distance is already round trip, so we don't multiply by days again
    const totalMonthlyDistance = distance * 4; // Only multiply by 4 weeks
    const pricePerMonth = RIDE_PRICE_PER_KM(totalMonthlyDistance);
    let overAllPrice = (pricePerMonth / MAX_SEATS_CAR) * seatsTaken;
  
    // Only multiply by months at the end
    overAllPrice *= planDetails.months_count;

    if (isNaN(overAllPrice) || overAllPrice < 0) {
      throw new BadRequestError("Invalid calculation for overall price");
    }
    // Remove the ×2 multiplication
    // overAllPrice = overAllPrice *2;
    // No discount applied - pay full amount
    const to_pay_price = overAllPrice * (1 - planDetails.discount_percentage);
  
    return {
      overallPrice: Number(overAllPrice.toFixed(2)),
      toPayPrice: Number(to_pay_price.toFixed(2))
    };
  } catch (error) {
    console.error("Error calculating overall price:", error);
    throw error;
  }
}

const getPriceFactors = async (details) => {
  const {
    rideGroupId,
    homeLocation: { homeLat, homeLng },
    parentId,
    schoolLocation: { schoolLat, schoolLng },
  } = details;
  try {
      // get all parameters required for the price calculation
      const seatsTaken = await ParentGroupRepository.getSeatsTaken(rideGroupId, parentId);

      if (seatsTaken <= 0) {
        throw new BadRequestError("No seats taken by parent in this ride group");
      }

      const totalDays = await GroupDaysRepository.countDaysInGroup(rideGroupId);
      const points = {
        lat_lng_house: [
          parseFloat(homeLng),
          parseFloat(homeLat),
        ],
        lat_lng_school: [
          parseFloat(schoolLng),
          parseFloat(schoolLat),
        ],
      };
      const oneWayDistance = await openRouteUtil.getDistanceForRide(points);

      if (isNaN(oneWayDistance) || oneWayDistance <= 0) {
        throw new BadRequestError("Invalid distance calculated for the ride");
      }

      // Calculate round trip distance (home to school and back)
      const distance = parseFloat((oneWayDistance * 2).toFixed(2));

      return {
        seatsTaken,
        totalDays,
        distance
      };
  } catch (error) {
    console.error("Error getting price factors:", error);
    throw error;
  }
}

const isParentSubscriptionValid = async (accountId, rideGroupId) => {
  try {
    const subscription = await parentGroupSubscriptionRepository.findByAccountIdAndGroupId(accountId, rideGroupId);
    if (!subscription || subscription.status !== 'paid') {
      throw new ForbiddenError("Parent subscription is invalid or has expired");
    }
    
    const currentDate = new Date();
    if (!subscription.valid_until || new Date(subscription.valid_until) < currentDate) {
      if (subscription.status !== 'expired') {
        // invalidation subscription if it is not already
        await subscription.update({
          status: 'expired',
          valid_until: null,
          remaining_time: 0
        });
      }
      throw new ForbiddenError("Parent subscription has expired");
    }

    return;
  } catch (error) {
    console.error("Error checking parent subscription validity:", error);
    throw error;
  }
}

module.exports = {
  calculateOverallPrice,
  getPriceFactors,
  isParentSubscriptionValid
};