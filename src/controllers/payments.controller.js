const parentGroupSubscriptionRepository = require("../data-access/parentGroupSubscription");

const { createPagination } = require("../utils/responseHandler");
const { exportPaymentsToExcel } = require("../utils/export/exceljs");

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
                return res.notFound("Payment not found");
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
                return res.success("No payments found for the specified range", { payments: [] });
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
    }
};

module.exports = paymentsController;
