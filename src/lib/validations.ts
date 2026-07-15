import { z } from "zod";

export const tourTypeEnum = z.enum(["DAY_TRIP", "ACCOMMODATION"]);

export const itineraryStopTypeEnum = z.enum([
  "BOARDING",
  "STOP",
  "REST",
  "VIEWPOINT",
  "MEAL",
]);

export const itineraryItemSchema = z.object({
  dayNumber: z.number().int().min(1),
  stopType: itineraryStopTypeEnum,
  time: z.string().optional(),
  title: z.string().min(1, "Başlık gereklidir"),
  description: z.string().min(1, "Açıklama gereklidir"),
  duration: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const tourSchema = z.object({
  title: z.string().min(3, "Tur başlığı en az 3 karakter olmalıdır"),
  slug: z
    .string()
    .min(2, "Slug en az 2 karakter olmalıdır")
    .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  subtitle: z.string().optional(),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır"),
  shortDescription: z.string().optional(),
  type: tourTypeEnum,
  price: z.number().positive("Fiyat pozitif olmalıdır"),
  childPrice: z.number().positive().optional(),
  duration: z.string().optional(),
  distance: z.string().optional(),
  departureTime: z.string().optional(),
  returnTime: z.string().optional(),
  maxGroupSize: z.number().int().positive().optional(),
  highlights: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  includedServices: z.string().optional(),
  excludedServices: z.string().optional(),
  boardingPoints: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
  itinerary: z.array(itineraryItemSchema).optional(),
});

export type TourFormData = z.infer<typeof tourSchema>;

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const scheduleSchema = z
  .object({
    tourId: z.string().min(1, "Tur seçimi gereklidir"),
    startDate: z.string().min(1, "Başlangıç tarihi gereklidir"),
    endDate: z.string().optional(),
    capacity: z.number().int().positive("Kapasite en az 1 olmalıdır"),
    price: z.number().positive("Fiyat pozitif olmalıdır").optional(),
    childPrice: z.number().positive().optional(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: "Bitiş tarihi başlangıçtan önce olamaz", path: ["endDate"] }
  );

export type ScheduleFormData = z.infer<typeof scheduleSchema>;

export const bulkScheduleDateSchema = z.object({
  startDate: z.string().min(1),
  price: z.number().positive("Fiyat pozitif olmalıdır").optional(),
  childPrice: z.number().positive().optional(),
  capacity: z.number().int().positive("Kapasite en az 1 olmalıdır").optional(),
});

export const bulkScheduleSchema = z.object({
  tourId: z.string().min(1, "Tur seçimi gereklidir"),
  dates: z.array(bulkScheduleDateSchema).min(1, "En az bir tarih seçmelisiniz"),
  capacity: z.number().int().positive("Kapasite en az 1 olmalıdır"),
  isActive: z.boolean(),
});

export type BulkScheduleFormData = z.infer<typeof bulkScheduleSchema>;

export const reservationSchema = z.object({
  tourId: z.string().min(1, "Tur seçimi gereklidir"),
  scheduleId: z.string().min(1, "Tur tarihi seçimi gereklidir"),
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  phone: z
    .string()
    .min(10, "Geçerli bir telefon numarası giriniz")
    .regex(/^[\d\s+()-]+$/, "Geçerli bir telefon numarası giriniz"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  adultCount: z.number().int().min(1, "En az 1 yetişkin olmalıdır"),
  childCount: z.number().int().min(0),
  boardingPoint: z.string().optional(),
  note: z.string().max(1000).optional(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;

export const reservationStatusSchema = z.enum([
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);

export const reservationStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: reservationStatusSchema,
});

export type ReservationStatusUpdateData = z.infer<typeof reservationStatusUpdateSchema>;
