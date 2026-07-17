import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import ArchivedContainer from "../models/ArchivedContainer.js";
import ArchivedProduct from "../models/ArchivedProduct.js";
import Container from "../models/Container.js";
import Offer from "../models/Offer.js";
import OfferPurchase from "../models/OfferPurchase.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";
import { sendPushNotification, notifyAdmins, translateStatus } from "../services/notification.js";

export const placeOrder = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { items, location, state, way, branch, locationType, phone, name } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("Cart must contain at least one item", 400);
  }

  const containerIds: string[] = items.map(
    (i: { containerId: string }) => i.containerId,
  );
  const containers = await Container.find({
    _id: { $in: containerIds },
    isActive: true,
  });

  const containerMap = new Map(
    containers.map((c) => [c._id.toString(), c]),
  );

  const allContainerProducts = await Product.find({
    container: { $in: containerIds },
    isActive: true,
  })
    .sort({ productIndex: 1 })
    .lean();

  const productsByContainer: Record<string, any[]> = {};
  for (const p of allContainerProducts) {
    const cid = p.container.toString();
    if (!productsByContainer[cid]) productsByContainer[cid] = [];
    productsByContainer[cid].push(p);
  }

  interface OrderItemInput {
    container: string;
    product: string;
    productIndex: number;
    nameEn: string;
    nameAr: string;
    price: number;
    currency: string;
    quantity: number;
    image: string;
    color: string;
  }

  const settings = await Settings.findOne().lean();
  const exchangeRate = settings?.sypExchangeRate ?? 15000;

  const orderItems: OrderItemInput[] = [];
  let totalInSYP = 0;

  for (const item of items) {
    const containerId: string = item.containerId;
    const productIndex: number = item.productIndex;
    const quantity: number = item.quantity;

    if (quantity < 1) throw new AppError("Invalid quantity", 400);

    const container = containerMap.get(containerId);
    if (!container) throw new AppError(`Container not found: ${containerId}`, 400);

    const containerProducts = productsByContainer[containerId] ?? [];
    const product = containerProducts.find((p) => p.productIndex === productIndex) as any;
    if (!product) throw new AppError(`Product at index ${productIndex} not found`, 400);

    const lineTotal = product.price * quantity;
    totalInSYP += product.currency === "syp" ? lineTotal : Math.ceil(lineTotal * exchangeRate);
  }

  for (const item of items) {
    const containerId: string = item.containerId;
    const productIndex: number = item.productIndex;
    const quantity: number = item.quantity;

    if (quantity < 1) throw new AppError("Invalid quantity", 400);

    const container = containerMap.get(containerId);
    if (!container) throw new AppError(`Container not found: ${containerId}`, 400);

    const containerProducts = productsByContainer[containerId] ?? [];
    const product = containerProducts.find((p) => p.productIndex === productIndex) as any;
    if (!product) throw new AppError(`Product at index ${productIndex} not found`, 400);

    // Check offer stock (only for SYP/offer products)
    if (product.currency !== "usd") {
      const offers = await Offer.find({ product: product._id, status: "sold" }).sort({ createdAt: 1 });
      const totalAvailable = offers.reduce((sum, o) => sum + (o.totalQuantity - o.soldQuantity), 0);
      if (totalAvailable < quantity) {
        throw new AppError(`Insufficient offer stock for product: only ${totalAvailable} available`, 400);
      }
    }

    orderItems.push({
      container: container._id.toString(),
      product: product._id.toString(),
      productIndex,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      price: product.price,
      currency: product.currency ?? "usd",
      quantity,
      image: product.images?.[0] ?? "",
      color: item.color ?? "",
    });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user.userId, balance: { $gte: totalInSYP } },
    { $inc: { balance: -totalInSYP } },
    { returnDocument: "after" },
  );
  if (!user) {
    throw new AppError("Insufficient balance", 400);
  }

  let order;
  try {
    order = await Order.create({
      user: req.user.userId,
      items: orderItems,
      total: totalInSYP,
      status: "pending",
      locationType: locationType || "direct",
      state: state || undefined,
      way: way || undefined,
      branch: branch || undefined,
      address: location || "",
      phone: phone || "",
      name: name || "",
      statusHistory: [
        { status: "pending", changedBy: req.user.userId, changedAt: new Date() },
      ],
    });

    await distributeOfferProfits(order, req.user.userId);
  } catch (err) {
    await User.updateOne({ _id: req.user.userId }, { $inc: { balance: totalInSYP } }).catch(() => {});
    if (order?._id) await Order.findByIdAndDelete(order._id).catch(() => {});
    throw err;
  }

  notifyAdmins(
    "طلب جديد", "New Order",
    `${req.user?.name ?? req.user?.phone ?? "مستخدم"} قام بتقديم طلب`,
    `${req.user?.name ?? req.user?.phone ?? "User"} placed an order`,
    { screen: "orders", orderId: order._id.toString() },
  );

  return responder().code(201).message("Order placed").payload(order).send(res);
};

async function distributeOfferProfits(order: any, retailBuyerId: string) {
  for (const item of order.items) {
    const productId = item.product;
    const quantity = item.quantity;

    const offers = await Offer.find({
      product: productId,
      status: "sold",
    }).sort({ createdAt: 1 });

    if (offers.length === 0) continue;

    const totalAvailable = offers.reduce((sum, o) => sum + (o.totalQuantity - o.soldQuantity), 0);
    if (totalAvailable < quantity) {
      throw new AppError(`Insufficient offer stock for product: only ${totalAvailable} available`, 400);
    }

    let remainingQty = quantity;
    for (const offer of offers) {
      if (remainingQty <= 0) break;
      const unsold = offer.totalQuantity - offer.soldQuantity;
      if (unsold <= 0) continue;

      const distributeQty = Math.min(remainingQty, unsold);
      remainingQty -= distributeQty;

      const commissionPerUnit = offer.unitSellPrice * (offer.commissionPercent / 100);
      const buyerProfitPerUnit = offer.unitSellPrice - commissionPerUnit;
      const totalBuyerProfit = buyerProfitPerUnit * distributeQty;
      const totalCommission = commissionPerUnit * distributeQty;

      const result = await Offer.updateOne(
        { _id: offer._id, soldQuantity: { $lte: offer.totalQuantity - distributeQty } },
        {
          $inc: { soldQuantity: distributeQty, totalProfitDistributed: totalBuyerProfit },
        },
      );
      if (result.modifiedCount !== 1) continue;

      const updatedOffer = await Offer.findById(offer._id);
      if (updatedOffer && updatedOffer.soldQuantity >= updatedOffer.totalQuantity) {
        await OfferPurchase.deleteMany({ offer: offer._id });
        await Offer.findByIdAndDelete(offer._id);

        // Archive container + products when last offer for this product is consumed
        const remainingOffers = await Offer.countDocuments({ product: productId, status: "sold" });
        if (remainingOffers === 0) {
          const containerDoc = await Container.findById(offer.container);
          if (containerDoc) {
            await ArchivedContainer.create({
              originalId: containerDoc._id,
              nameEn: containerDoc.nameEn,
              nameAr: containerDoc.nameAr,
              descriptionEn: containerDoc.descriptionEn,
              descriptionAr: containerDoc.descriptionAr,
              brand: containerDoc.brand,
              categories: containerDoc.categories,
            });

            const containerProducts = await Product.find({ container: containerDoc._id });
            for (const p of containerProducts) {
              await ArchivedProduct.create({
                originalId: p._id,
                nameEn: p.nameEn,
                nameAr: p.nameAr,
                descriptionEn: p.descriptionEn,
                descriptionAr: p.descriptionAr,
                price: p.price,
                currency: p.currency,
                container: p.container,
                productIndex: p.productIndex,
                images: p.images,
                tagsEn: p.tagsEn,
                tagsAr: p.tagsAr,
                aliasesEn: p.aliasesEn,
                aliasesAr: p.aliasesAr,
                notesEn: p.notesEn,
                notesAr: p.notesAr,
                stock: p.stock,
              });
              await Product.findByIdAndDelete(p._id);
            }

            await Container.findByIdAndDelete(containerDoc._id);
          }
        }
      }

      await User.findByIdAndUpdate(offer.buyer, { $inc: { balance: totalBuyerProfit } });

      await OfferPurchase.create({
        offer: offer._id,
        order: order._id,
        retailBuyer: retailBuyerId,
        quantity: distributeQty,
        unitSellPrice: offer.unitSellPrice,
        commissionPercent: offer.commissionPercent,
        commissionAmount: totalCommission,
        buyerProfit: buyerProfitPerUnit,
        totalProfitAmount: totalBuyerProfit,
      });
    }
  }
}

export const getMyOrders = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const orders = await Order.find({ user: req.user.userId })
    .populate("items.product", "nameEn nameAr images price")
    .sort({ createdAt: -1 });

  return responder()
    .code(200)
    .message("Orders fetched")
    .payload(localize(orders.map((o) => o.toJSON()), req.lang, req))
    .send(res);
};

export const getOrderById = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const order = await Order.findById(req.params.id)
    .populate("items.product", "nameEn nameAr images price");
  if (!order) throw new AppError("Order not found", 404);

  if (order.user.toString() !== req.user.userId && req.user.role !== "admin" && req.user.role !== "super_admin") {
    throw new AppError("Access denied", 403);
  }

  return responder()
    .code(200)
    .message("Order fetched")
    .payload(localize(order.toJSON(), req.lang, req))
    .send(res);
};

export const cancelOrder = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);
  if (order.user.toString() !== req.user.userId) {
    throw new AppError("Access denied", 403);
  }
  if (order.status !== "pending") {
    throw new AppError("Only pending orders can be cancelled", 400);
  }

  await User.updateOne(
    { _id: req.user.userId },
    { $inc: { balance: order.total } },
  );

  order.status = "cancelled";
  order.statusHistory.push({
    status: "cancelled",
    changedBy: user._id,
    changedAt: new Date(),
  });
  await order.save();

  User.findById(order.user).then((user) => {
    notifyAdmins(
      "إلغاء طلب", "Order Cancelled",
      `${user?.name ?? user?.phone ?? "مستخدم"} قام بإلغاء الطلب`,
      `${user?.name ?? user?.phone ?? "User"} cancelled an order`,
      { screen: "orders", orderId: order._id.toString() },
    );
  }).catch(() => {});

  return responder()
    .code(200)
    .message("Order cancelled")
    .payload(localize(order.toJSON(), req.lang, req))
    .send(res);
};

export const getAllOrders = async (req: Request, res: Response) => {
  const filter: Record<string, any> = {};
  if (req.query.status) filter.status = req.query.status;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(10000, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "phone name")
      .populate("items.product", "nameEn nameAr images price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return responder()
    .code(200)
    .message("Orders fetched")
    .payload(localize(orders, req.lang, req))
    .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
    .send(res);
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { status } = req.body;
  const validStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
  if (!status || !validStatuses.includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const transitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  const allowed = transitions[order.status];
  if (!allowed || !allowed.includes(status)) {
    throw new AppError(
      `Cannot transition from ${order.status} to ${status}`,
      400,
    );
  }

  const wasConfirmed = order.status !== "pending" && order.status !== "cancelled";

  if (status === "confirmed") {
    for (const item of order.items) {
      if (item.currency === "syp") continue;

      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { returnDocument: "after" },
      );
      if (!product) {
        throw new AppError(`Insufficient stock for product "${item.nameEn || item.nameAr}"`, 400);
      }
      if (product.stock <= 0) {
        await ArchivedProduct.create({
          originalId: product._id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          descriptionEn: product.descriptionEn,
          descriptionAr: product.descriptionAr,
          price: product.price,
          currency: product.currency,
          container: product.container,
          productIndex: product.productIndex,
          images: product.images,
          tagsEn: product.tagsEn,
          tagsAr: product.tagsAr,
          aliasesEn: product.aliasesEn,
          aliasesAr: product.aliasesAr,
          notesEn: product.notesEn,
          notesAr: product.notesAr,
          stock: 0,
        });
        await Product.findByIdAndDelete(product._id);
      }
    }
  }

  if (status === "cancelled") {
    const ops: Promise<any>[] = [
      User.updateOne({ _id: order.user }, { $inc: { balance: order.total } }),
    ];
    if (wasConfirmed) {
      for (const item of order.items) {
        ops.push(Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }));
      }
    }
    await Promise.all(ops);
  }

  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: req.user.userId,
    changedAt: new Date(),
  });
  await order.save();

  if (status === "cancelled") {
    User.findById(order.user).then((user) => {
      notifyAdmins(
        "إلغاء طلب", "Order Cancelled",
        `${user?.name ?? user?.phone ?? "مستخدم"} تم إلغاء الطلب بواسطة المشرف`,
        `${user?.name ?? user?.phone ?? "User"} order was cancelled by admin`,
        { screen: "orders", orderId: order._id.toString() },
      );
    }).catch(() => {});
  }

  User.findById(order.user).then((user) => {
    if (user?.expoPushToken) {
      const isAr = user.lang === "ar";
      const statusLabel = translateStatus(status, isAr ? "ar" : "en");
      sendPushNotification(
        user.expoPushToken,
        isAr ? "تم تحديث حالة الطلب" : "Order status updated",
        isAr ? `تم تغيير حالة طلبك إلى ${statusLabel}` : `Your order status has been changed to ${statusLabel}`,
        { orderId: order._id.toString(), status },
      );
    }
  }).catch(() => {});

  return responder()
    .code(200)
    .message("Order status updated")
    .payload(localize(order.toJSON(), req.lang, req))
    .send(res);
};
