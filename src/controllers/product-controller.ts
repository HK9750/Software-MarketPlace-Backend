import { Request, Response, NextFunction } from "express";
import AsyncErrorHandler from "../utils/async-handler";
import ErrorHandler from "../utils/error-handler";
import prisma from "../lib/prisma";

export const getAllProducts = AsyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { status, category } = req.query;
    const products = await prisma.software.findMany({
        where: {
            status: status ? parseInt(status as string) : 1,
            ...(category ? { categoryId: category as string } : {}),
        },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            features: true,
            requirements: true,
            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
            seller: {
                select: {
                    verified: true,
                    websiteLink: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            profile: true,
                        }
                    }
                }
            },
            avergaeRating: true
        }
    })

    res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: products,
    })
})

export const getProduct = AsyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    const product = await prisma.software.findUnique({
        where: {
            id: req.params.id,
            status: 1,
        },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            features: true,
            requirements: true,
            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
            seller: {
                select: {
                    verified: true,
                    websiteLink: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            profile: true,
                        }
                    }
                }
            },
            reviews: true,
            avergaeRating: true
        }
    })


    if (!product) {
        return next(new ErrorHandler("Product not found", 404))
    }

    res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: product,
    })
})

export const createProduct = AsyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, price, features, requirements, categoryId, sellerId, discount } = req.body

    const product = await prisma.software.create({
        data: {
            name,
            description,
            price,
            features,
            requirements,
            discount,
            category: {
                connect: { id: categoryId }
            },
            seller: {
                connect: { id: sellerId }
            }
        }
    })

    if (!product) {
        return next(new ErrorHandler("Product not created", 400))
    }

    res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
    })
})

export const updateProduct = AsyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, price, features, requirements, discount } = req.body

    const product = await prisma.software.update({
        where: {
            id: req.params.id,
        },
        data: {
            name,
            description,
            price,
            features,
            requirements,
            discount,
        }
    })

    if (!product) {
        return next(new ErrorHandler("Product not updated", 400))
    }

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
    })
})

export const UpdateStatus = AsyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    const product = await prisma.software.update({
        where: {
            id: req.params.id,
        },
        data: {
            status: parseInt(req.params.status),
        }
    })

    if (!product) {
        return next(new ErrorHandler("Product not approved", 400))
    }

    res.status(200).json({
        success: true,
        message: "Product approved successfully",
        data: product,
    })
})
