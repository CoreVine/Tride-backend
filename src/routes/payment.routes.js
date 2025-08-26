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

const createParentCashPaymentSchema = {
    ride_group_id: Yup.string().required(),
    parent_id: Yup.string().required(),
    plan_id: Yup.string().required(),
    started_at: Yup.date().optional(),
    valid_until: Yup.date().optional(),
    default: Yup.boolean().optional().default(false)
};

paymobPaymentRouter.post('/webhooks/paymob', paymentWebHookController.handlePaymobWebhook);
paymobPaymentRouter.get('/payments', authMiddleware, isAdmin, paymentController.getAllPayments);
paymobPaymentRouter.post('/payments/parents/create-cash', authMiddleware, isAdmin, validate(createParentCashPaymentSchema), paymentController.createParentCashPayment);
paymobPaymentRouter.get('/payments/:id', authMiddleware, isAdmin, paymentController.getPaymentById);

paymobPaymentRouter.get('/payments/export/all',
    validate(paymentSchema),
    authMiddleware,
    isAdmin,
    paymentController.exportAllPayments);

module.exports = paymobPaymentRouter;
