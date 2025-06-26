const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const { isParent } = require("../middlewares/isAccount.middleware");
const validate = require("../middlewares/validation.middleware");
const Yup = require("yup");
const RideGroupController = require("../controllers/rideGroup.controller");

const groupRoutes = Router();

const createGroupSchema = Yup.object().shape({
  group_name: Yup.string().min(3).required(),
  school_id: Yup.string().required(),
  seats: Yup.number().max(5).required(),
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
    )
});


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

groupRoutes.use(authMiddleware, verifiedEmailRequired, isParent);
groupRoutes.get('/ride/group/:rideGroupId', RideGroupController.getRideGroupById);
groupRoutes.post('/ride/group/create',
  validate(createGroupSchema),
  RideGroupController.createRideGroup
);
groupRoutes.post('/ride/group/add-child',
  validate(addChildToGroupSchema),
  RideGroupController.addChildToGroup
);

groupRoutes.post('/ride/group/add-parent/:invitation_code', 
  validate(
    {
      body: addParentToGroupSchema,
      params: addParentToGroupParamsSchema
    }
  ),
  RideGroupController.addNewParentGroup
);

module.exports = groupRoutes;
