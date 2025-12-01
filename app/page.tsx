"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const roleOptions = [
  {
    href: ROUTES.STAFF_START,
    title: "Staff Member",
    description: "Access patient dashboard and monitor form submissions in real-time",
    icon: "👨‍⚕️",
    color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  },
  {
    href: ROUTES.PATIENT_START,
    title: "Patient",
    description: "Fill out your medical form and track submission progress",
    icon: "🏥",
    color: "bg-green-50 hover:bg-green-100 border-green-200",
  },
];

export default function Home() {
  // Clear session storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("patientId");
      sessionStorage.removeItem("staffId");
    }
  }, []);

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-6 bg-linear-to-br from-blue-50 to-purple-50">
      <main className="w-full max-w-2xl text-center space-y-8">
        {/* Logo/Branding */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Image
              className="dark:invert"
              src="/hospital-icon.png"
              alt="Agnos logo"
              width={100}
              height={100}
              priority
            />
          </div>
        </div>

        {/* Welcome Section */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Welcome to Agnos
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            A real-time patient form monitoring system for healthcare professionals
          </p>
        </div>

        {/* Role Selection Box */}
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Select Your Role
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Choose how you&apos;d like to continue
            </p>
          </div>

          {/* Role Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleOptions.map((option) => (
              <Link
                key={option.href}
                href={option.href}
                className={cn(
                  "flex flex-col items-center text-center p-6 rounded-lg border-2",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-4 focus:ring-blue-500/50",
                  option.color
                )}
                aria-label={`Select ${option.title} role`}
              >
                <span className="text-5xl mb-4" role="img" aria-hidden="true">
                  {option.icon}
                </span>
                <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
                <p className="text-sm text-gray-600">{option.description}</p>
              </Link>
            ))}
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 text-center mt-6">
            You can change your role at any time from the main page
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>© 2025 Agnos. Built with Next.js</p>
      </footer>
    </div>
  );
}