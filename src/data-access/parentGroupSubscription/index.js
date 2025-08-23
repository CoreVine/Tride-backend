const ParentGroupSubscriptionModel = require('../../models/ParentGroupSubscription');
const BaseRepository = require('../base.repository');
const { DatabaseError, Op } = require("sequelize");
const { BadRequestError } = require('../../utils/errors');
const PaymentHistoryRepository = require('../paymentHistory');

class ParentGroupSubscriptionRepository extends BaseRepository {
    constructor() {
        super(ParentGroupSubscriptionModel);
    }

    async createNewSubscriptionRecord(payload) {
        const t = await this.model.sequelize.transaction();
        
        try {
            const subscription = await this.create(payload.subscription, {
                transaction: t });

            const paymentPayload = {
                ...payload.payment,
                parent_subscription_id: subscription.id
            };
    
            await PaymentHistoryRepository.create(paymentPayload, { transaction: t });
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw new DatabaseError(error);
        }
    }

    
    async createNewCashSubscriptionRecord(payload) {
        const t = await this.model.sequelize.transaction();
        
        try {
            const subscription = await this.create({
                ride_group_id: payload.ride_group_id,
                parent_id: payload.parent_id,
                current_seats_taken: payload.current_seats_taken,
                pickup_days_count: payload.pickup_days_count,
                started_at: payload.started_at,
                valid_until: payload.valid_until,
                plan_id: payload.plan_id,
                total_amount: payload.total_amount,
                status: payload.status
            }, { transaction: t });

            const paymentPayload = {
                paymob_receipt_id: `CASH${subscription.id}`,
                paid_at: new Date(),
                amount: subscription.total_amount,
                parent_subscription_id: subscription.id
            };
    
            await PaymentHistoryRepository.create(paymentPayload, { transaction: t });
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw new DatabaseError(error);
        }
    }


    async addNewPaymentHistory(payload) {
        const { subscription_id, payment } = payload;

        try {
            await PaymentHistoryRepository.create({
                ...payment,
                parent_subscription_id: subscription_id
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findActiveSubscriptionByParentAndGroup(parentId, groupId) {
        try {
            return await this.model.findOne({
                where: {
                    parent_id: parentId,
                    ride_group_id: groupId,
                    status: 'paid',
                    valid_until: {
                        [Op.gte]: new Date() // Check expiration date
                    }
                },
                include: [{
                    association: 'plan'
                },
                {
                    association: 'payment_history',
                    order: [['paid_at', 'DESC']],
                    limit: 1
                }],
                limit: 1
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findLatestSubscriptionByParentAndGroup(parentId, groupId) {
        try {
            const subscription = await this.model.findOne({
                where: {
                    parent_id: parentId,
                    ride_group_id: groupId
                },
                include: [{
                    association: 'plan'
                },
                {
                    association: 'payment_history',
                    order: [['paid_at', 'DESC']],
                    separate: true
                }],
                order: [['started_at', 'DESC']],
                limit: 1
            });

            if (subscription && subscription.plan) {
                // Add payment history count to the subscription object
                subscription.dataValues.months_paid_done = 
                    subscription.payment_history ? subscription.payment_history.length : 0;
                console.log(subscription);
                
                subscription.dataValues.remaining_months = 
                    Number(subscription.plan.months_count) - subscription.dataValues.months_paid_done;
            }

            return subscription;
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findAllPaginatedDetailed(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const { count, rows } = await this.model.findAndCountAll({
            include: [
                {
                    association: 'parent',
                    attributes: [
                        'id', 'name', 'phone', 'profile_pic', 'lat', 'lng'
                    ],
                    include: [
                        {
                            association: 'account',
                            attributes: ['id', 'email', 'account_type']
                        }
                    ]
                },
                {
                    association: 'rideGroup',
                    attributes: [
                        'id', 'group_name', 'current_seats_taken', 'group_type'
                    ],
                    include: [
                        {
                            association: 'school',
                            attributes: ['id', 'school_name']
                        }
                    ]
                },
                {
                    association: 'plan',
                    attributes: ['id', 'range', 'months_count']
                },
                {
                    association: 'payment_history',
                    order: [['paid_at', 'DESC']],
                    limit: 1
                }
            ],
            limit,
            offset,
            distinct: true
        });
        
        return { count, rows };
    }

    async findByIdDetailed(id) {
        try {
            const subscription = await this.model.findByPk(id, {
                include: [
                    {
                        association: 'parent',
                        attributes: [
                            'id', 'name', 'phone', 'profile_pic', 'lat', 'lng'
                        ],
                        include: [
                            {
                                association: 'account',
                                attributes: ['id', 'email', 'account_type']
                            }
                        ]
                    },
                    {
                        association: 'rideGroup',
                        attributes: [
                            'id', 'group_name', 'current_seats_taken', 'group_type'
                        ],
                        include: [
                            {
                                association: 'school',
                                attributes: ['id', 'school_name']
                            }
                        ]
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'range', 'months_count']
                    },
                    {
                        association: 'payment_history',
                        order: [['paid_at', 'DESC']],
                        limit: 1
                    }
                ]
            });

            if (subscription) {
                // Add payment history count to the subscription object
                subscription.dataValues.months_paid_done = 
                    subscription.payment_history ? subscription.payment_history.length : 0;
                
                subscription.dataValues.remaining_months = 
                    Number(subscription.plan.months_count) - subscription.dataValues.months_paid_done;
                subscription.dataValues.next_payment_due = subscription.payment_history[0].next_payment_due;
                subscription.dataValues.next_payment_amount = Number(subscription.payment_history[0].next_payment_amount);
            }

            return subscription;
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
    
    async extendSubscription(subscriptionId, extensionMonths, paymentData) {
        const t = await this.model.sequelize.transaction();
        
        try {
            // Get current subscription
            const subscription = await this.findById(subscriptionId);
            if (!subscription) {
                throw new DatabaseError('Subscription not found');
            }

            // Calculate new valid_until date
            const currentValidUntil = new Date(subscription.valid_until);
            const currentDate = new Date();
            
            // If subscription is expired, extend from current date, otherwise from valid_until
            const baseDate = currentValidUntil > currentDate ? currentValidUntil : currentDate;
            const newValidUntil = new Date(baseDate);
            newValidUntil.setMonth(newValidUntil.getMonth() + extensionMonths);

            // Update subscription
            await this.update(subscriptionId, {
                valid_until: newValidUntil,
                status: 'active'
            }, { transaction: t });

            // Add payment record
            const paymentPayload = {
                ...paymentData,
                parent_subscription_id: subscriptionId
            };
            
            await PaymentHistoryRepository.create(paymentPayload, { transaction: t });
            
            await t.commit();
            
            return await this.findById(subscriptionId);
        } catch (error) {
            await t.rollback();
            throw new DatabaseError(error);
        }
    }

    async findSubscriptionByParentAndGroup(parentId, groupId) {
        try {
            return await this.model.findOne({
                where: {
                    parent_id: parentId,
                    ride_group_id: groupId
                },
                include: [{
                    association: 'plan'
                }],
                order: [['started_at', 'DESC']],
                limit: 1
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findAllInRange(from, to) {
        try {
            return await this.model.findAndCountAll({
                where: {
                    started_at: {
                        [Op.gte]: from,
                        [Op.lte]: to
                    },
                },
                include: [
                    {
                        association: 'parent',
                        attributes: [
                            'name', 'phone', 'profile_pic', 'lat', 'lng'
                        ],
                        include: [
                            {
                                association: 'account',
                                attributes: ['email'],
                                where: {
                                    account_type: 'parent'
                                }
                            }
                        ]
                    },
                    {
                        association: 'rideGroup',
                        attributes: [
                            'group_name', 'current_seats_taken', 'group_type'
                        ],
                        include: [
                            {
                                association: 'school',
                                attributes: ['school_name']
                            }
                        ]
                    },
                    {
                        association: 'plan',
                        attributes: ['range', 'months_count']
                    },
                    {
                        association: 'payment_history',
                        order: [['paid_at', 'DESC']],
                        where: {
                            paid_at: {
                                [Op.gte]: new Date(from),
                                [Op.lte]: new Date(to)
                            }
                        }
                    }
                ],
                order: [
                    [{ model: this.model.sequelize.models.Parent, as: 'parent' }, { model: this.model.sequelize.models.Account, as: 'account' }, 'email', 'ASC'],
                    [{ model: this.model.sequelize.models.RideGroup, as: 'rideGroup' }, 'group_name', 'ASC'],
                    ['started_at', 'DESC']
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByAccountIdAndGroupId(accountId, groupId) {
        try {
            return await this.model.findOne({
                where: {
                    ride_group_id: groupId,
                    parent_id: {
                        [Op.in]: this.model.sequelize.literal(`(SELECT id FROM parent WHERE account_id = ${accountId})`)
                    }
                },
                include: [{
                    association: 'parent',
                    attributes: []
                }],
                order: [['started_at', 'DESC']],
                limit: 1
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async checkAllParentsPaid(rideGroupId) {
        // must check if the number of parents on the group are the same number of parents with subsccription status paid
        try {
            const totalParentsPaid = await this.model.count({
                where: {
                    ride_group_id: rideGroupId,
                    status: 'paid',
                    valid_until: {
                        [Op.gte]: new Date() // Check if subscription is still valid
                    }
                }
            });

            const totalParents = await this.model.count({
                where: {
                    ride_group_id: rideGroupId
                }
            });

            return totalParents === totalParentsPaid;
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findActiveSubscriptionByAccountId(accountId) {
        try {
            return await this.model.findOne({
                where: {
                    status: 'active',
                    valid_until: {
                        [Op.gte]: new Date() // Check expiration date
                    }
                },
                include: [{
                    association: 'parent',
                    include: [
                        {
                            association: 'account',
                            where: {
                                id: accountId
                            }
                        }
                    ]
                }
                ],
                limit: 1
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new ParentGroupSubscriptionRepository();
