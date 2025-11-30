import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { countries, languages } from "countries-list";
import { PatientFormValues } from "@/hooks/patient-form";

// Get country data
const countryList = Object.entries(countries).map(([code, country]) => ({
  code,
  name: country.name,
  languages: country.languages,
}));

// Extract unique language codes from all countries
const languageList = Object.entries(languages)
  .map(([code, data]) => ({
    code,
    name: data.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

type PatientFormProps = {
  form: UseFormReturn<PatientFormValues>;
  onSubmit: (values: PatientFormValues) => void;
  onInputFocus?: () => void;
  onKeyDown?: () => void;
  submitButtonText?: string;
  disabled?: boolean;
};

function PatientForm({
  form,
  onSubmit,
  onInputFocus,
  onKeyDown,
  submitButtonText = "Submit Form",
  disabled = false,
}: PatientFormProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* First Name - Required */}
      <div className="space-y-2">
        <Label htmlFor="firstName">
          First Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="firstName"
          placeholder="Enter first name"
          {...form.register("firstName")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.firstName && (
          <p className="text-sm text-red-500">
            {form.formState.errors.firstName.message}
          </p>
        )}
      </div>

      {/* Middle Name - Optional */}
      <div className="space-y-2">
        <Label htmlFor="middleName">Middle Name</Label>
        <Input
          id="middleName"
          placeholder="Enter middle name (optional)"
          {...form.register("middleName")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.middleName && (
          <p className="text-sm text-red-500">
            {form.formState.errors.middleName.message}
          </p>
        )}
      </div>

      {/* Last Name - Required */}
      <div className="space-y-2">
        <Label htmlFor="lastName">
          Last Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="lastName"
          placeholder="Enter last name"
          {...form.register("lastName")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.lastName && (
          <p className="text-sm text-red-500">
            {form.formState.errors.lastName.message}
          </p>
        )}
      </div>

      {/* Date of Birth - Required */}
      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">
          Date of Birth <span className="text-red-500">*</span>
        </Label>
        <Input
          id="dateOfBirth"
          type="date"
          {...form.register("dateOfBirth")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.dateOfBirth && (
          <p className="text-sm text-red-500">
            {form.formState.errors.dateOfBirth.message}
          </p>
        )}
      </div>

      {/* Gender - Required */}
      <div className="space-y-2">
        <Label htmlFor="gender">
          Gender <span className="text-red-500">*</span>
        </Label>
        <select
          id="gender"
          {...form.register("gender")}
          onFocus={onInputFocus}
          onChange={onKeyDown}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer-not-to-say">Prefer not to say</option>
        </select>
        {form.formState.errors.gender && (
          <p className="text-sm text-red-500">
            {form.formState.errors.gender.message}
          </p>
        )}
      </div>

      {/* Phone Number - Required */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter phone number"
          {...form.register("phone")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-red-500">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      {/* Email - Required */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          {...form.register("email")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-500">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Address - Required */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="address"
          placeholder="Enter full address"
          {...form.register("address")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-500">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      {/* Preferred Language - Required */}
      <div className="space-y-2">
        <Label htmlFor="preferredLanguage">
          Preferred Language <span className="text-red-500">*</span>
        </Label>
        <select
          id="preferredLanguage"
          {...form.register("preferredLanguage")}
          onFocus={onInputFocus}
          onChange={onKeyDown}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        >
          <option value="">Select preferred language</option>
          {languageList.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        {form.formState.errors.preferredLanguage && (
          <p className="text-sm text-red-500">
            {form.formState.errors.preferredLanguage.message}
          </p>
        )}
      </div>

      {/* Nationality - Required */}
      <div className="space-y-2">
        <Label htmlFor="nationality">
          Nationality <span className="text-red-500">*</span>
        </Label>
        <select
          id="nationality"
          {...form.register("nationality")}
          onFocus={onInputFocus}
          onChange={onKeyDown}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        >
          <option value="">Select nationality</option>
          {countryList.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        {form.formState.errors.nationality && (
          <p className="text-sm text-red-500">
            {form.formState.errors.nationality.message}
          </p>
        )}
      </div>

      {/* Emergency Contact Name - Optional */}
      <div className="space-y-2">
        <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
        <Input
          id="emergencyContactName"
          placeholder="Enter emergency contact name (optional)"
          {...form.register("emergencyContactName")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.emergencyContactName && (
          <p className="text-sm text-red-500">
            {form.formState.errors.emergencyContactName.message}
          </p>
        )}
      </div>

      {/* Emergency Contact Relationship - Optional */}
      <div className="space-y-2">
        <Label htmlFor="emergencyContactRelationship">
          Emergency Contact Relationship
        </Label>
        <Input
          id="emergencyContactRelationship"
          placeholder="Enter relationship (optional)"
          {...form.register("emergencyContactRelationship")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.emergencyContactRelationship && (
          <p className="text-sm text-red-500">
            {form.formState.errors.emergencyContactRelationship.message}
          </p>
        )}
      </div>

      {/* Religion - Optional */}
      <div className="space-y-2">
        <Label htmlFor="religion">Religion</Label>
        <Input
          id="religion"
          placeholder="Enter religion (optional)"
          {...form.register("religion")}
          onFocus={onInputFocus}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {form.formState.errors.religion && (
          <p className="text-sm text-red-500">
            {form.formState.errors.religion.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={disabled}>
        {submitButtonText}
      </Button>
    </form>
  );
}

export { PatientForm };
