const driverRepository = require("../data-access/driver")
const driverPapersRepository = require("../data-access/driverPapers")
const driverPaymentsRepository = require("../data-access/driverPayment")

const { NotFoundError, BadRequestError } = require("../utils/errors/types/Api.error")
const { createPagination } = require("../utils/responseHandler")

const { Op } = require("sequelize")

const RideGroupRepository = require("../data-access/rideGroup");

const driversController = {
  // Get ride groups assigned to the authenticated driver
  getMyRideGroups: async (req, res, next) => {
    try {
      const driverId = req.account.driver.id;

      const rideGroups = await RideGroupRepository.findAll({
        where: { driver_id: driverId },
        include: [
          {
            association: "school",
            attributes: ["id", "school_name", "lat", "lng"]
          },
          {
            association: "parentGroups",
            attributes: ["id", "parent_id", "current_seats_taken", "status"],
            include: [
              {
                association: "parent",
                attributes: ["id", "name", "phone"]
              }
            ]
          }
        ]
      });

      return res.success("Ride groups retrieved successfully", {
        rideGroups,
        total: rideGroups.length
      });
    } catch (error) {
      return next(error);
    }
  },

  getAllDrivers: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, search, approved = null } = req.query

      let where = {}

      if (approved !== null) {
        if (approved === 'true') {
          where['$papers.approved$'] = true
        }
        else if (approved === 'false') {
          where['$papers.approved$'] = false
        }
        else {
          throw new BadRequestError("Invalid value for approved. Must be 'true' or 'false'.")
        }
      }

      if (search) {
        where['name'] = { [Op.like]: `%${search}%` }
      }

      const { count, rows: drivers } = await driverRepository.findAllPaginated(page, limit, {
        include: [
          {
            association: "account",
            attributes: ["id", "email", "account_type", "is_verified", "auth_method"]
          },
          {
            association: "papers",
            attributes: ["id", "approved", "approval_date"]
          }
        ],
        where: where
      })
      
      const pagination = createPagination(page, limit, count)

      res.success("Drivers retrieved successfully", {
        pagination,
        drivers
      })
    } catch (error) {
      return next(error)
    }
  },

  getDriver: async (req, res, next) => {
    try {
      const { driverId } = req.params

      const driver = await driverRepository.findByIdWithPapers(driverId)
      if (!driver) {
        return res.notFound("Driver not found")
      }

      res.success("Driver retrieved successfully", { driver })
    } catch (error) {
      return next(error)
    }
  },

  getAllPaymentsForDriver: async (req, res, next) => {
    try {
      const { driverId } = req.params
      const { page = 1, limit = 10 } = req.query

      const driver = await driverRepository.findById(driverId)
      if (!driver) throw new NotFoundError("Driver not found")

      const data = await driverPaymentsRepository.findAllPaginated(page, limit, {
        where: { driver_id: driverId },
        include: [
          { association: "driver"}
        ]
      })

      return res.success("Payments retrieved successfully", data)
    } catch (error) {
      return next(error)
    }
  },

  createPaymentForDriver: async (req, res, next) => {
    try {
      const { salary, status, issued_for } = req.body
      const { driverId } = req.params
      const driver = await driverRepository.findById(driverId)
      if (!driver) throw new NotFoundError("Driver not found")

      const payment = await driverPaymentsRepository.create({
        driver_id: driverId,
        salary: salary,
        status: status,
        issued_for: new Date(issued_for)
      })

      return res.success("Payment created successfully", { payment })
    } catch (error) {
      return next(error)
    }
  },

  updatePaymentForDriver: async (req, res, next) => {
    try {
      const { driverId, paymentId } = req.params
      const { salary, status, issued_for } = req.body

      const driver = await driverRepository.findById(driverId)
      if (!driver) throw new NotFoundError("Driver not found")

      const payment = await driverPaymentsRepository.findById(paymentId)
      if (!payment || payment.driver_id !== driver.id) {
        throw new NotFoundError("Payment not found for this driver")
      }

      const updatedPayment = await driverPaymentsRepository.update(paymentId, { salary, status, issued_for })

      return res.success("Payment updated successfully")
    } catch (error) {
      return next(error)
    }
  },

  updateDriverPapersStatus: async (req, res, next) => {
    try {
      const { driverId } = req.params
      const { approved } = req.body

      const paper = await driverPapersRepository.findByDriverId(driverId)
      if (!paper) throw new NotFoundError("Driver papers not found")

      const updatedPapers = await driverPapersRepository.updateApprovalStatus(paper.id, approved, approved ? new Date() : null)

      return res.success("Driver papers status updated successfully", { papers: paper })
    } catch (error) {
      return next(error)
    }
  },

  getDriverPayments: async (req, res, next) => {
    try {
      const driverId = req.account.driver.id
      const driver = await driverRepository.findById(driverId)

      if (!driver) throw new NotFoundError("Driver not found")

      const payments = await driverPaymentsRepository.findAllByDriverId(driverId)

      return res.success("Driver payments retrieved successfully", payments)
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = driversController
