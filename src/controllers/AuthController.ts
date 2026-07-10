import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import User from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { responder } from "../utils/Responder.js";

const SYRIAN_PHONE_REGEX = /^\+9639\d{8}$/;

function validateSyrianPhone(phone: string) {
  if (!SYRIAN_PHONE_REGEX.test(phone)) {
    throw new AppError("Phone must be in Syrian format: +963 9xx xxx xxx", 400);
  }
}

export const signup = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    throw new AppError("Phone and password are required", 400);
  if (password.length < 6)
    throw new AppError("Password must be at least 6 characters", 400);

  validateSyrianPhone(phone);

  const existing = await User.findOne({ phone });
  if (existing)
    throw new AppError("An account with this phone already exists", 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ phone, password: hashedPassword });

  const payload = {
    userId: user._id.toString(),
    phone: user.phone,
    role: user.role,
    tokenVersion: user.refreshTokenVersion,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return responder()
    .code(201)
    .message("Account created successfully")
    .payload({
      accessToken,
      refreshToken,
      user: { _id: user._id, phone: user.phone, role: user.role, name: user.name },
    })
    .send(res);
};

export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    throw new AppError("Phone and password are required", 400);

  const user = await User.findOne({ phone });
  if (!user) throw new AppError("Invalid phone or password", 401);

  if (user.isBlocked) throw new AppError("Account is blocked. Contact support.", 403);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError("Invalid phone or password", 401);

  const payload = {
    userId: user._id.toString(),
    phone: user.phone,
    role: user.role,
    tokenVersion: user.refreshTokenVersion,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return responder()
    .code(200)
    .message("Login successful")
    .payload({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        mustChangePassword: user.mustChangePassword,
      },
    })
    .send(res);
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError("Refresh token is required", 400);

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user) throw new AppError("User not found", 404);

    if ((payload.tokenVersion ?? 0) < user.refreshTokenVersion) {
      throw new AppError("Refresh token has been revoked", 401);
    }

    const newPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
    };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    return responder()
      .code(200)
      .message("Token refreshed")
      .payload({ accessToken: newAccessToken, refreshToken: newRefreshToken })
      .send(res);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
};

export const logout = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  await User.findByIdAndUpdate(req.user.userId, {
    $inc: { refreshTokenVersion: 1 },
  });

  return responder().code(200).message("Logged out successfully").send(res);
};

// -- Location management --

export const getLocations = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  return responder()
    .code(200)
    .message("Locations fetched")
    .payload({
      locations: user.locations ?? [],
      defaultLocation: user.defaultLocation ?? "",
    })
    .send(res);
};

export const addLocation = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { name, address, state, way, branch } = req.body;
  if (!name) throw new AppError("Location name is required", 400);

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  const location: Record<string, unknown> = { name, address: address ?? "" };
  if (state) location.state = state;
  if (way) location.way = way;
  if (branch) location.branch = branch;

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user.userId, "locations.name": { $ne: name } },
    {
      $push: { locations: location },
      $set: { defaultLocation: user.defaultLocation || name },
    },
    { returnDocument: "after" },
  );

  if (!updatedUser) {
    const exists = await User.findOne({
      _id: req.user.userId,
      "locations.name": name,
    });
    if (exists)
      throw new AppError("A location with this name already exists", 400);
    throw new AppError("User not found", 404);
  }

  return responder()
    .code(201)
    .message("Location added")
    .payload(updatedUser)
    .send(res);
};

export const updateLocation = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { name: oldName } = req.params;
  const { name, address } = req.body;
  if (!name || !address)
    throw new AppError("Name and address are required", 400);

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  const existingIdx = user.locations?.findIndex((l) => l.name === oldName);
  if (existingIdx === undefined || existingIdx === -1)
    throw new AppError("Location not found", 404);

  if (oldName !== name && user.locations?.some((l) => l.name === name)) {
    throw new AppError("A location with this name already exists", 400);
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user.userId },
    {
      $set: {
        [`locations.${existingIdx}.name`]: name,
        [`locations.${existingIdx}.address`]: address,
        ...(user.defaultLocation === oldName ? { defaultLocation: name } : {}),
      },
    },
    { returnDocument: "after" },
  );

  if (!updatedUser) throw new AppError("User not found", 404);

  return responder()
    .code(200)
    .message("Location updated")
    .payload(updatedUser)
    .send(res);
};

export const deleteLocation = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { name } = req.params;

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user.userId },
    {
      $pull: { locations: { name } },
      ...(user.defaultLocation === name
        ? {
            $set: {
              defaultLocation:
                user.locations?.find((l) => l.name !== name)?.name ?? "",
            },
          }
        : {}),
    },
    { returnDocument: "after" },
  );

  if (!updatedUser) throw new AppError("User not found", 404);

  return responder()
    .code(200)
    .message("Location deleted")
    .payload(updatedUser)
    .send(res);
};

export const registerPushToken = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { expoPushToken } = req.body;
  if (!expoPushToken || typeof expoPushToken !== "string") {
    throw new AppError("expoPushToken is required", 400);
  }

  await User.findByIdAndUpdate(req.user.userId, { expoPushToken });

  return responder().code(200).message("Push token registered").send(res);
};

export const changeMyPassword = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  if (currentPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new AppError("Current password is incorrect", 400);
  } else if (!user.mustChangePassword) {
    throw new AppError("Current password is required", 400);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.mustChangePassword = false;
  await user.save();

  return responder().code(200).message("Password changed successfully").send(res);
};

export const setDefaultLocation = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { name } = req.body;
  if (!name) throw new AppError("Location name is required", 400);

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);

  if (!user.locations?.some((l) => l.name === name)) {
    throw new AppError("Location not found", 404);
  }

  user.defaultLocation = name;
  await user.save();

  return responder()
    .code(200)
    .message("Default location set")
    .payload(user)
    .send(res);
};

export const updateName = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError("Name is required", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { name: name.trim() },
    { new: true, select: "-password -refreshTokenVersion" },
  );
  if (!user) throw new AppError("User not found", 404);

  return responder()
    .code(200)
    .message("Name updated")
    .payload({ name: user.name })
    .send(res);
};
