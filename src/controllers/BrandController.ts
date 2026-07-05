import { createCrudController } from "../utils/CrudFactory.js";
import Brand from "../models/Brand.js";

export const brandController = createCrudController({
  model: Brand,
  resourceName: "brand",
  localize: true,
  pagination: { maxLimit: 10000 },
});
