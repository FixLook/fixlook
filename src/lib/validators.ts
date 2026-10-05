import { z } from "zod";
z.setErrorMap(() => ({ message: "Skontrolujte zadanú hodnotu." }));
const name = z.string().trim().min(2, "Zadajte celé meno.").max(100, "Meno je príliš dlhé.");
const phone = z.string().trim().min(5, "Zadajte telefónne číslo.").max(30, "Telefónne číslo je príliš dlhé.");
const city = z.string().trim().min(2, "Zadajte mesto.").max(100, "Názov mesta je príliš dlhý.");
export const signUpSchema = z.object({
  fullName: name, email: z.string().trim().email("Zadajte platný e-mail."),
  password: z.string().min(8, "Heslo musí mať aspoň 8 znakov.").max(128, "Heslo môže mať najviac 128 znakov."),
  phone, city, role: z.enum(["customer", "master"], { message: "Vyberte typ účtu." })
});
export const signInSchema = z.object({ email: z.string().trim().email("Zadajte platný e-mail."), password: z.string().min(1, "Zadajte heslo.") });
export const orderSchema = z.object({
  serviceId: z.coerce.number().int().positive("Vyberte službu."),
  problemDescription: z.string().trim().min(10, "Opíšte problém aspoň 10 znakmi.").max(4000, "Popis môže mať najviac 4 000 znakov."),
  address: z.string().trim().min(5, "Zadajte úplnú adresu.").max(300, "Adresa je príliš dlhá."), city,
  preferredDatetime: z.string().optional()
});
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Zadajte názov služby.").max(100), description: z.string().trim().max(2000).optional(),
  basePrice: z.coerce.number().min(0, "Cena nesmie byť záporná.").max(100000),
  estimateMax: z.preprocess(v => v === "" || v === null ? undefined : v, z.coerce.number().min(0).max(100000).optional()),
  active: z.boolean()
}).refine(v => v.estimateMax === undefined || v.estimateMax >= v.basePrice, { message: "Horný odhad nesmie byť nižší než dolný.", path: ["estimateMax"] });
export const masterProfileSchema = z.object({ description: z.string().trim().min(10, "Opíšte svoje skúsenosti aspoň 10 znakmi.").max(4000), hourlyRate: z.coerce.number().min(1, "Zadajte hodinovú sadzbu.").max(100000), available: z.boolean() });
export const ratingSchema = z.object({ orderId: z.string().uuid("Neplatná objednávka."), stars: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(2000, "Hodnotenie môže mať najviac 2 000 znakov.").optional() });
export const profileSchema = z.object({ fullName: name, phone, city });
export const uuidSchema = z.string().uuid();
