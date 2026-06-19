import type { Response } from "express";
import type { AppError } from "../errors/AppError.js";

class ResponseTemplate {
  status: number | undefined;
  mess: string | undefined;
  data: any;
  metaData: any;

  error: AppError | undefined;

  constructor() {}

  async send(res: Response) {
    if (this.error) {
      return res.status(this.status ?? 500).json({
        success: false,
        status: this.status ?? 500,
        message: this.mess ?? "fail",
        meta: this.metaData,
        data: this.data,
      });
    }

    return res.status(this.status ?? 200).json({
      success: true,
      status: this.status ?? 200,
      message: this.mess ?? "success",
      meta: this.metaData,
      data: this.data,
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
