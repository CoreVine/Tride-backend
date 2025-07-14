const { Router } = require("express");
const { isAdmin } = require("../middlewares/isAccount.middleware");
const paymentWebHookController = require("../controllers/webhooks/paymob.controller");
const paymentController = require("../controllers/payments.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validation.middleware");
const Yup = require("yup");

const paymobPaymentRouter = Router();

const paymentSchema = {
    query: Yup.object().shape({
        from: Yup.date().required(),
        to: Yup.date().required()
    })
};

paymobPaymentRouter.post('/webhooks/paymob', paymentWebHookController.handlePaymobWebhook);
paymobPaymentRouter.get('/payments', authMiddleware, isAdmin, paymentController.getAllPayments);
paymobPaymentRouter.get('/payments/:id', authMiddleware, isAdmin, paymentController.getPaymentById);

paymobPaymentRouter.get('/payments/export/all',
    validate(paymentSchema),
    authMiddleware,
    isAdmin,
    paymentController.exportAllPayments);

module.exports = paymobPaymentRouter;
