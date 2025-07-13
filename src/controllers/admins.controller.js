const AdminRepository = require("../data-access/admin");
const { BadRequestError } = require("../utils/errors");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger(); 

const adminController = {
    getAllAdminsExceptMe: async (req, res) => {
        try {
            const admins = await AdminRepository.findAllExceptSelf(req.account.admin.id);
            
            return res.success("Admins retrieved successfully", { admins });
        } catch (error) {
            console.error("Error retrieving admins:", error);
            res.error("Failed to retrieve admins", 500);
        }
    },

    me: async (req, res) => {
        try {
            const admins = await AdminRepository.findByIdIncludeDetails(req.account.admin.id);
            
            return res.success("Admins retrieved successfully", { admins });
        } catch (error) {
            console.error("Error retrieving admins:", error);
            res.error("Failed to retrieve admins", 500);
        }
    },

    createNewAdmin: async (req, res) => {
        try {
            const { first_name, last_name, language } = req.body;
            const profile_pic = req.file ? req.file.path : null;
    
            await AdminRepository.createNewAdmin({
                account_id: req.account.id,
                first_name,
                last_name,
                language,
                profile_pic
            });
    
            return res.success("Admin created successfully", {
                admin: {
                    id: req.account.id,
                    first_name,
                    last_name,
                    language,
                    profile_pic
                }
            });
        } catch (error) {
            console.error("Error creating admin:", error);
            res.error("Failed to create admin", 500);
        }
    },

    updateAdminRole: async (req, res, next) => {
        const { adminId } = req.params;
        const { role_id } = req.body;

        try {
            if (req.account.admin.id === Number(adminId)){
                throw new BadRequestError("Cannot update your own rules!");
            }
    
            await AdminRepository.updateAdminRole(req.account.admin.id, Number(adminId), role_id);

            return res.success("Updated successfully");
        } catch (error) {
            logger.error(error);
            next(error);
        }

    }
}

module.exports = adminController;
