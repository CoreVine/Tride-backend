const { Router } = require("express");
const paymentController = require("../controllers/webhooks/paymob.controller");

const paymobPaymentRouter = Router();

paymobPaymentRouter.post('/webhooks/paymob', paymentController.handlePaymobWebhook);

module.exports = paymobPaymentRouter;
