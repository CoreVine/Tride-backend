const { Router } = require("express")
const schoolController = require("../controllers/school.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const verifiedEmailRequired = require("../middlewares/verifiedEmailRequired.middleware")
const { isParent } = require("../middlewares/isAccount.middleware")
const validate = require("../middlewares/validation.middleware")

const Yup = require("yup")

// Validation schemas
const schoolSchema = Yup.object().shape({
  school_name: Yup.string().required("School name is required"),
  city_id: Yup.number().integer("City ID must be an integer").positive("City ID must be positive").required("City ID is required"),
  lat: Yup.number()
    .required("Latitude is required")
    .test("is-decimal", "Latitude must be a decimal number with up to 6 decimal places", (value) => {
      if (value === undefined || value === null) return false
      const decimalRegex = /^-?\d+(\.\d{1,6})?$/
      return decimalRegex.test(value.toString())
    }),
  lng: Yup.number()
    .required("Longitude is required")
    .test("is-decimal", "Longitude must be a decimal number with up to 6 decimal places", (value) => {
      if (value === undefined || value === null) return false
      const decimalRegex = /^-?\d+(\.\d{1,6})?$/
      return decimalRegex.test(value.toString())
    })
})

const schoolUpdateSchema = Yup.object().shape({
  school_name: Yup.string(),
  city_id: Yup.number().integer("City ID must be an integer").positive("City ID must be positive"),
  lat: Yup.number().test("is-decimal", "Latitude must be a decimal number with up to 6 decimal places", (value) => {
    if (value === undefined || value === null) return true // Optional in update
    const decimalRegex = /^-?\d+(\.\d{1,6})?$/
    return decimalRegex.test(value.toString())
  }),
  lng: Yup.number().test("is-decimal", "Longitude must be a decimal number with up to 6 decimal places", (value) => {
    if (value === undefined || value === null) return true // Optional in update
    const decimalRegex = /^-?\d+(\.\d{1,6})?$/
    return decimalRegex.test(value.toString())
  })
})
const schoolRoutes = Router()

schoolRoutes.use("/school", authMiddleware, verifiedEmailRequired)
schoolRoutes.route("/school").get(schoolController.getschoolForCity).post(validate(schoolSchema), schoolController.createschool)
schoolRoutes.get("/school/paginated", authMiddleware, schoolController.getSchools)
schoolRoutes.route("/school/:id").get(schoolController.getschoolByID).put(validate(schoolUpdateSchema), schoolController.updateschool).delete(schoolController.deleteSchollByID)

module.exports = schoolRoutes
