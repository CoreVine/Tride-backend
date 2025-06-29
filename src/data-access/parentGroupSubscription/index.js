const ParentGroupSubscriptionModel = require('../../models/ParentGroupSubscription');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");
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

    async findActiveSubscriptionByParentAndGroup(parentId, groupId) {
        try {
            return await this.model.findOne({
                where: {
                    parent_id: parentId,
                    ride_group_id: groupId,
                    status: 'active'
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
}

module.exports = new ParentGroupSubscriptionRepository();
