import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { UploadedFile } from 'express-fileupload';
import { uploadOnCloudinary } from '../lib/cloudinary';

export const getAllProducts = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
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
                price: true,
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
                                profile: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
                averageRating: true,
            },
        });

        let wishlistSoftwareIds = new Set<string>();

        if (req.user) {
            const productIds = products.map((product) => product.id);

            const wishlistEntries = await prisma.wishlist.findMany({
                where: {
                    userId: req.user.id,
                    softwareId: { in: productIds },
                },
                select: {
                    softwareId: true,
                },
            });

            wishlistEntries.forEach((entry) =>
                wishlistSoftwareIds.add(entry.softwareId)
            );
        }

        const productsWithWishlistFlag = products.map((product) => ({
            ...product,
            isWishlisted: wishlistSoftwareIds.has(product.id),
        }));

        res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            data: productsWithWishlistFlag,
        });
    }
);

export const getProduct = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const product = await prisma.software.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
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
            },
        });

        if (!product) {
            return next(new ErrorHandler('Product not found', 404));
        }

        let isWishlisted = false;
        let isInCart = false;
        // console.log('Yahan tk to aya h bhai ')
        if (req.user) {
            const wishlistEntry = await prisma.wishlist.findFirst({
                where: {
                    userId: req.user.id,
                    softwareId: req.params.id,
                },
            });
            // console.log("Wishlist Entry", wishlistEntry);
            const cartEntry = await prisma.cart.findFirst({
                where: {
                    userId: req.user.id,
                    softwareId: req.params.id,
                },
            });
            // console.log("Cart Entry", cartEntry);

            isWishlisted = Boolean(wishlistEntry);
            isInCart = Boolean(cartEntry);
        }

        res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: {
                ...product,
                isWishlisted,
                isInCart,
            },
        });
    }
);

export const createProduct = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const {
            name,
            description,
            price,
            features,
            requirements,
            categoryId,
            discount,
        } = req.body;

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
        const product = await prisma.software.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                features,
                requirements,
                discount: parseFloat(discount),
                filePath,
                category: {
                    connect: { id: categoryId },
                },
                seller: {
                    connect: { id: sellerProfile.id },
                },
            },
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
        const { name, description, price, features, requirements, discount } =
            req.body;

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
            },
        });

        if (!product) {
            return next(new ErrorHandler('Product not updated', 400));
        }

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product,
        });
    }
);

export const UpdateStatus = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
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
