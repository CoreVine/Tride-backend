const { verifyPaymentSignature } = require("../../utils/payment/paymob");
const ParentGroupSubscriptionRepository = require("../../data-access/parentGroupSubscription");
const ParentGroupRepository = require("../../data-access/parentGroup");
const RideGroupRepository = require("../../data-access/rideGroup");
const redisService = require("../../services/redis.service");

const paymobController = {
    handlePaymobWebhook: async (req, res) => {
        try {
            // HMAC verification
            const is_valid = verifyPaymentSignature(req.body.obj, req.query.hmac);
            if (!is_valid) {
                throw new Error('Invalid HMAC signature');
            }

            // extract payment details
            const { payment_key_claims: { extra } } = req.body.obj;
    
            if(!extra)
                throw new Error('Missing extra data in payment claims');

            // Check if group is ready to accept a driver
            const parentGroup = await ParentGroupRepository.findById(extra.parent_group_id);

            if (!parentGroup) {
                return res.error('Ride group does not exist', null, 400);
            }

    
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
                    status:              'paid'
                };
    
                // add payment details
                const paymentData = {
                    paymob_receipt_id:   req.body.obj.id,
                    paid_at:             new Date(),
                    amount:              req.body.obj.amount_cents / 100
                };
    
                const payload = {
                    subscription: subscriptionData,
                    payment:      paymentData
                };
    
                await ParentGroupSubscriptionRepository.createNewSubscriptionRecord(payload);

                redisService.set(req.body.obj.order.id, 'true');
            } else if (extra.order_type === 'extension') {
                // add payment details
                const paymentData = {
                    paymob_receipt_id:   req.body.obj.id,
                    paid_at:             new Date(),
                    amount:              req.body.obj.amount_cents / 100
                };
    
                // Extend the subscription
                await ParentGroupSubscriptionRepository.extendSubscription(
                    extra.subscription_id,
                    extra.extension_months,
                    paymentData
                );

                redisService.set(req.body.obj.order.id, 'true');
                console.log('Subscription extended successfully');
            }

            // Get the ride group to check if it's premium or regular
            const rideGroup = await RideGroupRepository.findById(extra.ride_group_id);
            
            if (!rideGroup) {
                throw new Error('Ride group not found');
            }
            
            // Update parent group status based on group type
            if (rideGroup.group_type === 'premium') {
                // Premium groups: update to 'ready' immediately
                await ParentGroupRepository.updateParentGroupStatus(extra.parent_group_id, 'ready');
                console.log(`Premium group: Updated parent group ${extra.parent_group_id} status to 'ready'`);
            } else {
                // Regular groups: update to 'pending' (waiting for all parents to pay)
                await ParentGroupRepository.updateParentGroupStatus(extra.parent_group_id, 'pending');
                console.log(`Regular group: Updated parent group ${extra.parent_group_id} status to 'pending'`);
            }
            
            return res.success('Payment processed successfully');
        } catch (error) {
            console.error('Error processing Paymob webhook:', error);
            return res.error('Failed to process payment', error.message, 500);
        }
    }
}


module.exports = paymobController;
