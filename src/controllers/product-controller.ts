import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { UploadedFile } from 'express-fileupload';
import { uploadOnCloudinary } from '../lib/cloudinary';
import { AuthenticatedRequest } from './subscription-controller';
import { notificationQueue } from '../bull/notification-queue';

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
                        price: 'asc', // Lowest price first
                    },
                    take: 1, // Only need the lowest price
                },
                // Include wishlist relation filtered by current user, if logged in
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

        // Transform each product to add isWishlisted flag and simplify subscriptions field
        const productsWithWishlistFlag = products.map((product) => {
            const isWishlisted = product.wishlist
                ? product.wishlist.length > 0
                : false;
            // Destructure to remove the wishlist property
            const { wishlist, subscriptions, ...rest } = product;
            return {
                ...rest,
                isWishlisted,
                // Return the lowest price from subscriptions, if any
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

        const tempPath = `./public/temp/${file.name}`;

        await file.mv(tempPath);

        const uploadedImage = await uploadOnCloudinary(tempPath);
        if (!uploadedImage) {
            return next(new ErrorHandler('Image upload failed', 500));
        }
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

        // Fetch the existing product
        const oldProduct = await prisma.software.findUnique({
            where: { id: productId },
        });
        if (!oldProduct) {
            return next(new ErrorHandler('Product not found', 404));
        }

        // Begin a transaction to update product and subscription prices
        const updatedProduct = await prisma.$transaction(async (tx) => {
            // Step 1: Get the lowest subscription price before update
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

            // Step 2: Update product details including the discount percentage
            const product = await tx.software.update({
                where: { id: productId },
                data: {
                    name,
                    description,
                    features,
                    requirements,
                    discount, // discount percentage (e.g., 20 for 20%)
                },
            });

            // Calculate discount multiplier: new price = basePrice * (1 - discount/100)
            const multiplier = 1 - discount / 100;

            // Update all associated subscription prices based on their basePrice
            await tx.$executeRaw`
        UPDATE "SoftwareSubscriptionPlan"
        SET "price" = "basePrice" * ${multiplier}
        WHERE "softwareId" = ${productId};
      `;

            // Step 3: Fetch the new lowest subscription price after the update
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

            // Step 4: If the new lowest price is lower than the old one, record a price drop and notify
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

                // Add a notification job for the price drop
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
