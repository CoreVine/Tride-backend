const { Router } = require("express");
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validation.middleware");
const Yup = require("yup");
const { isAdminWithRole } = require("../../middlewares/isAccount.middleware");
const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles");
const rideGroupController = require("../../controllers/admins/rideGroup.controller");

const groupRouter = Router();


groupRouter.put("/manage/ride/group/merge", 
  authMiddleware,
  isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN),
  validate(Yup.object().shape({
    group_src: Yup.string().required(),
    group_dest: Yup.string().required()
  })),
  rideGroupController.mergeRideGroups
);

module.exports = groupRouter;
