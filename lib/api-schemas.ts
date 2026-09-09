/**
 * Schemas (Zod) لكل مدخلات الـ API — تحقق صارم قبل أي معالجة.
 */
import { z } from "zod";

/** enum بنوع literal صحيح للتخزين */
const questionTypeSchema = z.enum(["MCQ", "TRUE_FALSE", "MATCHING", "ORDERING"]);

export const generateExamSchema = z.object({
  title: z.string().trim().min(3).max(80),
  subject: z.string().trim().min(2).max(40),
  topics: z
    .array(z.string().trim().min(2).max(60))
    .min(1)
    .max(10)
    .refine((v) => new Set(v).size === v.length, "الوحدات يجب أن تكون مختلفة"),
  generationSource: z.enum(["bank", "ai"]).default("bank"),
  subtopic: z.string().trim().max(60).optional().nullable(),
  questionTypes: z
    .array(questionTypeSchema)
    .min(1)
    .max(4)
    .refine((v) => new Set(v).size === v.length, "أنواع الأسئلة يجب أن تكون مختلفة"),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  questionCount: z.number().int().min(3).max(40).default(10),
});

export const examStatusSchema = z.object({
  status: z.enum(["published", "closed"]),
});

export const examMetaSchema = z.object({
  title: z.string().trim().min(3).max(80).optional(),
  showResult: z.boolean().optional(),
  whatsappMessage: z.string().max(300).optional().nullable(),
});

export const questionPayloadSchema = z.object({
  examId: z.string().min(8),
  type: questionTypeSchema,
  question: z.string().trim().min(5).max(500),
  data: z.record(z.string(), z.unknown()),
  correctAnswer: z.unknown(),
  solution: z.string().max(1000).optional().nullable(),
  points: z.number().positive().max(20).default(1),
});

export const questionEditSchema = z.object({
  question: z.string().trim().min(5).max(500),
  data: z.record(z.string(), z.unknown()),
  correctAnswer: z.unknown(),
  solution: z.string().max(1000).optional().nullable(),
  points: z.number().positive().max(20),
});

export const reorderSchema = z.object({
  examId: z.string().min(8),
  orderedIds: z.array(z.string().min(8)).min(1).max(200),
});

export const submitAttemptSchema = z.object({
  examCode: z.string().trim().min(4).max(20),
  studentName: z.string().trim().min(2).max(60),
  studentPhone: z
    .string()
    .trim()
    .regex(/^\+?\d{8,15}$/, "رقم واتساب غير صالح"),
  answers: z.record(z.string(), z.unknown()).optional(),
});

export const authMeSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().max(100).optional(),
});
