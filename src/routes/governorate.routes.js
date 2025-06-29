const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const validate = require("../middlewares/validation.middleware");
const governoratesController = require("../controllers/governorates.controller");
const router = Router();
const Yup = require("yup");

// Country Validation Schemas
const governorateCreateSchema = Yup.object().shape({
  governorate_name: Yup.string().required().min(2).max(255),
});

router.use('/governorate', authMiddleware, verifiedEmailRequired);
router
  .route("/governorate")
  .get(governoratesController.getAllGovernorates)
  .post(
    // roleCheck(["admin", "manager"], "acc_type"),
    validate(governorateCreateSchema),
    governoratesController.createGovernorate
  );

router
  .route("/governorate/search")
  .get(governoratesController.searchGovernorates);

router
  .route("/governorate/:id")
  .get(governoratesController.getGovernorateById)
  .put(
    validate(governorateCreateSchema),
    governoratesController.updateGovernorate
  )
  .delete(governoratesController.deleteGovernorate);

module.exports = router;
