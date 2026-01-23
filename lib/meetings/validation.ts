/**
 * Validation schemas لنظام الاجتماعات
 * باستخدام Zod للتحقق من البيانات
 */

import { z } from 'zod';

// Schema للأوقات المتاحة
export const getSlotsSchema = z.object({
  employee_id: z.string().uuid('معرف الموظف غير صالح'),
  start_date: z.string().datetime('تاريخ البداية غير صالح'),
  end_date: z.string().datetime('تاريخ النهاية غير صالح'),
  duration: z.number().optional(),
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}, {
  message: 'نطاق التاريخ يتجاوز 30 يوم',
});

// Schema لحجز اجتماع
export const bookMeetingSchema = z.object({
  employee_id: z.string().uuid('معرف الموظف غير صالح'),
  datetime: z.string().datetime('التاريخ والوقت غير صالح'),
  duration_minutes: z.number().refine(val => [15, 30, 60].includes(val), {
    message: 'المدة يجب أن تكون 15 أو 30 أو 60 دقيقة',
  }),
  client_name: z.string()
    .min(2, 'الاسم يجب أن يكون على الأقل حرفين')
    .max(100, 'الاسم يجب أن لا يتجاوز 100 حرف'),
  client_email: z.string().email('البريد الإلكتروني غير صالح'),
  client_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'رقم الهاتف غير صالح')
    .optional()
    .or(z.literal('')),
  client_company: z.string().max(100, 'اسم الشركة يجب أن لا يتجاوز 100 حرف').optional(),
  subject: z.string()
    .min(5, 'الموضوع يجب أن يكون على الأقل 5 أحرف')
    .max(200, 'الموضوع يجب أن لا يتجاوز 200 حرف'),
  notes: z.string().max(1000, 'الملاحظات يجب أن لا تتجاوز 1000 حرف').optional(),
  meeting_type_id: z.string().uuid('معرف نوع الاجتماع غير صالح').optional(),
  turnstile_token: z.string().optional(),
  idempotency_key: z.string().max(64).optional(),
});

// Schema لإلغاء اجتماع
export const cancelMeetingSchema = z.object({
  token: z.string().min(1, 'الرمز مطلوب'),
  reason: z.string().max(500, 'السبب يجب أن لا يتجاوز 500 حرف').optional(),
});

// Schema لإعادة جدولة اجتماع
export const rescheduleMeetingSchema = z.object({
  token: z.string().min(1, 'الرمز مطلوب'),
  new_datetime: z.string().datetime('التاريخ والوقت الجديد غير صالح'),
  reason: z.string().max(500, 'السبب يجب أن لا يتجاوز 500 حرف').optional(),
});

// Schema لإعدادات الموظف
export const employeeSettingsSchema = z.object({
  booking_slug: z.string()
    .min(3, 'الرابط يجب أن يكون على الأقل 3 أحرف')
    .max(50, 'الرابط يجب أن لا يتجاوز 50 حرف')
    .regex(/^[a-z0-9-]+$/, 'الرابط يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط')
    .optional(),
  slot_duration: z.union([z.literal(30), z.literal(60)]).optional(),
  buffer_before: z.number().min(0).max(60).optional(),
  buffer_after: z.number().min(0).max(60).optional(),
  max_advance_days: z.number().min(1).max(90).optional(),
  min_notice_hours: z.number().min(1).max(168).optional(),
  max_meetings_per_day: z.number().min(1).max(20).optional(),
  is_accepting_meetings: z.boolean().optional(),
  welcome_message: z.string().max(500).optional(),
});

// Schema لأوقات العمل
export const availabilitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'الوقت يجب أن يكون بصيغة HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'الوقت يجب أن يكون بصيغة HH:MM'),
  is_enabled: z.boolean(),
}).refine(data => {
  const [startH, startM] = data.start_time.split(':').map(Number);
  const [endH, endM] = data.end_time.split(':').map(Number);
  return (endH * 60 + endM) > (startH * 60 + startM);
}, {
  message: 'وقت النهاية يجب أن يكون بعد وقت البداية',
});

// دالة للتحقق من البيانات
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: string[] 
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map((e: z.ZodIssue) => e.message) 
      };
    }
    return { success: false, errors: ['خطأ في التحقق من البيانات'] };
  }
}

// أنواع مُصدّرة
export type GetSlotsInput = z.infer<typeof getSlotsSchema>;
export type BookMeetingInput = z.infer<typeof bookMeetingSchema>;
export type CancelMeetingInput = z.infer<typeof cancelMeetingSchema>;
export type RescheduleMeetingInput = z.infer<typeof rescheduleMeetingSchema>;
export type EmployeeSettingsInput = z.infer<typeof employeeSettingsSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
