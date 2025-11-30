"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/config";

export default function ThankYouPage() {
  const handleClearSession = () => {
    // Clear patient ID from session storage
    sessionStorage.removeItem("patientId");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-linear-to-br from-green-50 to-blue-50">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-6">
            <svg
              className="w-16 h-16 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Thank You!</h1>
          <p className="text-gray-600">
            Your form has been submitted successfully. We&apos;ve received your
            information and will process it shortly.
          </p>
        </div>

        {/* Submission Details */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
          <p>
            You will receive a confirmation email shortly. If you have any
            questions, please don&apos;t hesitate to contact our support team.
          </p>
        </div>

        {/* Action Button */}
        <Link
          href={ROUTES.HOME}
          onClick={handleClearSession}
          className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-md font-medium transition-colors"
        >
          Go to Main Page
        </Link>

        {/* Additional Info */}
        <p className="text-xs text-gray-500">
          Your session has been saved. You can safely close this window.
        </p>
      </Card>
    </div>
  );
}