import { createProperty } from "@/controllers/property/create-property-controller";
import { getAllPropertiesPagination, getSearchedPropertiesPagination } from "@/controllers/property/get-all-property";
import { editProperty } from "@/controllers/property/edit-property";
import { uploader } from "@/middlewares/uplouder-middleware";
import { Router } from "express";
import { deleteProperty } from "@/controllers/property/delete-property";
import { getSingleProperty } from "@/controllers/property/get-single-property";

const router = Router();
const upload = uploader();

router.route("/").get(getAllPropertiesPagination).post(upload.array("propertyPictures", 5), createProperty);

router.route("/search").get(getSearchedPropertiesPagination);

router
   .route("/:propertyId")
   .get(getSingleProperty)
   .delete(deleteProperty)
   .put(upload.array("propertyPictures", 5), editProperty);

export default router;
