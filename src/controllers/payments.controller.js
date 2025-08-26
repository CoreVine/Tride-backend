const parentGroupSubscriptionRepository = require("../data-access/parentGroupSubscription");
const RideGroupRepository =  require("../data-access/rideGroup");
const PlanRepository = require("../data-access/plan");
const PaymentHistoryRepository = require("../data-access/paymentHistory");
const ParentGroupRepository = require("../data-access/parentGroup");

const subscriptionDomain = require("../domain/subscription/subscription");
const { RIDE_PRICE_PER_KM, MAX_SEATS_CAR } = require("../config/upload/constants");
const openRouteUtil = require("../utils/openRoutesService");

const { createPagination } = require("../utils/responseHandler");
const { exportPaymentsToExcel } = require("../utils/export/exceljs");
const { NotFoundError, BadRequestError } = require('../utils/errors');

const paymentsController = {
    getAllPayments: async (req, res, next) => {
        try {
            const { page = 1, limit = 10 } = req.query;

            // Logic to fetch all payments
            const { count, rows: payments } = await parentGroupSubscriptionRepository.findAllPaginatedDetailed(page, limit);
            const pagination = createPagination(page, limit, count);

            res.success("Payments retrieved successfully", { 
                pagination,
                payments 
            });
        } catch (error) {
            return next(error);
        }
    },

    getPaymentById: async (req, res, next) => {
        try {
            const { id } = req.params;

            // Logic to fetch payment by ID
            const payment = await parentGroupSubscriptionRepository.findByIdDetailed(id);
            if (!payment) {
                throw new NotFoundError("Payment not found");
            }

            res.success("Payment retrieved successfully", { payment });
        } catch (error) {
            return next(error);
        }
    },
    
    exportAllPayments: async (req, res, next) => {
        const { from, to } = req.query;

        try {
            const { count, rows: payments } = await parentGroupSubscriptionRepository.findAllInRange(from, to);

            if (count === 0) {
                throw new NotFoundError("No payments found in the specified date range");
            }

            // Export payments to Excel
            const exportBuffer = await exportPaymentsToExcel(payments);
            const fileName = `payments_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
            
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.send(exportBuffer);
        } catch (error) {
            return next(error);
        }
    },

    createParentCashPayment: async (req, res, next) => {
        try {
            const data = req.body; 
            const rideGroup = await RideGroupRepository.getRideGroupDetails(data.ride_group_id);

            if (!rideGroup) throw new NotFoundError("Ride group not found");

            const existingSubscription = await parentGroupSubscriptionRepository.findActiveSubscriptionByParentAndGroup(
              data.parent_id,
              rideGroup.id
            );

            
            if (existingSubscription) throw new BadRequestError("You already have an active subscription for this ride group");

            const { distance, seatsTaken, totalDays } = await subscriptionDomain.getPriceFactors({
                rideGroupId: rideGroup.id,
                parentId: data.parent_id,
                homeLocation: {
                    homeLat: rideGroup.parentGroups[0].home_lat,
                    homeLng: rideGroup.parentGroups[0].home_lng,
                },
                schoolLocation: {
                    schoolLat: rideGroup.school.lat,
                    schoolLng: rideGroup.school.lng,
                },
            });

            const planDetails = await PlanRepository.findById(data.plan_id);
            
            if (!planDetails) {
                throw new NotFoundError("Plan not found for the specified type");
            }

            const { overallPrice, toPayPrice } = await subscriptionDomain.calculateOverallPrice({
                distance,
                seatsTaken: rideGroup.group_type === 'premium' ? MAX_SEATS_CAR : seatsTaken,
                totalDays,
                planDetails,
            });

            if (data.default == false) {
                if (!data.started_at || !data.valid_until) {
                    throw new BadRequestError("started_at and valid_until are required when default is false");
                }
                if (new Date(data.valid_until) <= new Date(data.started_at)) {
                    throw new BadRequestError("valid_until must be after started_at");
                }
            }

            const newSubscription = await parentGroupSubscriptionRepository.create({
                parent_id: data.parent_id,
                ride_group_id: data.ride_group_id,
                plan_id: data.plan_id,
                current_seats_taken: rideGroup.group_type === 'premium' ? MAX_SEATS_CAR : seatsTaken,
                pickup_days_count: totalDays,
                started_at: data.default ? new Date() : new Date(data.started_at),
                valid_until: data.default ? new Date(new Date().setMonth(new Date().getMonth() + planDetails.months_count)): new Date(data.valid_until),
                remaining_time: 0,
                total_amount: toPayPrice,
                status: 'paid',
            });

            const parentGroup = await ParentGroupRepository.findByGroupAndParentId(data.ride_group_id, data.parent_id);
            
            if (rideGroup.group_type === 'premium') {
                await ParentGroupRepository.updateParentGroupStatus(parentGroup.id, 'ready');
                console.log(`Premium group: Updated parent group ${parentGroup.id} status to 'ready'`);
            } else {
                await ParentGroupRepository.updateParentGroupStatus(parentGroup.id, 'pending');
                console.log(`Regular group: Updated parent group ${parentGroup.id} status to 'pending'`);
            }

            const subscriptionHistory = await PaymentHistoryRepository.create({
                paymob_receipt_id: `CASH${newSubscription.id}`,
                paid_at: new Date(),
                amount: toPayPrice,
                parent_subscription_id: newSubscription.id,
            })

            return res.success("Cash payment created successfully", {
                history: subscriptionHistory,
                subscription: newSubscription,
            })

        } catch (error) {
            return next(error);
        }
    },

    createDriverCashPayment: async (req, res, next) => {
        try {
            
        } catch (error) {
            return next(error);
        }
    }
};

module.exports = paymentsController;
