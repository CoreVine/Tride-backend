const Yup = require("yup");

const rideGroupController = require("../../controllers/admins/rideGroup.controller");

const validate = require("../../middlewares/validation.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");

const { Router } = require("express");

const { isAdminWithRole, isAdmin, isAdminWithPermissions } = require("../../middlewares/isAccount.middleware");
const { ADMIN_ROLE_SUPER_ADMIN } = require("../../utils/constants/admin-roles");


const getRideGroupsSchema = Yup.object().shape({
  page: Yup.number().integer().min(1).default(1),
  limit: Yup.number().integer().min(1).max(100).default(10),
  name: Yup.string().optional(),
  seats: Yup.number().integer().optional()
});

const createGroupSchema = Yup.object().shape({
  school_id: Yup.string().required(),
  parent_id: Yup.string().required(),
  home: Yup.object().shape({
    home_lat: Yup.string().required(),
    home_lng: Yup.string().required(),
  }),
  children: Yup.array().of(Yup.object().shape({
    child_id: Yup.string().required(),
    timing_from: Yup.string().required(),
    timing_to: Yup.string().required()
  }))
  .test(
    'unique-children',
    'Duplicate children are not allowed',
    (children) => {
      if (!children) return true;
      const childIds = children.map(c => c.child_id);
      return childIds.length === new Set(childIds).size;
    }
  ),
  days: Yup.array().of(Yup.string().required())
    .min(1).max(6).required()
    .test(
      'unique-days',
      'Duplicate days are not allowed',
      (days) => {
        if (!days) return true;
        return days.length === new Set(days).size;
      }
    ),
  group_type: Yup.string().oneOf(['regular', 'premium']).default('regular')
    .required()
});

const addChildToGroupSchema = Yup.object().shape({
  parent_id: Yup.string().required(),
  group_id: Yup.string().required(),
  children: Yup.array().of(Yup.object().shape({
    child_id: Yup.string().required(),
    timing_from: Yup.string().required(),
    timing_to: Yup.string().required()
  }))
  .test(
    'unique-children',
    'Duplicate children are not allowed',
    (children) => {
      if (!children) return true;
      const childIds = children.map(c => c.child_id);
      return childIds.length === new Set(childIds).size;
    }
  )
  .required()
});

const deleteChildrenFromGroup = Yup.object().shape({
  id: Yup.string().required(),
  parent_group_id: Yup.string().required(),
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

groupRouter.put("/manage/ride/group/merge/many", 
  authMiddleware,
  isAdminWithRole(ADMIN_ROLE_SUPER_ADMIN),
  validate(Yup.object().shape({
    group_src_list: Yup.array().of(Yup.string().required()).required(),
    group_dest: Yup.string().required()
  })),
  rideGroupController.mergeManyRideGroups
);

groupRouter.get('/manage/ride/groups/',
  authMiddleware,
  validate(getRideGroupsSchema),
  isAdminWithPermissions([{type: "group", value: "Payments"}]), 
  rideGroupController.getRideGroups);

groupRouter.post('/manage/ride/groups/',
  authMiddleware,
  isAdmin,

  validate(createGroupSchema),
  rideGroupController.createRideGroup
);


groupRouter.get('/manage/ride/groups/:rideGroupId',
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  rideGroupController.getRideGroupDetails);

groupRouter.get('/manage/ride/groups/:rideGroupId/instances',
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  rideGroupController.getRideGroupInstances);

groupRouter.get('/manage/ride/groups/:rideGroupId/instances/:instanceId',
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  rideGroupController.getRideGroupInstanceDetails);

groupRouter.get('/manage/ride/groups/:rideGroupId/chat',
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  rideGroupController.getRideGroupChat);

groupRouter.post('/manage/ride/groups/:rideGroupId/chat',
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  rideGroupController.createRideGroupChat);
  
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

groupRouter.post('/manage/ride/parent-groups/manage-children',
  validate(addChildToGroupSchema),
  authMiddleware,
  isAdmin,
  rideGroupController.manageChildrenOffGroup
);

groupRouter.patch('/manage/ride/parent-groups/manage-children',
  validate(deleteChildrenFromGroup),
  authMiddleware,
  isAdmin,
  rideGroupController.deleteChildrenFromGroup
);

groupRouter.get("/manage/ride/groups/:rideGroupId/locations",
  authMiddleware,
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    }),
  }),
  isAdmin,
  rideGroupController.getAllParentsLocations
)

module.exports = groupRouter;
