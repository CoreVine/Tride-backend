require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

async function requestPaymentToken(data) {
    try {
        const response = await axios.post(process.env.PAYMOB_INTENION_APU_URI, data, {
            headers: {
                Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            orderId: response.data.intention_order_id,
            clientSecret: response.data.client_secret,
            order: response.data
        };
    } catch (error) {
        console.error('Error requesting payment from Paymob:', error.response ? error.response.data : error.message);
        throw new Error('Failed to request payment from Paymob');
    }
}

function createPaymobOrderObject(userAccount, rideGroup, planDetails, seatsTaken, totalDays, overallPrice, toPayPrice) {
    return {
        // we multiply by 100 because Paymob only takes integer values, and 1000 = 10.00 EGP
        amount: Number(toPayPrice) * 100,
        currency: "EGP",
        payment_methods: [parseInt(process.env.PAYMOB_PAYMENT_METHOD_ID)],
        items: [
            {
            name: `Ride Group Payment for ${rideGroup.group_name}`,
            amount: Number(toPayPrice)  * 100,
            description: `Payment for ride group ${rideGroup.group_name} for ${seatsTaken} seats over ${totalDays} days.`,
            quantity: 1,
            }
        ],
        billing_data: {
            first_name: userAccount.parent.name.split(' ')[0],
            last_name: userAccount.parent.name.split(' ')[1] || '(No last name)',
            email: userAccount.email,
            phone_number: userAccount.parent.phone
        },
        customer: {
            first_name: userAccount.parent.name.split(' ')[0],
            last_name: userAccount.parent.name.split(' ')[1] || '(No last name)',
            email: userAccount.email,
            phone_number: userAccount.parent.phone
        },
        extras: {
            ride_group_id: rideGroup.id,
            parent_id: userAccount.parent.id,
            plan_id: planDetails.id,
            total_price: overallPrice,
            new_subscription: true,
            installment_plan: planDetails.installment_plan,
            seats_taken: seatsTaken,
            total_days: totalDays,
            months_count: planDetails.months_count,
        },
        notification_url: process.env.BACKEND_PAYMOB_WEBHOOK_URL,
    };
}

function verifyPaymentSignature(requestBody, signature) {
    try {
        const obj = requestBody;
        const message =
        obj.amount_cents +
        obj.created_at +
        obj.currency +
        obj.error_occured +
        obj.has_parent_transaction.toString() +
        obj.id +
        obj.integration_id +
        obj.is_3d_secure.toString() +
        obj.is_auth.toString() +
        obj.is_capture.toString() +
        obj.is_refunded.toString() +
        obj.is_standalone_payment.toString() +
        obj.is_voided.toString() +
        obj.order.id +
        obj.owner +
        obj.pending.toString() +
        obj.source_data.pan +
        obj.source_data.sub_type +
        obj.source_data.type +
        obj.success.toString();
    
        const hmac = crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
        .update(message)
        .digest('hex');
        
        return hmac === signature;
    } catch(error) {
        return false;
    }
}

module.exports = {
    createPaymobOrderObject,
    requestPaymentToken,
    verifyPaymentSignature
};