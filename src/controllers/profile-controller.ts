import { Request, Response, NextFunction } from "express";
import AsyncErrorHandler from "../utils/async-handler";
import ErrorHandler from "../utils/error-handler";
import prisma from "../lib/prisma";
import { exclude } from "../utils/exclude";

export const getProfile = AsyncErrorHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user?.id,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const safeUser = exclude(user, ["password"]);

  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: safeUser,
  });
});

export const updateProfile = AsyncErrorHandler(async (req: Request, res: Response) => {
  const { username, email, profile, websiteLink } = req.body;
  const userRole = req.user?.role;

  const updateData: any = { username, email, profile };

  const selectFields: any = {
    id: true,
    username: true,
    email: true,
    profile: true,
  };

  if (userRole === "SELLER" && websiteLink) {
    updateData.sellerProfile = { update: { websiteLink } };
    selectFields.sellerProfile = { select: { websiteLink: true } };
  }

  const user = await prisma.user.update({
    where: { id: req.user?.id },
    data: updateData,
    select: selectFields,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});


export const getSellerProfile = AsyncErrorHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.id,
    },
    select: {
      id: true,
      username: true,
      email: true,
      profile: true,
      sellerProfile: {
        select: {
          id: true,
          verified: true,
          websiteLink: true,
        },
      }
    },
  });

  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: user,
  });
});

export const VerifySellerProfile = AsyncErrorHandler(async (req: Request, res: Response) => {
  const { verified } = req.body;

  const user = await prisma.user.update({
    where: {
      id: req.params.id,
    },
    data: {
      sellerProfile: {
        update: {
          verified,
        },
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      sellerProfile: {
        select: {
          id: true,
          verified: true,
        },
      }
    },
  });

  res.status(200).json({
    success: true,
    message: "Seller profile verified successfully",
    data: user,
  });
});

