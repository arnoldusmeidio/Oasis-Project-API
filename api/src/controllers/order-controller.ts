import { NextFunction, Request, Response } from "express";
import prisma from "@/prisma";
import { RequestWithUserId } from "@/types";
import fs from "fs/promises";
import { Resend } from "resend";
import handlebars from "handlebars";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function getBookingsTenant(req: RequestWithUserId, res: Response, next: NextFunction) {
   try {
      let locale = req.cookies.NEXT_LOCALE;
      const id = (req as RequestWithUserId).user?.id;
      const user = await prisma.user.findUnique({
         where: { id, tenant: { id } },
      });

      if (!user)
         return res
            .status(404)
            .json({ message: locale == "id" ? "User tidak ditemukan" : "User not found", ok: false });

      const property = await prisma.property.findMany({
         where: { tenantId: user.id },
         include: { room: { include: { bookings: true } } },
      });

      if (!property) {
         return res.status(200).json({
            data: property,
            message: locale == "id" ? "Booking tidak ditemukan" : "Booking not found",
            ok: true,
         });
      }

      return res.status(200).json({ data: property, ok: true });
   } catch (error) {
      next(error);
   }
}

export async function getBookingPictureUrlByBookingNumber(req: RequestWithUserId, res: Response, next: NextFunction) {
   try {
      let locale = req.cookies.NEXT_LOCALE;
      const id = (req as RequestWithUserId).user?.id;
      const user = await prisma.user.findUnique({
         where: { id, tenant: { id } },
      });

      if (!user)
         return res
            .status(404)
            .json({ message: locale == "id" ? "User tidak ditemukan" : "User not found", ok: false });

      const { bookingNumber } = req.params;

      const booking = await prisma.booking.findUnique({
         where: { bookingNumber, paymentType: "MANUAL" },
         include: { room: { include: { property: true } }, customer: { include: { user: true } } },
      });

      if (!booking) {
         return res.status(404).json({
            message: locale == "id" ? "Booking tidak ditemukan" : "Booking not found",
            ok: false,
         });
      }

      if (booking.room.property.tenantId !== user.id) {
         return res.status(401).json({
            message: locale == "id" ? "Tidak ada akses" : "Unauthorized",
            ok: false,
         });
      }

      if (!booking?.pictureUrl) {
         return res.status(404).json({
            message: locale == "id" ? "Gambar tidak ditemukan" : "Picture not found",
            ok: false,
         });
      }

      return res.status(200).json({ data: booking, ok: true });
   } catch (error) {
      next(error);
   }
}

export async function approveManualTransferPayment(req: RequestWithUserId, res: Response, next: NextFunction) {
   try {
      let locale = req.cookies.NEXT_LOCALE;
      const id = (req as RequestWithUserId).user?.id;
      const user = await prisma.user.findUnique({
         where: { id, tenant: { id } },
      });

      if (!user)
         return res
            .status(404)
            .json({ message: locale == "id" ? "User tidak ditemukan" : "User not found", ok: false });

      const { bookingNumber, code } = req.params;

      const booking = await prisma.booking.findUnique({
         where: { bookingNumber, paymentType: "MANUAL", paymentStatus: "PROCESSING" },
         include: { customer: { include: { user: true } }, room: { include: { property: true } } },
      });

      if (!booking) {
         return res.status(404).json({
            message: locale == "id" ? "Booking tidak ditemukan" : "Booking not found",
            ok: false,
         });
      }

      if (booking.room.property.tenantId !== user.id) {
         return res.status(401).json({
            message: locale == "id" ? "Tidak ada akses" : "Unauthorized",
            ok: false,
         });
      }

      if (!booking?.pictureUrl) {
         return res.status(404).json({
            message: locale == "id" ? "Gambar tidak ditemukan" : "Picture not found",
            ok: false,
         });
      }

      if (code === "1") {
         await prisma.$transaction(async (tx) => {
            await tx.booking.update({
               where: { bookingNumber: booking.bookingNumber },
               data: { paymentStatus: "APPROVED" },
            });

            const templatePath = path.join(__dirname, "../templates", "tenant-confirm-template.hbs");
            const templateSource = await fs.readFile(templatePath, "utf-8");
            const compiledTemplate = handlebars.compile(templateSource);
            const html = compiledTemplate({
               name: booking.customer.user.name,
               bookingNumber: booking.bookingNumber,
            });

            const { error } = await resend.emails.send({
               from: "Oasis <booking@oasis-resort.xyz>",
               to: [booking.customer.user.email],
               subject: "(OASIS) Payment Approval",
               html: html,
            });
            if (error) {
               return res
                  .status(400)
                  .json({ message: locale == "id" ? "Terjadi kesalahan" : "Something went wrong", ok: false });
            }

            if (error) {
               return res
                  .status(400)
                  .json({ message: locale == "id" ? "Terjadi kesalahan" : "Something went wrong", ok: false });
            }
         });
         return res
            .status(200)
            .json({ message: locale == "id" ? "Booking berhasil dikonfirmasi." : "Booking confirmed.", ok: true });
      } else if (code === "0") {
         await prisma.booking.update({
            where: { bookingNumber: booking.bookingNumber },
            data: { paymentStatus: "PENDING" },
         });
         return res.status(200).json({
            message: locale == "id" ? "Booking berhasil dibatalkan." : "Booking successfully canceled.",
            ok: true,
         });
      } else {
         return res.status(400).json({
            message: locale == "id" ? "Request tidak diterima" : "Bad Request",
            ok: false,
         });
      }
   } catch (error) {
      next(error);
   }
}

export async function deleteBookingByBookingNumberTenant(req: RequestWithUserId, res: Response, next: NextFunction) {
   try {
      let locale = req.cookies.NEXT_LOCALE;
      const id = (req as RequestWithUserId).user?.id;
      const user = await prisma.user.findUnique({
         where: { id, tenant: { id } },
      });

      if (!user)
         return res
            .status(404)
            .json({ message: locale == "id" ? "User tidak ditemukan" : "User not found", ok: false });

      const { bookingNumber } = req.params;

      const booking = await prisma.booking.findUnique({
         where: { bookingNumber, paymentStatus: "PENDING" },
         include: { room: { include: { property: true } } },
      });

      if (!booking) {
         return res.status(404).json({
            message: locale == "id" ? "Booking tidak ditemukan" : "Booking not found",
            ok: false,
         });
      }

      if (booking.room.property.tenantId !== user.id) {
         return res.status(401).json({
            message: locale == "id" ? "Tidak ada akses" : "Unauthorized",
            ok: false,
         });
      }

      await prisma.booking.delete({
         where: { bookingNumber, paymentStatus: "PENDING" },
      });

      return res.status(200).json({ message: locale == "id" ? "Booking dibatalkan" : "Booking Rejected", ok: true });
   } catch (error) {
      next(error);
   }
}
