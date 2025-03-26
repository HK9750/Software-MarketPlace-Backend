// import { Request, Response, NextFunction } from 'express';
// import { v4 as uuid } from 'uuid';
// import prisma from '../lib/prisma';
// import AsyncErrorHandler from '../utils/async-handler';
// import ErrorHandler from '../utils/error-handler';

// interface AuthenticatedRequest extends Request {
//     user: { id: string };
// }

// export const createOrder = AsyncErrorHandler(
//     async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//         const { softwareId, totalAmount } = req.body;
//         if (!softwareId || !totalAmount) {
//             return next(
//                 new ErrorHandler('softwareId and totalAmount are required', 400)
//             );
//         }
//         const { id: userId } = req.user;
//         const order = await prisma.order.create({
//             data: { userId, softwareId, totalAmount },
//         });
//         res.status(201).json({ success: true, data: order });
//     }
// );

// export const getAllOrders = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const orders = await prisma.order.findMany({
//                 include: { items: true },
//             });
//             res.status(200).json({ success: true, data: orders });
//         } catch (error: any) {
//             return next(new ErrorHandler(error.message, 500));
//         }
//     }
// );

// export const getUserOrderHistory = AsyncErrorHandler(
//     async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//         const { id: userId } = req.params;
//         if (!userId) {
//             return next(new ErrorHandler('User ID is required', 400));
//         }
//         const orders = await prisma.userOrderHistory.findMany({
//             where: { userId },
//             include: { order: { include: { items: true } } },
//         });
//         res.status(200).json({ success: true, data: orders });
//     }
// );

// export const getOrder = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         const order = await prisma.order.findUnique({
//             where: { id: orderId },
//             include: { items: true },
//         });
//         if (!order) return next(new ErrorHandler('Order not found', 404));
//         res.status(200).json({ success: true, data: order });
//     }
// );

// export const updateOrderStatus = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         const { status } = req.body;
//         if (!status) {
//             return next(new ErrorHandler('Status is required', 400));
//         }
//         const order = await prisma.order.update({
//             where: { id: orderId },
//             data: { status },
//         });
//         res.status(200).json({ success: true, data: order });
//     }
// );

// export const deleteOrder = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         await prisma.order.delete({ where: { id: orderId } });
//         res.status(204).json({ success: true, data: null });
//     }
// );

// export const addOrderItem = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const { orderId, softwareId, price } = req.body;
//         if (!orderId || !softwareId || !price) {
//             return next(
//                 new ErrorHandler(
//                     'orderId, softwareId and price are required',
//                     400
//                 )
//             );
//         }
//         const orderItem = await prisma.orderItem.create({
//             data: { orderId, softwareId, price },
//         });
//         res.status(201).json({ success: true, data: orderItem });
//     }
// );

// export const createOrderWithItems = AsyncErrorHandler(
//     async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//         const { id: userId } = req.user;
//         const { items, totalAmount } = req.body;
//         if (!Array.isArray(items) || items.length === 0) {
//             return next(
//                 new ErrorHandler('At least one order item is required', 400)
//             );
//         }
//         if (!totalAmount) {
//             return next(new ErrorHandler('Total amount is required', 400));
//         }
//         if (!items[0].softwareId) {
//             return next(
//                 new ErrorHandler(
//                     'Main softwareId is required in the first item',
//                     400
//                 )
//             );
//         }
//         const orderWithItems = await prisma.$transaction(async (tx) => {
//             const order = await tx.order.create({
//                 data: {
//                     userId,
//                     softwareId: items[0].softwareId,
//                     totalAmount,
//                     status: 'PENDING',
//                 },
//             });
//             const createdItems = await Promise.all(
//                 items.map(async (item: any) => {
//                     if (!item.softwareId || !item.price) {
//                         throw new ErrorHandler(
//                             'Each order item must include softwareId and price',
//                             400
//                         );
//                     }
//                     return tx.orderItem.create({
//                         data: {
//                             orderId: order.id,
//                             softwareId: item.softwareId,
//                             price: item.price,
//                             LicenseKey: {
//                                 create: {
//                                     key: uuid(),
//                                     softwareId: item.softwareId,
//                                     userId,
//                                     validUntil: new Date(
//                                         Date.now() + 365 * 24 * 60 * 60 * 1000
//                                     ),
//                                 },
//                             },
//                         },
//                         include: { LicenseKey: true },
//                     });
//                 })
//             );
//             await tx.userOrderHistory.create({
//                 data: { userId, orderId: order.id },
//             });
//             return { order, items: createdItems };
//         });
//         res.status(201).json({ success: true, data: orderWithItems });
//     }
// );

// export const cancelOrderWithRefund = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         const result = await prisma.$transaction(async (tx) => {
//             const order = await tx.order.update({
//                 where: { id: orderId },
//                 data: { status: 'CANCELLED' },
//                 include: { items: true },
//             });
//             if (order.items.length) {
//                 await tx.licenseKey.updateMany({
//                     where: {
//                         orderItemId: { in: order.items.map((i) => i.id) },
//                     },
//                     data: { isExpired: true, validUntil: new Date() },
//                 });
//             }
//             const refund = await tx.payment.create({
//                 data: {
//                     transactionId: uuid(),
//                     amount: order.totalAmount,
//                     method: 'REFUND',
//                     status: 'COMPLETED',
//                     userId: order.userId,
//                     orderId: order.id,
//                 },
//             });
//             return { order, refund };
//         });
//         res.status(200).json({ success: true, data: result });
//     }
// );
