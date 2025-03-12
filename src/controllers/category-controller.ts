import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';

export const getAllCategories = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const categories = await prisma.category.findMany();

        const categoriesWithProductCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await prisma.software.count({
                    where: {
                        categoryId: category.id,
                    },
                });

                return {
                    ...category,
                    productCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            data: categoriesWithProductCount,
        });
    }
);

export const getCategory = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const category = await prisma.category.findUnique({
            where: {
                id: req.params.id,
            },
        });

        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Category retrieved successfully',
            data: category,
        });
    }
);

export const createCategory = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { name, description } = req.body;

        const category = await prisma.category.create({
            data: {
                name: name,
                description: description,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category,
        });
    }
);

export const updateCategory = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { name, description } = req.body;

        const category = await prisma.category.update({
            where: {
                id: req.params.id,
            },
            data: {
                name: name,
                description: description,
            },
        });

        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    }
);

export const deleteCategory = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const category = await prisma.category.delete({
            where: {
                id: req.params.id,
            },
        });

        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: category,
        });
    }
);
