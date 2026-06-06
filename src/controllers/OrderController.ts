import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Container from "../models/Container.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

export const placeOrder = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { items, location } = req.body;
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
    quantity: number;
    image: string;
  }

  const orderItems: OrderItemInput[] = [];
  let total = 0;
  const stockUpdates: Array<Promise<any>> = [];

  for (const item of items) {
    const containerId: string = item.containerId;
    const productIndex: number = item.productIndex;
    const quantity: number = item.quantity;

    if (quantity < 1) throw new AppError("Invalid quantity", 400);

    const container = containerMap.get(containerId);
    if (!container) throw new AppError(`Container not found: ${containerId}`, 400);

    const containerProducts = productsByContainer[containerId] ?? [];
    const product = containerProducts[productIndex] as any;
    if (!product) throw new AppError(`Product at index ${productIndex} not found`, 400);
    if (product.stock < quantity) {
      throw new AppError(`Insufficient stock for product`, 400);
    }

    total += product.price * quantity;
    orderItems.push({
      container: container._id.toString(),
      product: product._id.toString(),
      productIndex,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      price: product.price,
      quantity,
      image: product.images?.[0] ?? "",
    });

    stockUpdates.push(
      Product.updateOne(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
      ),
    );
  }

  const results = await Promise.all(stockUpdates);
  const allSucceeded = results.every((r) => r.modifiedCount === 1);
  if (!allSucceeded) {
    const toRestore = orderItems.filter((_, i) => results[i]?.modifiedCount === 1);
    if (toRestore.length > 0) {
      await Promise.all(
        toRestore.map((oi) =>
          Product.updateOne({ _id: oi.product }, { $inc: { stock: oi.quantity } }),
        ),
      );
    }
    throw new AppError("Stock changed, please retry", 409);
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user.userId, balance: { $gte: total } },
    { $inc: { balance: -total } },
    { new: true },
  );
  if (!user) {
    await Promise.all(
      orderItems.map((oi) =>
        Product.updateOne({ _id: oi.product }, { $inc: { stock: oi.quantity } }),
      ),
    );
    throw new AppError("Insufficient balance", 400);
  }

  const order = await Order.create({
    user: req.user.userId,
    items: orderItems,
    total,
    status: "pending",
    location: location || "",
    statusHistory: [
      { status: "pending", changedBy: req.user.userId, changedAt: new Date() },
    ],
  });

  return responder().code(201).message("Order placed").payload(order).send(res);
};

export const getMyOrders = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const orders = await Order.find({ user: req.user.userId })
    .populate("items.product", "nameEn nameAr images price")
    .sort({ createdAt: -1 });

  return responder()
    .code(200)
    .message("Orders fetched")
    .payload(localize(orders.map((o) => o.toJSON()), req.lang))
    .send(res);
};

export const getOrderById = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const order = await Order.findById(req.params.id)
    .populate("items.product", "nameEn nameAr images price");
  if (!order) throw new AppError("Order not found", 404);

  if (order.user.toString() !== req.user.userId && req.user.role !== "admin") {
    throw new AppError("Access denied", 403);
  }

  return responder()
    .code(200)
    .message("Order fetched")
    .payload(localize(order.toJSON(), req.lang))
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

  await Promise.all([
    ...order.items.map((item) =>
      Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
      ),
    ),
    User.updateOne(
      { _id: req.user.userId },
      { $inc: { balance: order.total } },
    ),
  ]);

  order.status = "cancelled";
  order.statusHistory.push({
    status: "cancelled",
    changedBy: user._id,
    changedAt: new Date(),
  });
  await order.save();

  return responder()
    .code(200)
    .message("Order cancelled")
    .payload(localize(order.toJSON(), req.lang))
    .send(res);
};

export const getAllOrders = async (req: Request, res: Response) => {
  const orders = await Order.find()
    .populate("user", "phone name")
    .populate("items.product", "nameEn nameAr images price")
    .sort({ createdAt: -1 });

  return responder()
    .code(200)
    .message("Orders fetched")
    .payload(localize(orders.map((o) => o.toJSON()), req.lang))
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

  if (status === "cancelled") {
    await Promise.all([
      ...order.items.map((item) =>
        Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
        ),
      ),
      User.updateOne(
        { _id: order.user },
        { $inc: { balance: order.total } },
      ),
    ]);
  }

  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: req.user.userId,
    changedAt: new Date(),
  });
  await order.save();

  return responder()
    .code(200)
    .message("Order status updated")
    .payload(localize(order.toJSON(), req.lang))
    .send(res);
};
