"use client";

import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const patientFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(5, "Phone must be at least 5 characters"),
  email: z.email("Invalid email"),
  address: z.string().min(1, "Address is required"),
  preferredLanguage: z.string().min(1, "Preferred language is required"),
  nationality: z.string().min(1, "Nationality is required"),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  religion: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

const defaultFormValues: PatientFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  preferredLanguage: "",
  nationality: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  religion: "",
};

export function usePatientForm(
  initialValues?: Partial<PatientFormValues>
): UseFormReturn<PatientFormValues> {
  return useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      ...defaultFormValues,
      ...initialValues,
    },
  });
}