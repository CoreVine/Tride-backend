const AccountRepository = require("../data-access/accounts");
const AdminRepository = require("../data-access/admin")
const { BadRequestError } = require("../utils/errors")
const loggingService = require("../services/logging.service")
const { deleteUploadedFile } = require("../config/upload")
const logger = loggingService.getLogger()

const adminController = {
  getAllAdminsExceptMe: async (req, res) => {
    try {
      const admins = await AdminRepository.findAllExceptSelf(req.account.admin.id)

      return res.success("Admins retrieved successfully", { admins })
    } catch (error) {
      console.error("Error retrieving admins:", error)
      res.error("Failed to retrieve admins", 500)
    }
  },

  me: async (req, res, next) => {
    try {
      const admin = await AdminRepository.findByIdIncludeDetails(req.account.admin.id)

      return res.success("Admins retrieved successfully", admin)
    } catch (error) {
      console.error("Error retrieving admins:", error)
      next(error)
    }
  },

  updateMe: async (req, res, next) => {
    try {
      const { first_name, last_name, email, password, new_password, language } = req.body
      const profile_pic = req.file ? req.file.path : null
      const existingAdmin = await AdminRepository.findByIdIncludeAccount(req.account.admin.id)
      const toUpdate = {}

      if (!existingAdmin && req.account.admin.id !== existingAdmin.id) {
        throw new BadRequestError("Admin not found")
      }

      if (first_name) toUpdate.first_name = first_name
      if (last_name) toUpdate.last_name = last_name
      if (email) toUpdate.email = email
      if (language) toUpdate.language = language

      // check if the password matches
      if (new_password) {
        if (!password) {
          throw new BadRequestError("Current password is required to set a new password")
        }
        const isTheSame =  await existingAdmin.account.checkPassword(password)

        console.log(password, existingAdmin.account.password, isTheSame)

        if (!isTheSame) {
          throw new BadRequestError("Current password is incorrect")
        }

        toUpdate.password = new_password
      } else if (password) {
        throw new BadRequestError("New password is required to update the current password")
      }
      
      if (profile_pic) {
        if (existingAdmin.profile_pic)
          await deleteUploadedFile(existingAdmin.profile_pic)

        toUpdate.profile_pic = profile_pic
        logger.info(`FILE UPLOADED: ${profile_pic}`)
        logger.info(`FILE DELETED: ${existingAdmin.profile_pic}`)
      }

      // update the admin
      if (toUpdate.email || toUpdate.password) {
        await AccountRepository.updateAccount(req.account.id, toUpdate)
      }

      if (toUpdate.first_name || toUpdate.last_name || toUpdate.language || toUpdate.profile_pic) {
        await AdminRepository.updateAdmin(req.account.admin.id, toUpdate)
      }

      return res.success("Admin updated successfully");
    } catch (error) {
      console.error("Error updating admin:", error)
      next(error)
    }
  },

  createNewAdmin: async (req, res, next) => {
    try {
      const { first_name, last_name, language } = req.body
      const profile_pic = req.file ? req.file.path : null

      await AdminRepository.createNewAdmin({
        account_id: req.account.id,
        first_name,
        last_name,
        language,
        profile_pic
      })

      logger.info(`FILE UPLOADED: ${profile_pic}`)

      return res.success("Admin created successfully", {
        admin: {
          id: req.account.id,
          first_name,
          last_name,
          language,
          profile_pic
        }
      })
    } catch (error) {
      console.error("Error creating admin:", error)
      next(error)
    }
  },

  updateAdminRole: async (req, res, next) => {
    const { adminId } = req.params
    const { role_id } = req.body

    try {
      if (req.account.admin.id === Number(adminId)) {
        throw new BadRequestError("Cannot update your own rules!")
      }

      await AdminRepository.updateAdminRole(req.account.admin.id, Number(adminId), role_id)

      return res.success("Updated successfully")
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }
}

module.exports = adminController
