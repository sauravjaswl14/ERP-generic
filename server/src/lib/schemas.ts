import { z } from 'zod';
import {
  AccountType,
  AttendanceStatus,
  EmployeeStatus,
  LeadStatus,
  LeaveType,
  Priority,
  ProjectStatus,
  RequestStatus,
  TaskStatus,
} from '@prisma/client';

const id = z.string().uuid();
const optId = id.optional().nullable();
const optStr = z.string().trim().min(1).optional().nullable();
const str = z.string().trim().min(1);
const money = z.coerce.number().min(0);
const optDate = z.coerce.date().optional().nullable();
const optEmail = z.string().trim().email().optional().nullable();

export const departmentSchema = z.object({
  code: str,
  name: str,
  description: optStr,
});

export const employeeSchema = z.object({
  code: str,
  firstName: str,
  lastName: str,
  email: z.string().trim().email(),
  phone: optStr,
  position: str,
  hireDate: z.coerce.date(),
  salary: money,
  status: z.nativeEnum(EmployeeStatus).default('ACTIVE'),
  departmentId: optId,
  managerId: optId,
});

export const leaveSchema = z.object({
  employeeId: id,
  type: z.nativeEnum(LeaveType).default('ANNUAL'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.nativeEnum(RequestStatus).default('PENDING'),
  reason: optStr,
});

export const attendanceSchema = z.object({
  employeeId: id,
  date: z.coerce.date(),
  checkIn: optDate,
  checkOut: optDate,
  status: z.nativeEnum(AttendanceStatus).default('PRESENT'),
});

export const customerSchema = z.object({
  name: str,
  email: optEmail,
  phone: optStr,
  address: optStr,
  taxId: optStr,
  creditLimit: money.default(0),
});

export const leadSchema = z.object({
  name: str,
  company: optStr,
  email: optEmail,
  phone: optStr,
  source: optStr,
  status: z.nativeEnum(LeadStatus).default('NEW'),
  value: money.default(0),
  notes: optStr,
  ownerId: optId,
});

export const supplierSchema = z.object({
  name: str,
  email: optEmail,
  phone: optStr,
  address: optStr,
  taxId: optStr,
});

export const productSchema = z.object({
  sku: str,
  name: str,
  category: optStr,
  description: optStr,
  unit: str.default('pcs'),
  unitPrice: money.default(0),
  costPrice: money.default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const warehouseSchema = z.object({
  code: str,
  name: str,
  location: optStr,
});

export const accountSchema = z.object({
  code: str,
  name: str,
  type: z.nativeEnum(AccountType),
  description: optStr,
  isActive: z.coerce.boolean().default(true),
});

export const projectSchema = z.object({
  code: str,
  name: str,
  description: optStr,
  status: z.nativeEnum(ProjectStatus).default('PLANNING'),
  startDate: optDate,
  endDate: optDate,
  budget: money.default(0),
  managerId: optId,
});

export const taskSchema = z.object({
  projectId: id,
  title: str,
  description: optStr,
  status: z.nativeEnum(TaskStatus).default('TODO'),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  assigneeId: optId,
  dueDate: optDate,
});
