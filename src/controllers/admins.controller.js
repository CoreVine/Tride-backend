const AdminRepository = require("../data-access/admin");

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
    }
}

module.exports = adminController;
