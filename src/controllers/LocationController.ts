import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Region from "../models/Region.js";
import State from "../models/State.js";
import Way from "../models/Way.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

// -- Public endpoints --

export const getStates = async (req: Request, res: Response) => {
  const states = await State.find().sort({ nameEn: 1 }).lean();
  return responder()
    .code(200)
    .message("States fetched")
    .payload(localize(states, req.lang))
    .send(res);
};

export const getRegions = async (req: Request, res: Response) => {
  const { stateId } = req.params;
  const regions = await Region.find({ state: stateId }).sort({ nameEn: 1 }).lean();
  return responder()
    .code(200)
    .message("Regions fetched")
    .payload(localize(regions, req.lang))
    .send(res);
};

export const getWays = async (req: Request, res: Response) => {
  const { regionId } = req.params;
  const ways = await Way.find({ region: regionId }).sort({ nameEn: 1 }).lean();
  return responder()
    .code(200)
    .message("Ways fetched")
    .payload(localize(ways, req.lang))
    .send(res);
};

export const getLocationTree = async (req: Request, res: Response) => {
  const states = await State.find().sort({ nameEn: 1 }).lean();
  const regions = await Region.find().sort({ nameEn: 1 }).lean();
  const ways = await Way.find().sort({ nameEn: 1 }).lean();

  const regionsByState = regions.reduce<Record<string, typeof regions>>(
    (acc, r) => {
      const sid = r.state.toString();
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(r);
      return acc;
    },
    {},
  );

  const waysByRegion = ways.reduce<Record<string, typeof ways>>((acc, w) => {
    const rid = w.region.toString();
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push(w);
    return acc;
  }, {});

  const tree = states.map((s) => ({
    _id: s._id,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    regions: (regionsByState[s._id.toString()] ?? []).map((r) => ({
      _id: r._id,
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      isDirectDelivery: r.isDirectDelivery,
      ways: (waysByRegion[r._id.toString()] ?? []).map((w) => ({
        _id: w._id,
        nameEn: w.nameEn,
        nameAr: w.nameAr,
        deliveryCompanyEn: w.deliveryCompanyEn,
        deliveryCompanyAr: w.deliveryCompanyAr,
      })),
    })),
  }));

  return responder()
    .code(200)
    .message("Location tree fetched")
    .payload(localize(tree, req.lang))
    .send(res);
};

// -- Admin CRUD --

export const createState = async (req: Request, res: Response) => {
  const { nameEn, nameAr } = req.body;
  if (!nameEn || !nameAr) throw new AppError("State nameEn and nameAr are required", 400);
  const state = await State.create({ nameEn, nameAr });
  return responder().code(201).message("State created").payload(state).send(res);
};

export const updateState = async (req: Request, res: Response) => {
  const update: Record<string, unknown> = {};
  if (req.body.nameEn) update.nameEn = req.body.nameEn;
  if (req.body.nameAr) update.nameAr = req.body.nameAr;
  if (Object.keys(update).length === 0) throw new AppError("nameEn or nameAr is required", 400);
  const state = await State.findByIdAndUpdate(
    req.params.id,
    update,
    { returnDocument: "after" },
  );
  if (!state) throw new AppError("State not found", 404);
  return responder().code(200).message("State updated").payload(state).send(res);
};

export const deleteState = async (req: Request, res: Response) => {
  const state = await State.findByIdAndDelete(req.params.id);
  if (!state) throw new AppError("State not found", 404);
  await Region.deleteMany({ state: state._id });
  await Way.deleteMany({ region: { $in: await Region.find({ state: state._id }).distinct("_id") } });
  return responder().code(200).message("State deleted").send(res);
};

export const createRegion = async (req: Request, res: Response) => {
  const { nameEn, nameAr, stateId, isDirectDelivery } = req.body;
  if (!nameEn || !nameAr || !stateId) throw new AppError("nameEn, nameAr, and stateId are required", 400);
  const region = await Region.create({ nameEn, nameAr, state: stateId, isDirectDelivery: !!isDirectDelivery });
  return responder().code(201).message("Region created").payload(region).send(res);
};

export const updateRegion = async (req: Request, res: Response) => {
  const update: Record<string, unknown> = {};
  if (req.body.nameEn) update.nameEn = req.body.nameEn;
  if (req.body.nameAr) update.nameAr = req.body.nameAr;
  if (req.body.isDirectDelivery !== undefined) update.isDirectDelivery = req.body.isDirectDelivery;
  if (Object.keys(update).length === 0) throw new AppError("At least one field is required", 400);
  const region = await Region.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" });
  if (!region) throw new AppError("Region not found", 404);
  return responder().code(200).message("Region updated").payload(region).send(res);
};

export const deleteRegion = async (req: Request, res: Response) => {
  const region = await Region.findByIdAndDelete(req.params.id);
  if (!region) throw new AppError("Region not found", 404);
  await Way.deleteMany({ region: region._id });
  return responder().code(200).message("Region deleted").send(res);
};

export const createWay = async (req: Request, res: Response) => {
  const { nameEn, nameAr, deliveryCompanyEn, deliveryCompanyAr, regionId } = req.body;
  if (!nameEn || !nameAr || !deliveryCompanyEn || !deliveryCompanyAr || !regionId) {
    throw new AppError("nameEn, nameAr, deliveryCompanyEn, deliveryCompanyAr, and regionId are required", 400);
  }
  const way = await Way.create({ nameEn, nameAr, deliveryCompanyEn, deliveryCompanyAr, region: regionId });
  return responder().code(201).message("Way created").payload(way).send(res);
};

export const updateWay = async (req: Request, res: Response) => {
  const update: Record<string, unknown> = {};
  if (req.body.nameEn) update.nameEn = req.body.nameEn;
  if (req.body.nameAr) update.nameAr = req.body.nameAr;
  if (req.body.deliveryCompanyEn) update.deliveryCompanyEn = req.body.deliveryCompanyEn;
  if (req.body.deliveryCompanyAr) update.deliveryCompanyAr = req.body.deliveryCompanyAr;
  if (Object.keys(update).length === 0) throw new AppError("At least one field is required", 400);
  const way = await Way.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" });
  if (!way) throw new AppError("Way not found", 404);
  return responder().code(200).message("Way updated").payload(way).send(res);
};

export const deleteWay = async (req: Request, res: Response) => {
  const way = await Way.findByIdAndDelete(req.params.id);
  if (!way) throw new AppError("Way not found", 404);
  return responder().code(200).message("Way deleted").send(res);
};