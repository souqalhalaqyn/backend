import type { Request, Response } from "express";
import Branch from "../models/Branch.js";
import State from "../models/State.js";
import Way from "../models/Way.js";
import { createCrudController } from "../utils/CrudFactory.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

// -- Public endpoints --

export const getStates = async (req: Request, res: Response) => {
  const states = await State.find().sort({ nameEn: 1 }).lean();
  return responder().code(200).message("States fetched").payload(localize(states, req.lang, req)).send(res);
};

export const getWaysByState = async (req: Request, res: Response) => {
  const ways = await Way.find({ state: req.params.stateId }).sort({ nameEn: 1 }).lean();
  return responder().code(200).message("Ways fetched").payload(localize(ways, req.lang, req)).send(res);
};

export const getBranchesByWay = async (req: Request, res: Response) => {
  const branches = await Branch.find({ way: req.params.wayId }).sort({ nameEn: 1 }).lean();
  return responder().code(200).message("Branches fetched").payload(localize(branches, req.lang, req)).send(res);
};

export const getLocationTree = async (req: Request, res: Response) => {
  const states = await State.find().sort({ nameEn: 1 }).lean();
  const ways = await Way.find().sort({ nameEn: 1 }).lean();
  const branches = await Branch.find().sort({ nameEn: 1 }).lean();

  const waysByState = ways.reduce<Record<string, typeof ways>>((acc, w) => {
    const sid = w.state.toString();
    if (!acc[sid]) acc[sid] = [];
    acc[sid].push(w);
    return acc;
  }, {});

  const branchesByWay = branches.reduce<Record<string, typeof branches>>((acc, b) => {
    const wid = b.way.toString();
    if (!acc[wid]) acc[wid] = [];
    acc[wid].push(b);
    return acc;
  }, {});

  const tree = states.map((s) => ({
    _id: s._id,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    isDirectDelivery: s.isDirectDelivery,
    ways: (waysByState[s._id.toString()] ?? []).map((w) => ({
      _id: w._id,
      nameEn: w.nameEn,
      nameAr: w.nameAr,
      branches: (branchesByWay[w._id.toString()] ?? []).map((b) => ({
        _id: b._id,
        nameEn: b.nameEn,
        nameAr: b.nameAr,
      })),
    })),
  }));

  return responder().code(200).message("Location tree fetched").payload(localize(tree, req.lang, req)).send(res);
};

// -- Admin CRUD via factory --

export const stateCrud = createCrudController({
  model: State,
  resourceName: "state",
  pagination: { defaultLimit: 50 },
  hooks: {
    beforeRemove: async ({ req }) => {
      const state = await State.findById(req.params.id);
      if (state) {
        const wayIds = await Way.find({ state: state._id }).distinct("_id");
        await Branch.deleteMany({ way: { $in: wayIds } });
        await Way.deleteMany({ state: state._id });
      }
    },
  },
});

export const wayCrud = createCrudController({
  model: Way,
  resourceName: "way",
  pagination: { defaultLimit: 50 },
  hooks: {
    beforeRemove: async ({ req }) => {
      const way = await Way.findById(req.params.id);
      if (way) await Branch.deleteMany({ way: way._id });
    },
  },
});

export const branchCrud = createCrudController({
  model: Branch,
  resourceName: "branch",
  pagination: { defaultLimit: 50 },
});
