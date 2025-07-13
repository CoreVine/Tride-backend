const { Router } = require("express");
const paymentWebHookController = require("../controllers/webhooks/paymob.controller");
const paymentController = require("../controllers/payments.controller");
const { isAdmin } = require("../middlewares/isAccount.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const paymobPaymentRouter = Router();

paymobPaymentRouter.post('/webhooks/paymob', paymentWebHookController.handlePaymobWebhook);

paymobPaymentRouter.get('/payments', authMiddleware, isAdmin, paymentController.getAllPayments);
paymobPaymentRouter.get('/payments/:id', authMiddleware, isAdmin, paymentController.getPaymentById);

module.exports = paymobPaymentRouter;
