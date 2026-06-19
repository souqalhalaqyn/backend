import type { Request, Response } from "express";
import type { Model } from "mongoose";
import { AppError } from "../errors/AppError.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

interface PaginationConfig {
  defaultLimit?: number;
  maxLimit?: number;
}

interface HookContext<T = any> {
  req: Request;
  doc?: T;
  docs?: T[];
}

interface CrudHooks<T = any> {
  beforeCreate?: (ctx: HookContext<T>) => void | Promise<void>;
  afterCreate?: (ctx: HookContext<T>) => T | Promise<T>;
  beforeUpdate?: (ctx: HookContext<T>) => void | Promise<void>;
  afterUpdate?: (ctx: HookContext<T>) => T | Promise<T>;
  beforeRemove?: (ctx: HookContext<T>) => void | Promise<void>;
  afterRemove?: (ctx: HookContext<T>) => void | Promise<void>;
  afterList?: (ctx: HookContext<T>) => T[] | Promise<T[]>;
  afterGet?: (ctx: HookContext<T>) => T | Promise<T>;
}

export interface CrudOptions<T = any> {
  model: Model<T>;
  resourceName: string;
  populate?: string | object | (string | object)[];
  pagination?: PaginationConfig;
  localize?: boolean;
  hooks?: CrudHooks<T>;
  listFilter?: (req: Request) => Record<string, any>;
}

export interface CrudHandlers {
  getAll: (req: Request, res: Response) => Promise<any>;
  getById: (req: Request, res: Response) => Promise<any>;
  create: (req: Request, res: Response) => Promise<any>;
  update: (req: Request, res: Response) => Promise<any>;
  remove: (req: Request, res: Response) => Promise<any>;
}

function fetchError(name: string, verb: string) {
  return new AppError(`${name} not ${verb}`, 404);
}

export function createCrudController<T>(opts: CrudOptions<T>): CrudHandlers {
  const { model, resourceName, populate, pagination = {}, localize: shouldLocalize, hooks, listFilter } = opts;
  const defaultLimit = pagination.defaultLimit ?? 20;
  const maxLimit = pagination.maxLimit ?? 100;

  function applyPopulate(query: any) {
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => query.populate(p));
      } else {
        query.populate(populate);
      }
    }
    return query;
  }

  function prepareData(data: any, lang: "en" | "ar", req: Request) {
    if (!data) return data;
    if (req.user?.role === "admin" || req.isAdminRequest) return data;
    return shouldLocalize ? localize(data, lang) : data;
  }

  const getAll: CrudHandlers["getAll"] = async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
    const skip = (page - 1) * limit;

    const filter = listFilter ? listFilter(req) : {};

    let query = model.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
    query = applyPopulate(query);

    const [docs, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);

    let result = docs as any[];
    if (hooks?.afterList) {
      result = await hooks.afterList({ req, docs: result });
    }

    return responder()
      .code(200)
      .message(`${resourceName}s fetched`)
      .payload(prepareData(result, req.lang, req))
      .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
      .send(res);
  };

  const getById: CrudHandlers["getById"] = async (req, res) => {
    let query = model.findById(req.params.id);
    query = applyPopulate(query);

    const doc = await query.lean();
    if (!doc) throw fetchError(resourceName, "found");

    let result = doc as any;
    if (hooks?.afterGet) {
      result = await hooks.afterGet({ req, doc: result });
    }

    return responder()
      .code(200)
      .message(`${resourceName} fetched`)
      .payload(prepareData(result, req.lang, req))
      .send(res);
  };

  const create: CrudHandlers["create"] = async (req, res) => {
    if (hooks?.beforeCreate) await hooks.beforeCreate({ req });

    const doc = await model.create(req.body);

    let result: any = doc.toObject ? doc.toObject() : doc;
    if (hooks?.afterCreate) {
      result = await hooks.afterCreate({ req, doc: result });
    }

    return responder()
      .code(201)
      .message(`${resourceName} created`)
      .payload(prepareData(result, req.lang, req))
      .send(res);
  };

  const update: CrudHandlers["update"] = async (req, res) => {
    if (hooks?.beforeUpdate) await hooks.beforeUpdate({ req });

    const doc = await model.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!doc) throw fetchError(resourceName, "found");

    let result: any = doc.toObject ? doc.toObject() : doc;
    if (hooks?.afterUpdate) {
      result = await hooks.afterUpdate({ req, doc: result });
    }

    return responder()
      .code(200)
      .message(`${resourceName} updated`)
      .payload(prepareData(result, req.lang, req))
      .send(res);
  };

  const remove: CrudHandlers["remove"] = async (req, res) => {
    if (hooks?.beforeRemove) await hooks.beforeRemove({ req });

    const doc = await model.findByIdAndDelete(req.params.id);
    if (!doc) throw fetchError(resourceName, "found");

    if (hooks?.afterRemove) await hooks.afterRemove({ req, doc: doc.toObject ? doc.toObject() : doc });

    return responder()
      .code(200)
      .message(`${resourceName} deleted`)
      .send(res);
  };

  return { getAll, getById, create, update, remove };
}
