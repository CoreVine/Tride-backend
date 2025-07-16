const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const { isParent, arePapersVerified, isAdminWithPermissions } = require("../middlewares/isAccount.middleware");
const validate = require("../middlewares/validation.middleware");
const Yup = require("yup");
const RideGroupController = require("../controllers/rideGroup.controller");
const { checkValidSubscription } = require("../middlewares/subscription.middleware");
const { isInsideRideGroup } = require("../middlewares/chatAuthorize.middleware");

const groupRoutes = Router();

const createGroupSchema = Yup.object().shape({
  group_name: Yup.string().min(3).required(),
  school_id: Yup.string().required(),
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

const paramsOrderId = {
  params: Yup.object().shape({
    rideGroupId: Yup.string().required()
  })
};

const addParentToGroupSchema = Yup.object().shape({
  group_id: Yup.string().required(),
  home: Yup.object().shape({
    home_lat: Yup.string().required(),
    home_lng: Yup.string().required(),
  })
});

const addParentToGroupParamsSchema = Yup.object().shape({
  invitation_code: Yup.string().min(8).max(8).required()
});

const addChildToGroupSchema = Yup.object().shape({
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


const subscribeSchema = {
  body: Yup.object().shape({
    plan_type: Yup.string().oneOf(["monthly", "term", "double-terms"]).required()
  }), 
  params: Yup.object().shape({
    rideGroupId: Yup.string().required()
  })
};

const confirmNewSubscriptionSchema = Yup.object().shape({
  order_id: Yup.string().required(),
});

groupRoutes.use('/ride', authMiddleware, verifiedEmailRequired);
groupRoutes.get('/ride/plans', isParent, RideGroupController.getAllPlans);
groupRoutes.get('/ride/group/:rideGroupId', isParent, checkValidSubscription, RideGroupController.getRideGroupById); //send stats
groupRoutes.get('/ride/groups/', isAdminWithPermissions([{type: "group", value: "Payments"}]), RideGroupController.getRideGroups);
groupRoutes.get('/ride/groups/by-parent/:parentId', isParent, arePapersVerified, RideGroupController.getRideGroupsByParentId);
groupRoutes.post('/ride/group/create',
  isParent,
  arePapersVerified,
  validate(createGroupSchema),
  RideGroupController.createRideGroup
);
groupRoutes.post('/ride/group/add-child',
  validate(addChildToGroupSchema),
  isParent,
  RideGroupController.addChildToGroup
);

// TODO: REMOVE GROUP_ID FROM INVITATION CODE
// not working yet!
groupRoutes.post('/ride/group/add-parent/:invitation_code', 
  validate(
    {
      body: addParentToGroupSchema,
      params: addParentToGroupParamsSchema
    }
  ),
  authMiddleware,
  arePapersVerified,
  RideGroupController.addNewParentGroup
);

groupRoutes.get('/ride/group/:rideGroupId/subscription', 
  validate({
    params: Yup.object().shape({
      rideGroupId: Yup.string().required()
    })
  }),
  isParent,
  RideGroupController.getCurrentSubscriptionStatus
);
groupRoutes.put('/ride/group/:rideGroupId/subscription', 
  validate({
    params: Yup.object().shape({
      status: Yup.string().oneOf(['remove',]).required()
    })
  }),
  isParent,
  checkValidSubscription,
  RideGroupController.updateCurrentSubscriptionStatus
);

groupRoutes.post('/ride/group/:rideGroupId/subscribe',
  validate(subscribeSchema),
  isParent,
  RideGroupController.createNewSubscribeRequest
);

// polling
groupRoutes.post('/ride/group/subscribe/confirm',
  validate(confirmNewSubscriptionSchema),
  isParent,
  RideGroupController.confirmNewSubscription
);

groupRoutes.post('/ride/group/:rideGroupId/extend',
  validate(subscribeSchema),
  isParent,
  RideGroupController.extendSubscription
);

groupRoutes.get('/ride/group/:rideGroupId/plans', validate(paramsOrderId), isParent, isInsideRideGroup, RideGroupController.getAvailablePlans);
groupRoutes.put('/ride/group/subscription-status/:subscriptionStatusId', validate({
  params: Yup.object().shape({
    subscriptionStatusId: Yup.string().required()
  }),
  body: Yup.object().shape({
    status: Yup.string().oneOf(['new', 'remove', 'pending', 'paid']).required()
  }),
  isParent
}), RideGroupController.updateSubscriptionStatus);

module.exports = groupRoutes;
