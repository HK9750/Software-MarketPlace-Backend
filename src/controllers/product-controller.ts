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
        const { status, category, name } = req.query;

        const products = await prisma.software.findMany({
            where: {
                name: name != '' ? { contains: name as string } : undefined,
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
                    where: { status: 'ACTIVE' },
                    select: {
                        price: true,
                    },
                    orderBy: {
                        price: 'asc',
                    },
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
                subscriptions: subscriptions || null,
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
                status: true,
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
                    where: { status: 'ACTIVE' },
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
                status: true,
                name: true,
                discount: true,
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
                reviews: {
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                averageRating: true,
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    select: {
                        id: true,
                        price: true,
                        basePrice: true,
                        subscriptionPlan: {
                            select: {
                                id: true,
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
            subscriptionId: sub.subscriptionPlan.id,
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

        const tempDir = path.join(__dirname, '../public/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempPath = path.join(tempDir, file.name);

        await file.mv(tempPath);

        const uploadedImage = await uploadOnCloudinary(tempPath);
        if (!uploadedImage) {
            return next(new ErrorHandler('Image upload failed', 500));
        }

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
            subscriptionOptions, // Expecting an array
            discount,
        } = parsedData;
        const productId = req.params.id;

        let filePath = null;

        if (req.files && req.files.image) {
            const file = req.files.image as UploadedFile;

            const tempDir = path.join(__dirname, '../public/temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempPath = path.join(tempDir, file.name);
            await file.mv(tempPath);

            // Upload to Cloudinary
            const uploadedImage = await uploadOnCloudinary(tempPath);
            if (!uploadedImage) {
                return next(new ErrorHandler('Image upload failed', 500));
            }

            // Delete the temporary file
            fs.unlink(tempPath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });

            filePath = uploadedImage.secure_url;
            console.log('Uploaded image URL:', filePath);
        }

        const oldProduct = await prisma.software.findUnique({
            where: { id: productId },
        });

        if (!oldProduct) {
            return next(new ErrorHandler('Product not found', 404));
        }

        const updatedProduct = await prisma.$transaction(async (tx) => {
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

            const product = await tx.software.update({
                where: { id: productId },
                data: {
                    ...(name && { name }),
                    ...(description && { description }),
                    ...(features && { features }),
                    ...(requirements && { requirements }),
                    ...(typeof discount === 'number' && { discount }),
                    ...(filePath && { filePath }),
                },
            });

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

            if (
                subscriptionOptions &&
                Array.isArray(subscriptionOptions) &&
                subscriptionOptions.length > 0
            ) {
                // Cancel all current active plans for this product
                await tx.softwareSubscriptionPlan.updateMany({
                    where: { softwareId: productId, status: 'ACTIVE' },
                    data: { status: 'CANCELED' },
                });

                for (const option of subscriptionOptions) {
                    const { subscriptionPlanId, price } = option;
                    // Check if a plan with this softwareId and subscriptionPlanId exists (any status)
                    const existing =
                        await tx.softwareSubscriptionPlan.findFirst({
                            where: {
                                softwareId: productId,
                                subscriptionPlanId,
                            },
                        });

                    if (existing) {
                        // Update the existing plan to ACTIVE and update price/basePrice
                        await tx.softwareSubscriptionPlan.update({
                            where: { id: existing.id },
                            data: {
                                basePrice: price,
                                price:
                                    typeof discount === 'number'
                                        ? price * (1 - discount / 100)
                                        : price,
                                status: 'ACTIVE',
                            },
                        });
                    } else {
                        // Create a new plan if it doesn't exist
                        await tx.softwareSubscriptionPlan.create({
                            data: {
                                softwareId: productId,
                                subscriptionPlanId,
                                basePrice: price,
                                price:
                                    typeof discount === 'number'
                                        ? price * (1 - discount / 100)
                                        : price,
                                status: 'ACTIVE',
                            },
                        });
                    }
                }
            }

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
        // const cached = await redisClient.get(cacheKey);
        // if (cached) {
        //   return res.status(200).json({
        //     success: true,
        //     message: 'Products retrieved successfully (from cache)',
        //     softwares: JSON.parse(cached),
        //   });
        // }

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
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            orderBy: { price: 'asc' },
                            take: 1,
                            select: { price: true },
                        },
                        priceHistory: {
                            orderBy: { changedAt: 'desc' },
                            take: 1,
                            select: { newPrice: true, oldPrice: true },
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
                                subscriptions: {
                                    where: { status: 'ACTIVE' },
                                    orderBy: { price: 'asc' },
                                    take: 1,
                                    select: { price: true },
                                },
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
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            orderBy: { price: 'asc' },
                            take: 1,
                            select: { price: true },
                        },
                        priceHistory: {
                            orderBy: { changedAt: 'desc' },
                            take: 1,
                            select: { newPrice: true, oldPrice: true },
                        },
                    },
                }),
            ]);

        // Helper to pick the current price
        const getPrice = (software: any) => {
            if (software.subscriptions?.length) {
                return software.subscriptions[0].price;
            }
            if (software.priceHistory?.length) {
                return software.priceHistory[0].newPrice;
            }
            return 9.99;
        };

        // 1) Popular
        const popular = popularRaw.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            filePath: p.filePath,
            rating: p.averageRating,
            latestPrice: getPrice(p),
            oldPrice: p.priceHistory[0]?.oldPrice ?? null,
            type: 'popular' as const,
        }));

        // 2) Trending (deduped by software.id)
        const trendingSet = new Set<string>();
        const trending = trendingHistories.reduce(
            (acc, h) => {
                const sw = h.software;
                if (!trendingSet.has(sw.id)) {
                    trendingSet.add(sw.id);
                    acc.push({
                        id: Number(sw.id),
                        name: sw.name,
                        description: sw.description,
                        filePath: sw.filePath,
                        rating: sw.averageRating,
                        latestPrice: getPrice(sw),
                        oldPrice: h.oldPrice ?? null,
                        type: 'trending' as const,
                    });
                }
                return acc;
            },
            [] as {
                id: number;
                name: string;
                description: string;
                filePath: string;
                rating: number;
                latestPrice: number;
                oldPrice: number | null;
                type: 'trending';
            }[]
        );

        // 3) Best Sellers
        const bestSellers = bestSellerRaw.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            filePath: p.filePath,
            rating: p.averageRating,
            latestPrice: getPrice(p),
            oldPrice: p.priceHistory[0]?.oldPrice ?? null,
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
