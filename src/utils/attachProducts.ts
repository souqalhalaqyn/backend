import Product from "../models/Product.js";

export async function attachProducts(containers: any[], limit?: number, isAdminRequest = false) {
  const containerIds = containers.map((c) => c._id);
  const filter: Record<string, unknown> = { container: { $in: containerIds } };
  if (!isAdminRequest) filter.isActive = true;
  const products = await Product.find(filter)
    .sort({ productIndex: 1 })
    .lean();
  const productMap: Record<string, any[]> = {};
  for (const p of products) {
    const cid = p.container.toString();
    if (!productMap[cid]) productMap[cid] = [];
    productMap[cid].push(p);
  }

  return containers.map((c) => ({
    ...c,
    products: (productMap[c._id.toString()] ?? []).slice(0, limit),
  }));
}
