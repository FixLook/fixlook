import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().min(5, "Phone is required."),
  city: z.string().min(2, "City is required."),
  role: z.enum(["customer", "master"])
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required.")
});

export const orderSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  problemDescription: z.string().min(10, "Describe the issue in more detail."),
  address: z.string().min(5, "Address is required."),
  city: z.string().min(2, "City is required."),
  preferredDatetime: z.string().optional()
});

export const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(1),
  active: z.coerce.boolean().default(true)
});

export const masterProfileSchema = z.object({
  description: z.string().min(10),
  hourlyRate: z.coerce.number().min(1),
  available: z.coerce.boolean().default(false)
});

export const ratingSchema = z.object({
  orderId: z.string().uuid(),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional()
});

export const finalPriceSchema = z.object({
  orderId: z.string().uuid(),
  finalPrice: z.coerce.number().min(1)
});

export const profileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  city: z.string().min(2)
});
