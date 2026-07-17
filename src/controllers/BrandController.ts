import { createCrudController } from "../utils/CrudFactory.js";
import Brand from "../models/Brand.js";

export const brandController = createCrudController({
  model: Brand,
  resourceName: "brand",
  localize: true,
  pagination: { maxLimit: 10000 },
  listFilter: (req) => {
    const filter: Record<string, unknown> = {};
    const q = (req.query.q as string)?.trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { nameEn: { $regex: escaped, $options: "i" } },
        { nameAr: { $regex: escaped, $options: "i" } },
      ];
    }
    return filter;
  },
});
