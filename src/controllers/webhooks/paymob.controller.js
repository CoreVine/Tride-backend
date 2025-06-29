const { verifyPaymentSignature } = require("../../utils/payment/paymob");
const ParentGroupSubscriptionRepository = require("../../data-access/parentGroupSubscription");
const redisService = require("../../services/redis.service");

const paymobController = {
    handlePaymobWebhook: async (req, res) => {
        try {
            // Log the entire request body with better formatting
            console.log('Full webhook payload:', JSON.stringify(req.body, null, 2));

            // HMAC verification
            const is_valid = verifyPaymentSignature(req.body.obj, req.query.hmac);
            if (!is_valid) {
                throw new Error('Invalid HMAC signature');
            }

            // extract payment details
            const { payment_key_claims: { extra } } = req.body.obj;
    
            if(!extra)
                throw new Error('Missing extra data in payment claims');
    
            if(extra.order_type === 'new') {
                // create a new subscription for the parent in this ride group
                const subscriptionData = {
                    ride_group_id:       extra.ride_group_id,
                    parent_id:           extra.parent_id,
                    current_seats_taken: extra.seats_taken,
                    pickup_days_count:   extra.total_days,
                    started_at:          new Date(),
                    valid_until:         new Date().setMonth(new Date().getMonth() + extra.months_count),
                    plan_id:             extra.plan_id,
                    total_amount:        extra.total_price,
                    status:              'active'
                };
    
                const next_payment_due = extra.installment_plan ? new Date().setMonth(new Date().getMonth() + 1) : null;
                const next_payment_amount = extra.installment_plan ? extra.total_price / extra.months_count : null;
                // add payment details
                const paymentData = {
                    paymob_receipt_id:   req.body.obj.id,
                    paid_at:             new Date(),
                    amount:              req.body.obj.amount_cents / 100,
                    next_payment_due:    next_payment_due,
                    next_payment_amount: next_payment_amount
                };
    
                const payload = {
                    subscription: subscriptionData,
                    payment:      paymentData
                };
    
                await ParentGroupSubscriptionRepository.createNewSubscriptionRecord(payload);

                redisService.set(req.body.obj.order.id, 'true');
                console.log('New subscription is created');

                return res.success('Payment processed successfully');
            } else if (extra.order_type === 'existing/installment') {
                const next_payment_due = extra.remaining_months ? new Date().setMonth(new Date().getMonth() + 1) : null;
                const next_payment_amount = extra.remaining_months ? extra.total_price / extra.months_count : null;
                // add payment details
                const paymentData = {
                    paymob_receipt_id:   req.body.obj.id,
                    paid_at:             new Date(),
                    amount:              req.body.obj.amount_cents / 100,
                    next_payment_due:    next_payment_due,
                    next_payment_amount: next_payment_amount
                };
    
                const payload = {
                    subscription_id: extra.subscription_id,
                    payment:         paymentData
                };
    
                await ParentGroupSubscriptionRepository.addNewPaymentHistory(payload);

                redisService.set(req.body.obj.order.id, 'true');
                console.log('Subscription is updated');

                return res.success('Payment processed successfully');

            }
        } catch (error) {
            await t.rollback();
            console.error('Error processing Paymob webhook:', error);
            return res.error('Failed to process payment', error.message, 500);
        }
    }
}


module.exports = paymobController;
