import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import AsyncErrorHandler from "../utils/async-handler";
import ErrorHandler from "../utils/error-handler";
import { sendMail } from "../utils/send-email";
import { generateActivationEmailHtml } from "../lib/emails/activation-email";
import { generatePasswordResetEmailHtml } from "../lib/emails/forgot-password-email";
import config from "../config";
import prisma from "../lib/prisma";

const generateTokens = (userId: string) => {
  const accessTokenOptions: jwt.SignOptions = {
    expiresIn: parseInt(config.JWT_ACCESS_SECRET_EXPIRY),
    algorithm: "HS256",
  };

  const accessToken = jwt.sign(
    { id: userId },
    config.JWT_ACCESS_SECRET,
    accessTokenOptions
  );

  const refreshTokenOptions: jwt.SignOptions = {
    expiresIn: parseInt(config.JWT_REFRESH_SECRET_EXPIRY),
    algorithm: "HS256",
  };

  const refreshToken = jwt.sign(
    { id: userId },
    config.JWT_REFRESH_SECRET,
    refreshTokenOptions
  );

  return { accessToken, refreshToken };
};

const generateActivationToken = (payload: any) => {
  const activationTokenOptions: jwt.SignOptions = {
    expiresIn: parseInt(config.ACTIVATION_EXPIRY),
    algorithm: "HS256",
  };

  const { username, email, passwordHash, activationCode } = payload;

  const activationToken = jwt.sign(
    { user: { username, email, passwordHash }, activationCode },
    config.ACTIVATION_SECRET,
    activationTokenOptions
  );

  return activationToken;
};

const sanitizeUser = (user: any) => {
  const { password, ...userData } = user;
  return userData;
};

export const register = AsyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return next(new ErrorHandler("User already exists", 409));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const payload = {
      username,
      email,
      passwordHash,
      activationCode,
    };

    const activationToken = generateActivationToken(payload);

    await sendMail({
      to: email,
      subject: "Account Activation",
      html: generateActivationEmailHtml(username, activationCode),
    });

    res.status(201).json({
      success: true,
      message: "Activation email sent. Please check your inbox.",
      activationToken,
    });
  }
);

export const activate = AsyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { activationToken, activationCode } = req.body;
    const decoded = jwt.verify(
      activationToken,
      config.ACTIVATION_SECRET as Secret
    ) as JwtPayload;

    if (decoded.activationCode !== activationCode) {
      return next(new ErrorHandler("Invalid activation code", 400));
    }

    const { user } = decoded;
    if (!user) {
      return next(new ErrorHandler("Invalid activation token", 400));
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: user.email }, { username: user.username }] },
    });
    if (existingUser) {
      return next(new ErrorHandler("User already exists", 409));
    }

    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        username: user.username,
        email: user.email,
        password: user.passwordHash,
        role: "CUSTOMER",
      },
    });

    const { accessToken, refreshToken } = generateTokens(newUser.id);
    res.status(200).json({
      success: true,
      message: "Account activated successfully",
      user: sanitizeUser(newUser),
      accessToken,
      refreshToken,
    });
  }
);

export const login = AsyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  }
);

export const socialLogin = AsyncErrorHandler(
  async (req: Request, res: Response) => {
    const { email, username } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          username,
          email,
          password: "",
          role: "CUSTOMER",
        },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  }
);

export const refreshToken = AsyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.headers["x-refresh-token"] as string;
    if (!refreshToken) {
      return next(new ErrorHandler("Refresh token is required", 400));
    }
    try {
      const decoded = jwt.verify(
        refreshToken,
        config.JWT_REFRESH_SECRET as Secret
      ) as JwtPayload;
      if (!decoded.id) {
        return next(new ErrorHandler("Invalid refresh token", 401));
      }

      const accessTokenOptions: jwt.SignOptions = {
        expiresIn: parseInt(config.JWT_ACCESS_SECRET_EXPIRY),
        algorithm: "HS256",
      };

      const newAccessToken = jwt.sign(
        { id: decoded.id },
        config.JWT_ACCESS_SECRET,
        accessTokenOptions
      );

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken,
      });
    } catch (error) {
      return next(new ErrorHandler("Invalid refresh token", 401));
    }
  }
);

export const forgotPassword = AsyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const resetToken = jwt.sign({ id: user.id }, config.RESET_SECRET, {
      expiresIn: parseInt(config.RESET_SECRET_EXPIRY),
      algorithm: "HS256",
    });

    const resetLink = `${config.CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendMail({
      to: email,
      subject: "Password Reset Request",
      html: generatePasswordResetEmailHtml(
        user.username,
        resetToken,
        resetLink
      ),
    });

    res.status(200).json({
      success: true,
      message: "A password reset email has been sent. Please check your inbox.",
    });
  }
);

export const resetPassword = AsyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, newPassword } = req.body;

    try {
      const decoded = jwt.verify(token, config.RESET_SECRET) as JwtPayload;
      if (!decoded.id) {
        return next(new ErrorHandler("Invalid reset token", 400));
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      });

      res.status(200).json({
        success: true,
        message:
          "Your password has been reset successfully. You may now log in with your new password.",
      });
    } catch (error) {
      return next(new ErrorHandler("Invalid reset token", 400));
    }
  }
);
