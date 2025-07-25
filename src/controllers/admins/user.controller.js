const { BadRequestError, NotFoundError } = require("../../utils/errors");
const DriverRepository = require("../../data-access/driver");
const ParentRepository = require("../../data-access/parent");
const AdminRepository = require("../../data-access/admin");

const userController = {
  getUserDetailsById: async (req, res, next) => {
    try {
      const { userId, type } = req.params;
      if (!userId) throw new BadRequestError("User ID is required");

      switch (type) {
        case "driver":
          const driver = await DriverRepository.findById(userId, { include: { association: 'account', attributes: { exclude: ['password'] } } });
          if (!driver) throw new NotFoundError("Driver not found");

          return res.success("Driver details fetched successfully", driver);

        case "parent":
          const parent = await ParentRepository.findById(userId, { include: { association: 'account', attributes: { exclude: ['password'] } } });
          if (!parent) throw new NotFoundError("Parent not found");

          return res.success("Parent details fetched successfully", parent);

        case "admin":
          const admin = await AdminRepository.findById(userId, { include: { association: 'account', attributes: { exclude: ['password'] } } });
          if (!admin) throw new NotFoundError("Admin not found");
          return res.success("Admin details fetched successfully", admin);
          
        default:
          throw new BadRequestError("Invalid user type");
      }

    } catch (error) {
      console.error("Get user details error");
      next(error);
    }
  }
};

module.exports = userController;
