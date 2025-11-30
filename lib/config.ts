export const ROUTES = {
  STAFF_START: "/staff",
  PATIENT_START: "/patient",
  HOME: "/",
} as const;

export const ROLES = {
  STAFF: "staff",
  PATIENT: "patient",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
