import type { Response } from "express";
import type { AppError } from "../errors/AppError.js";
import Settings from "../models/Settings.js";

const PRICE_FIELDS = new Set([
  "price", "total", "balance", "offerPrice", "unitSellPrice",
  "totalProfitDistributed", "buyerProfit", "totalProfitAmount",
  "amount", "commissionAmount",
]);

function addSypFields(obj: any, rate: number): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => addSypFields(item, rate));
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];

      if (PRICE_FIELDS.has(key) && typeof val === "number") {
        const sypKey = `${key}SY`;
        if (obj[sypKey] === undefined) {
          result[key] = val;
          result[sypKey] = Math.round(val * rate);
          continue;
        }
      }

      if (typeof val === "object" && val !== null) {
        result[key] = addSypFields(val, rate);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  return obj;
}

class ResponseTemplate {
  status: number | undefined;
  mess: string | undefined;
  data: any;
  metaData: any;

  error: AppError | undefined;

  constructor() {}

  async send(res: Response) {
    const settings = await Settings.findOne();
    const rate = settings?.sypExchangeRate ?? 15000;
    const convertedData = this.data !== undefined ? addSypFields(this.data, rate) : this.data;

    if (this.error) {
      return res.status(this.status ?? 500).json({
        success: false,
        status: this.status ?? 500,
        message: this.mess ?? "fail",
        meta: this.metaData,
        data: convertedData,
      });
    }

    return res.status(this.status ?? 200).json({
      success: true,
      status: this.status ?? 200,
      message: this.mess ?? "success",
      meta: this.metaData,
      data: convertedData,
    });
  }

  err(err: AppError): ResponseTemplate {
    this.error = err;
    this.status = err.status;
    this.mess = err.message;
    return this;
  }

  code(code: number): ResponseTemplate {
    this.status = code;
    return this;
  }

  message(mess: string): ResponseTemplate {
    this.mess = mess;
    return this;
  }

  payload(payload: any): ResponseTemplate {
    this.data = payload;
    return this;
  }

  meta(meta: any): ResponseTemplate {
    this.metaData = meta;
    return this;
  }
}

export const responder = () => new ResponseTemplate();
