import type { Infer } from "convex/values";
import type { defaultDocumentConfigValidator } from "../lib/defaultDocuments";

// One-time migration data. Runtime requirements live in the configuration tables.
export const LEGACY_APPLICATION_DOCUMENTS = [
  {
    documentTypeId: "arrival_departure_dates",
    name: "Arrival and Departure Dates Coordination",
    visibility: "required",
    description: "English",
  },
  {
    documentTypeId: "athletic_permission_parent",
    name: "Athletic Participation Permission Form",
    visibility: "required",
    description: "Fill-Up by Parent",
  },
  {
    documentTypeId: "athletic_permission_physician",
    name: "Athletic Participation Permission Form",
    visibility: "required",
    description: "Fill-Up by Physician",
  },
  {
    documentTypeId: "birth_certificate",
    name: "Birth Certificate",
    visibility: "required",
  },
  {
    documentTypeId: "medical_insurance",
    name: "Copy of Medical Insurance",
    visibility: "required",
    description: "Must be valid in USA",
  },
  {
    documentTypeId: "social_security",
    name: "Copy of Social Security Number",
    visibility: "required",
  },
  {
    documentTypeId: "visa",
    name: "Copy of Visa",
    visibility: "required",
  },
  {
    documentTypeId: "father_id",
    name: "Father ID or Passport",
    visibility: "required",
  },
  {
    documentTypeId: "federal_scholarship",
    name: "Federal Scholarship Evidence",
    visibility: "optional",
  },
  {
    documentTypeId: "scholarship_award",
    name: "Scholarship Award Letter",
    visibility: "optional",
  },
  {
    documentTypeId: "housing_rules",
    name: "Housing Rules",
    visibility: "required",
  },
  {
    documentTypeId: "i20_letter",
    name: "I-20 and Letter",
    visibility: "required",
  },
  {
    documentTypeId: "i20_form",
    name: "I-20 Form",
    visibility: "required",
  },
  {
    documentTypeId: "immunization_record",
    name: "Immunization Record (DH 680)",
    visibility: "required",
    description: "All Vaccination Records",
  },
  {
    documentTypeId: "legal_guardian_id",
    name: "Legal Guardian ID",
    visibility: "optional",
  },
  {
    documentTypeId: "mother_id",
    name: "Mother ID or Passport",
    visibility: "required",
  },
  {
    documentTypeId: "official_transcript",
    name: "Official Transcript",
    visibility: "required",
  },
  {
    documentTypeId: "passport",
    name: "Passport (I-20 Students)",
    visibility: "required",
  },
  {
    documentTypeId: "student_id",
    name: "Student's ID or Green Card",
    visibility: "required",
    description: "Proof of Citizenship / Residency",
  },
] satisfies Infer<typeof defaultDocumentConfigValidator>[];
