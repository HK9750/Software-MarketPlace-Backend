import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { UploadedFile } from 'express-fileupload';
import { uploadOnCloudinary } from '../lib/cloudinary';
import { AuthenticatedRequest } from './subscription-controller';
import { notificationQueue } from '../bull/notification-queue';
import path from 'path';
import fs from 'fs';
import { createClient } from '../lib/redis-client';

const redisClient = createClient();

export const getAllProducts = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { status, category } = req.query;

        const products = await prisma.software.findMany({
            where: {
                status: status ? parseInt(status as string) : undefined,
                ...(category ? { categoryId: category as string } : {}),
            },
            select: {
                id: true,
                name: true,
                description: true,
                filePath: true,
                seller: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                averageRating: true,
                subscriptions: {
                    select: {
                        price: true,
                    },
                    orderBy: {
                        price: 'asc',
                    },
                    take: 1,
                },
                wishlist: req.user
                    ? {
                          where: {
                              userId: req.user.id,
                          },
                          select: {
                              softwareId: true,
                          },
                      }
                    : undefined,
            },
        });

        const productsWithWishlistFlag = products.map((product) => {
            const isWishlisted = product.wishlist
                ? product.wishlist.length > 0
                : false;
            const { wishlist, subscriptions, ...rest } = product;
            return {
                ...rest,
                isWishlisted,
                subscriptions: subscriptions[0]?.price || null,
            };
        });

        res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            data: productsWithWishlistFlag,
        });
    }
);

export const getAllProductsBySeller = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const sellerProfile = await prisma.sellerProfile.findFirst({
            where: { userId: req.user?.id },
            select: { id: true },
        });
        if (!sellerProfile) {
            return next(
                new ErrorHandler(
                    'Seller profile not found. Please complete your seller profile first.',
                    400
                )
            );
        }
        const products = await prisma.software.findMany({
            where: {
                sellerId: sellerProfile.id,
            },
            select: {
                id: true,
                name: true,
                description: true,
                filePath: true,
                seller: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                averageRating: true,
                subscriptions: {
                    select: {
                        price: true,
                    },
                    orderBy: {
                        price: 'asc',
                    },
                    take: 1,
                },
                wishlist: req.user
                    ? {
                          where: {
                              userId: req.user.id,
                          },
                          select: {
                              softwareId: true,
                          },
                      }
                    : undefined,
            },
        });

        const productsWithWishlistFlag = products.map((product) => {
            const isWishlisted = product.wishlist
                ? product.wishlist.length > 0
                : false;
            const { wishlist, subscriptions, ...rest } = product;
            return {
                ...rest,
                isWishlisted,
                subscriptions: subscriptions[0]?.price || null,
            };
        });

        res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            data: productsWithWishlistFlag,
        });
    }
);
export const getProduct = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const product = await prisma.software.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                description: true,
                features: true,
                requirements: true,
                filePath: true,
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
                            },
                        },
                    },
                },
                reviews: true,
                averageRating: true,
                subscriptions: {
                    select: {
                        id: true,
                        price: true,
                        basePrice: true,
                        subscriptionPlan: {
                            select: {
                                name: true,
                                duration: true,
                            },
                        },
                    },
                },
            },
        });

        if (!product) {
            return next(new ErrorHandler('Product not found', 404));
        }

        // Check wishlist and cart status for the logged in user
        let isWishlisted = false;
        let isInCart = false;
        if (req.user) {
            const wishlistEntry = await prisma.wishlist.findFirst({
                where: {
                    userId: req.user.id,
                    softwareId: req.params.id,
                },
            });
            const cartEntry = await prisma.cart.findFirst({
                where: {
                    userId: req.user.id,
                    subscription: { softwareId: req.params.id },
                },
            });
            isWishlisted = Boolean(wishlistEntry);
            isInCart = Boolean(cartEntry);
        }

        // Transform subscriptions to include only price and name
        const formattedSubscriptions = product.subscriptions.map((sub) => ({
            id: sub.id,
            basePrice: sub.basePrice,
            price: sub.price,
            name: sub.subscriptionPlan.name,
            duration: sub.subscriptionPlan.duration,
        }));

        // Return the formatted response
        res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: {
                ...product,
                subscriptions: formattedSubscriptions,
                isWishlisted,
                isInCart,
            },
        });
    }
);

export const createProduct = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.body.data) {
            return next(new ErrorHandler('Missing product data', 400));
        }

        // Parse the JSON data string
        const parsedData = JSON.parse(req.body.data);

        const {
            name,
            description,
            features,
            requirements,
            categoryId,
            subscriptionOptions, // Expecting an array
        } = parsedData;

        if (!req.files || !req.files.image) {
            return next(new ErrorHandler('No image file provided', 400));
        }

        const file = req.files.image as UploadedFile;

        const sellerProfile = await prisma.sellerProfile.findFirst({
            where: { userId: req.user?.id },
            select: { id: true },
        });

        if (!sellerProfile) {
            return next(
                new ErrorHandler(
                    'Seller profile not found. Please complete your seller profile first.',
                    400
                )
            );
        }

        // Create a temp folder if it doesn't exist
        const tempDir = path.join(__dirname, '../public/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Use absolute path for file saving
        const tempPath = path.join(tempDir, file.name);

        // Move uploaded file to temp path
        await file.mv(tempPath);

        // Upload to Cloudinary
        const uploadedImage = await uploadOnCloudinary(tempPath);
        if (!uploadedImage) {
            return next(new ErrorHandler('Image upload failed', 500));
        }

        // Optional: delete temp file
        fs.unlink(tempPath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });

        const filePath = uploadedImage.secure_url;
        console.log(filePath);

        const product = await prisma.$transaction(async (tx) => {
            const software = await tx.software.create({
                data: {
                    name,
                    description,
                    features,
                    requirements,
                    filePath,
                    categoryId,
                    sellerId: sellerProfile.id,
                },
            });

            if (
                Array.isArray(subscriptionOptions) &&
                subscriptionOptions.length > 0
            ) {
                for (const option of subscriptionOptions) {
                    const { subscriptionPlanId, price } = option;
                    await tx.softwareSubscriptionPlan.create({
                        data: {
                            softwareId: software.id,
                            subscriptionPlanId,
                            basePrice: price,
                            price,
                        },
                    });
                }
            }

            return software;
        });

        if (!product) {
            return next(new ErrorHandler('Product not created', 400));
        }

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product.id,
        });
    }
);

export const updateProduct = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { name, description, features, requirements, discount } =
            req.body;
        const productId = req.params.id;

        // Ensure the product exists
        const oldProduct = await prisma.software.findUnique({
            where: { id: productId },
        });

        if (!oldProduct) {
            return next(new ErrorHandler('Product not found', 404));
        }

        // Start a transaction
        const updatedProduct = await prisma.$transaction(async (tx) => {
            // Step 1: Get the current lowest subscription price
            const oldLowestSubscription =
                await tx.softwareSubscriptionPlan.findFirst({
                    where: { softwareId: productId },
                    orderBy: { price: 'asc' },
                    select: {
                        price: true,
                        subscriptionPlan: {
                            select: { name: true },
                        },
                    },
                });

            // Step 2: Update the software with any provided fields
            const product = await tx.software.update({
                where: { id: productId },
                data: {
                    ...(name && { name }),
                    ...(description && { description }),
                    ...(features && { features }),
                    ...(requirements && { requirements }),
                    ...(typeof discount === 'number' && { discount }),
                },
            });

            // Step 3: Recalculate prices if discount is provided
            if (
                typeof discount === 'number' &&
                discount >= 0 &&
                discount <= 100
            ) {
                const multiplier = 1 - discount / 100;

                await tx.$executeRawUnsafe(`
                    UPDATE "SoftwareSubscriptionPlan"
                    SET "price" = "basePrice" * ${multiplier}
                    WHERE "softwareId" = '${productId}'
                `);
            }

            // Step 4: Get new lowest subscription price
            const newLowestSubscription =
                await tx.softwareSubscriptionPlan.findFirst({
                    where: { softwareId: productId },
                    orderBy: { price: 'asc' },
                    select: {
                        price: true,
                        subscriptionPlan: {
                            select: { name: true },
                        },
                    },
                });

            // Step 5: If new price is lower, log history and queue notification
            if (
                oldLowestSubscription &&
                newLowestSubscription &&
                newLowestSubscription.price < oldLowestSubscription.price
            ) {
                await tx.priceHistory.create({
                    data: {
                        softwareId: productId,
                        oldPrice: oldLowestSubscription.price,
                        newPrice: newLowestSubscription.price,
                        changedAt: new Date(),
                    },
                });

                await notificationQueue.add(
                    'create-notifications',
                    {
                        notificationType: 'PRICE_DROP',
                        payload: {
                            productId: product.id,
                            productName: product.name,
                            oldPrice: oldLowestSubscription.price,
                            newPrice: newLowestSubscription.price,
                            subscriptionPlanName:
                                newLowestSubscription.subscriptionPlan.name,
                        },
                    },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                        removeOnFail: true,
                    }
                );
            }

            return product;
        });

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct.id,
        });
    }
);

export const UpdateStatus = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const product = await prisma.software.update({
            where: {
                id: req.params.id,
            },
            data: {
                status: parseInt(req.params.status),
            },
        });

        if (!product) {
            return next(new ErrorHandler('Product not approved', 400));
        }

        res.status(200).json({
            success: true,
            message: 'Product approved successfully',
            data: product,
        });
    }
);

export const getProductsForHomepage = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const cacheKey = 'homepage_products';
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.status(200).json({
                success: true,
                message: 'Products retrieved successfully (from cache)',
                softwares: JSON.parse(cached),
            });
        }

        // Fire all three queries in parallel
        const [popularRaw, trendingHistories, bestSellerRaw] =
            await Promise.all([
                // 1) Popular: top 4 by rating
                prisma.software.findMany({
                    where: { status: 1 },
                    orderBy: { averageRating: 'desc' },
                    take: 4,
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        filePath: true,
                        averageRating: true,
                        priceHistory: {
                            orderBy: { changedAt: 'desc' },
                            take: 1,
                            select: { newPrice: true },
                        },
                    },
                }),

                // 2) Trending: 4 most-recent price drops
                prisma.priceHistory.findMany({
                    where: {
                        newPrice: { lt: prisma.priceHistory.fields.oldPrice },
                    },
                    orderBy: { changedAt: 'desc' },
                    take: 4,
                    include: {
                        software: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                filePath: true,
                                averageRating: true,
                            },
                        },
                    },
                }),

                // 3) Best Sellers: top 4 by subscription count
                prisma.software.findMany({
                    where: { status: 1 },
                    orderBy: { subscriptions: { _count: 'desc' } },
                    take: 4,
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        filePath: true,
                        averageRating: true,
                        priceHistory: {
                            orderBy: { changedAt: 'desc' },
                            take: 1,
                            select: { newPrice: true },
                        },
                    },
                }),
            ]);

        // Map into the shapes your frontend expects:
        const popular = popularRaw.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            filePath: p.filePath,
            rating: p.averageRating,
            latestPrice: p.priceHistory[0]?.newPrice ?? null,
            type: 'popular' as const,
        }));

        const trending = trendingHistories.map((h) => ({
            id: h.software.id,
            name: h.software.name,
            description: h.software.description,
            filePath: h.software.filePath,
            rating: h.software.averageRating,
            latestPrice: h.newPrice,
            type: 'trending' as const,
        }));

        const bestSellers = bestSellerRaw.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            filePath: p.filePath,
            rating: p.averageRating,
            latestPrice: p.priceHistory[0]?.newPrice ?? null,
            type: 'bestseller' as const,
        }));

        const softwares = { popular, trending, bestSellers };
        const hasAny =
            popular.length + trending.length + bestSellers.length > 0;

        if (hasAny) {
            // cache for 24 hrs
            await redisClient.setex(
                cacheKey,
                60 * 60 * 24,
                JSON.stringify(softwares)
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            softwares,
        });
    }
);
