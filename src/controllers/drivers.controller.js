const driverRepository = require("../data-access/driver")
const driverPapersRepository = require("../data-access/driverPapers")

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
      const { page = 1, limit = 10, search } = req.query

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
        where: search ? { name: { [Op.like]: `%${search}%` } } : {}
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
      const { driverId, page = 1 } = req.params
      if (isNaN(+page)) throw new BadRequestError("Page must be a number")

      const payments = await driverRepository.getDriverPayments(driverId, Number(page))

      return res.success("Driver payments retrieved successfully", { payments })
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = driversController
