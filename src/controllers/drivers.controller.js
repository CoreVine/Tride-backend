const driverRepository = require("../data-access/driver")
const driverPapersRepository = require("../data-access/driverPapers")

const { NotFoundError } = require("../utils/errors/types/Api.error")
const { createPagination } = require("../utils/responseHandler")

const { Op } = require("sequelize")

const driversController = {
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
  }
}

module.exports = driversController
