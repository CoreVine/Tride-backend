const { Router } = require("express");
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validation.middleware");
const Yup = require("yup");
const { isAdminWithRole, isAdmin, isAdminWithPermissions } = require("../../middlewares/isAccount.middleware");
const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles");
const rideGroupController = require("../../controllers/admins/rideGroup.controller");

const getRideGroupsSchema = Yup.object().shape({
  page: Yup.number().integer().min(1).default(1),
  limit: Yup.number().integer().min(1).max(100).default(10),
  name: Yup.string().optional(),
  seats: Yup.number().integer().optional()
});

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

groupRouter.get('/manage/ride/groups/',
  authMiddleware,
  validate(getRideGroupsSchema),
  isAdminWithPermissions([{type: "group", value: "Payments"}]), 
  rideGroupController.getRideGroups);

groupRouter.get('/manage/ride/groups/:rideGroupId',
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  isAdminWithPermissions([{type: "group", value: "Payments"}]), 
  rideGroupController.getRideGroupDetails);
  
groupRouter.patch('/manage/ride/groups/:rideGroupId/assign-driver',
authMiddleware,
validate({
  params: Yup.object().shape({
    rideGroupId: Yup.string().required()
  }),
  body: Yup.object().shape({
    driverId: Yup.number().required()
  }) 
}),
isAdmin, 
rideGroupController.assignDriverToRideGroup);

module.exports = groupRouter;
