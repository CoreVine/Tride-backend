const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware");
const cityController = require("../controllers/city.controller");
const Yup = require("yup");
const router = Router();
const validate = require("../middlewares/validation.middleware");

// City Validation Schemas
const cityCreateSchema = Yup.object().shape({
  name: Yup.string().required().min(2).max(255),
  governorate_id: Yup.number().required().positive().integer(),
});

const cityUpdateSchema = Yup.object()
  .shape({
    name: Yup.string().min(2).max(255),
    governorate_id: Yup.number().positive().integer(),
  })
  .test(
    "at-least-one-field",
    "At least one field to update is required",
    (value) => value.name || value.country_id
  );

// Apply auth middleware to all routes
router.use(authMiddleware);

// Apply email verification to all routes
router.use(verifiedEmailRequired);

router
  .route("/cities")
  .get(cityController.getAllCities)
  .post(validate(cityCreateSchema), cityController.createCity);

router.route("/cities/search").get(cityController.searchCities);

router
  .route("/cities/:id")
  .get(cityController.getCityById)
  .put(validate(cityUpdateSchema), cityController.updateCity)
  .delete(cityController.deleteCity);

module.exports = router;
