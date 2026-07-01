// fortrust-frontend/src/lib/countryRequirements.ts
// Master configuration for country-specific application requirements.
// Encodes every requirement, photo spec, translation rule, and downloadable form
// per country, derived from Mami's Fortrust 2.0 spec.

export type CountryCode = "usa" | "australia" | "canada" | "china" | "malaysia" | "new_zealand" | "singapore" | "switzerland" | "uk";

export interface PhotoSpec {
  dimensions: string;            // "50 x 50 mm"
  background: string;            // "White or off-white"
  headHeight: string;            // "25-35 mm"
  glassesAllowed: "no" | "yes" | "no-reflection";
  earsVisible?: boolean;
  noWhiteShirt?: boolean;
  digitalFormats: string[];      // [".jpg", ".jpeg"]
  hardCopiesRequired: number;    // 0, 4, etc.
  notes?: string;
}

export type TranslationType = "none" | "sworn" | "agent-certified" | "non-bilingual-only";

export interface DocumentRequirement {
  id: string;                    // Stable ID — used as filename prefix
  category: "identity" | "family" | "passport" | "compliance" | "academic" | "language" | "work" | "financial" | "visa-form" | "postal" | "under18";
  name: string;
  description: string;
  required: boolean;
  needsTranslation?: TranslationType;
  needsApostille?: boolean;
  hasDownloadableForm?: boolean;
  formId?: string;               // Maps to /api/templates/{formId}
  conditionalOn?: "under18" | "postgrad" | "grad" | "non-bilingual-birth-cert" | "criminal-yes";
  multipleFiles?: boolean;       // E.g. 6 rapot files, multi-page scans
  notes?: string;
}

export interface CountryRequirements {
  code: CountryCode;
  name: string;
  flag: string;
  photo: PhotoSpec;
  documents: DocumentRequirement[];
  specialNotes?: string[];
}

// ============================================================
// SHARED DOCUMENT SETS — used across multiple countries
// ============================================================

const UNIVERSAL_DOCS: DocumentRequirement[] = [
  { id: "passport_biodata", category: "passport", name: "Passport (Biodata + Signature page)", description: "Agent-certified copy of biodata and signature pages", required: true, needsTranslation: "agent-certified", multipleFiles: true },
  { id: "passport_expiry", category: "passport", name: "Passport Expiry Date Confirmation", description: "Must be valid for at least 6 months past intended stay", required: true },
  { id: "birth_cert", category: "family", name: "Birth Certificate", description: "Original + English translation (sworn translation required if non-bilingual)", required: true, needsTranslation: "non-bilingual-only" },
  { id: "academic_transcripts", category: "academic", name: "Examination Certificates and Transcripts", description: "Agent-certified original + sworn English translation. Multiple semesters expected.", required: true, needsTranslation: "sworn", multipleFiles: true },
  { id: "language_test", category: "language", name: "Language Test Results (IELTS/TOEFL/PTE/HSK)", description: "Official test certificate. For TOEFL: include username & password for verification.", required: true },
  { id: "sop", category: "academic", name: "Statement of Purpose (SOP)", description: "Usually required for gap-year bachelor, grad, and postgrad applications", required: false, hasDownloadableForm: true, formId: "sop_template" },
  { id: "cv_resume", category: "academic", name: "CV / Resume", description: "Usually for bachelor (gap year), grad, and postgrad applications", required: false, conditionalOn: "postgrad" },
  { id: "reference_letter", category: "work", name: "Reference Letters", description: "Undergrad: 0-2 letters from teachers/counselors. Grad/Postgrad: 2-3 letters from professors or work supervisors.", required: false, multipleFiles: true },
  { id: "referees", category: "academic", name: "Referees (Names & Contact)", description: "Minimum 2 referees with name, institution, position, contact details", required: true },
];

const COMPLIANCE_DOCS: DocumentRequirement[] = [
  { id: "criminal_record_check", category: "compliance", name: "Criminal Record Self-Declaration", description: "Have you ever had a criminal record? Yes/No", required: true },
  { id: "no_criminal_commitment", category: "compliance", name: "No Criminal Record Commitment", description: "Download blank form, fill, then upload signed copy", required: false, hasDownloadableForm: true, formId: "no_criminal_record_commitment" },
  { id: "anti_drug_commitment", category: "compliance", name: "Anti-Drug Commitment", description: "Download blank form, fill, then upload signed copy", required: false, hasDownloadableForm: true, formId: "anti_drug_commitment" },
  { id: "financial_supporter", category: "financial", name: "Financial Supporter Declaration", description: "Identify supporter (Dad/Mom/Government/Other). Required for visa.", required: true },
  { id: "financial_support_statement", category: "financial", name: "Statement of Financial Support", description: "Download blank form, fill, then upload signed copy", required: true, hasDownloadableForm: true, formId: "financial_support_statement" },
  { id: "financial_consent_letter", category: "financial", name: "Financial Support & Consent Letter", description: "Required for applicants under 18 years old", required: false, hasDownloadableForm: true, formId: "financial_support_consent_letter", conditionalOn: "under18" },
  { id: "health_status", category: "compliance", name: "Health Status & Physical Examination", description: "Download Physical Examination Record for Foreigner + Foreigner Physical Examination Form Statement. Bring to hospital, fill, then upload.", required: true, hasDownloadableForm: true, formId: "physical_examination_record" },
];

const CHINA_SPECIFIC_DOCS: DocumentRequirement[] = [
  { id: "ethnic_chinese_q", category: "compliance", name: "Ethnic Chinese Declaration", description: "Are you Ethnic Chinese? (Chinese descent + born in host country + acquired host nationality)", required: true },
  { id: "current_location_china_q", category: "compliance", name: "Current Location (in mainland China?)", description: "Yes/No declaration", required: true },
  { id: "china_immigration_q", category: "compliance", name: "Immigration from CN/HK/Macau/Taiwan", description: "Yes if born there or once held Chinese citizenship", required: true },
  { id: "skck_apostilled", category: "compliance", name: "SKCK (Police Clearance with Apostille)", description: "Indonesian Police Clearance Certificate. Apostille required for China.", required: true, needsApostille: true },
  { id: "china_visa_form", category: "visa-form", name: "China Visa Form", description: "Download blank China visa application form, fill it in completely", required: true, hasDownloadableForm: true, formId: "china_visa_form" },
  { id: "jw2_form", category: "visa-form", name: "JW2 Form", description: "University sends this AFTER you accept their offer letter. Upload upon receipt.", required: true, notes: "Comes from university post-acceptance" },
  { id: "chinese_lang_q", category: "language", name: "Chinese Language: Studied in China?", description: "Online or offline at any institution in China — Yes/No", required: true },
  { id: "chinese_work_q", category: "work", name: "Chinese Language: Worked in China?", description: "Yes/No", required: true },
  { id: "passport_china_old", category: "passport", name: "Old Passport (Last 10 Years)", description: "Pages with biodata, stamps, and visas. Format: .jpg/.jpeg only.", required: true, multipleFiles: true, notes: "China retains the original passport during processing" },
  { id: "postal_address_china", category: "postal", name: "Postal Address for Admission Notice", description: "Address must be valid for at least 3 months. English address + postal code if international.", required: true },
];

const UNDER_18_BASE: DocumentRequirement[] = [
  { id: "u18_parent_consent", category: "under18", name: "Parent Consent Letter", description: "Signed by both parents", required: true, conditionalOn: "under18" },
  { id: "u18_guardian_details", category: "under18", name: "Guardian Details / Custodianship", description: "School, relative, or appointed guardian", required: true, conditionalOn: "under18" },
  { id: "u18_guardian_auth", category: "under18", name: "Guardian Authorization Letter", description: "Authorization signed by guardian", required: true, conditionalOn: "under18" },
  { id: "u18_guardian_id", category: "under18", name: "Guardian ID / Passport Copy", description: "Identity document of appointed guardian", required: true, conditionalOn: "under18" },
  { id: "u18_school_admission_age", category: "under18", name: "School Admission Letter (with student age)", description: "Letter from school clearly stating student's age", required: true, conditionalOn: "under18" },
];

// Family card translation rules — varies per country
const familyCardDoc = (translation: TranslationType, apostille: boolean): DocumentRequirement => ({
  id: "family_card",
  category: "family",
  name: "Family Card (Kartu Keluarga)",
  description: "Original copy" + (translation === "none" ? " (no translation needed)" : ` + ${translation === "sworn" ? "sworn English translation" : "agent-certified English translation"}`) + (apostille ? ". Apostille required." : ""),
  required: true,
  needsTranslation: translation,
  needsApostille: apostille,
});

// ============================================================
// COUNTRY-SPECIFIC CONFIGURATIONS
// ============================================================

export const COUNTRY_REQUIREMENTS: Record<CountryCode, CountryRequirements> = {
  usa: {
    code: "usa",
    name: "United States",
    flag: "🇺🇸",
    photo: {
      dimensions: "50 x 50 mm",
      background: "White or off-white",
      headHeight: "25-35 mm",
      glassesAllowed: "no",
      earsVisible: true,
      digitalFormats: [".jpg"],
      hardCopiesRequired: 4,
      notes: "Latest picture (never used before for any other application)",
    },
    documents: [
      familyCardDoc("sworn", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
      { id: "us_i20", category: "under18", name: "School-issued I-20", description: "MANDATORY for under-18 students applying to US institutions", required: true, conditionalOn: "under18" },
      { id: "us_caaw", category: "under18", name: "Confirmation of Appropriate Accommodation & Welfare (CAAW)", description: "Issued by the school OR parent/legal guardian accompanies student", required: true, conditionalOn: "under18" },
    ],
  },

  australia: {
    code: "australia",
    name: "Australia",
    flag: "🇦🇺",
    photo: {
      dimensions: "40 x 60 mm",
      background: "White",
      headHeight: "32-36 mm",
      glassesAllowed: "no",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 0,
    },
    documents: [
      familyCardDoc("none", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
      { id: "au_form_1229", category: "under18", name: "Parental Consent Form (Form 1229)", description: "Australian-specific parental consent form", required: true, conditionalOn: "under18" },
      { id: "au_welfare_arrangement", category: "under18", name: "Welfare Arrangement Until 18", description: "Proof of accommodation, care, and financial support from parents/guardian", required: true, conditionalOn: "under18" },
    ],
  },

  canada: {
    code: "canada",
    name: "Canada",
    flag: "🇨🇦",
    photo: {
      dimensions: "40 x 60 mm",
      background: "White",
      headHeight: "32-36 mm",
      glassesAllowed: "no",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 0,
    },
    documents: [
      familyCardDoc("none", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
      { id: "ca_custodian_declaration", category: "under18", name: "Custodian Declaration Form", description: "Signed by Canadian PR/citizen custodian + parents in home country. Custodian must be Canadian citizen or PR.", required: true, conditionalOn: "under18" },
    ],
  },

  china: {
    code: "china",
    name: "China",
    flag: "🇨🇳",
    photo: {
      dimensions: "35 x 45 mm",
      background: "White",
      headHeight: "28-33 mm",
      glassesAllowed: "no",
      noWhiteShirt: true,
      digitalFormats: [".jpg"],
      hardCopiesRequired: 4,
    },
    documents: [
      familyCardDoc("sworn", true),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...CHINA_SPECIFIC_DOCS,
      ...UNDER_18_BASE,
      { id: "cn_guardian_china", category: "under18", name: "Guardian Details Registered in China", description: "Sometimes required by Chinese authorities", required: false, conditionalOn: "under18" },
      { id: "cn_medical_exam", category: "under18", name: "Medical Examination Record", description: "Often required for China under-18 applicants", required: false, conditionalOn: "under18" },
    ],
    specialNotes: [
      "China retains the original passport during visa processing",
      "All scanned documents must be .jpg or .jpeg format",
      "Family Card requires apostille for China applications",
      "Postal address must be valid for 3+ months — admission notices are mailed",
    ],
  },

  malaysia: {
    code: "malaysia",
    name: "Malaysia",
    flag: "🇲🇾",
    photo: {
      dimensions: "40 x 60 mm",
      background: "White",
      headHeight: "32-36 mm",
      glassesAllowed: "no",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 0,
    },
    documents: [
      familyCardDoc("none", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
      { id: "my_emgs", category: "under18", name: "EMGS Approval", description: "Education Malaysia Global Services approval", required: true, conditionalOn: "under18" },
    ],
  },

  new_zealand: {
    code: "new_zealand",
    name: "New Zealand",
    flag: "🇳🇿",
    photo: {
      dimensions: "35 x 45 mm",
      background: "Plain light",
      headHeight: "30-36 mm",
      glassesAllowed: "no-reflection",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 0,
    },
    documents: [
      familyCardDoc("sworn", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
      { id: "nz_welfare_declaration", category: "under18", name: "Welfare Declaration from NZQA-Approved School", description: "Required for under-18 applicants — declaration from NZQA-approved education provider", required: true, conditionalOn: "under18" },
    ],
  },

  singapore: {
    code: "singapore",
    name: "Singapore",
    flag: "🇸🇬",
    photo: {
      dimensions: "35 x 45 mm",
      background: "Plain light",
      headHeight: "30-36 mm",
      glassesAllowed: "no-reflection",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 4,
    },
    documents: [
      familyCardDoc("sworn", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
      { id: "sg_custodian_ica", category: "under18", name: "Custodian Declaration (SG)", description: "Custodian must be SG Citizen/PR, age 21+, submitted to ICA", required: true, conditionalOn: "under18" },
      { id: "sg_moe_school", category: "under18", name: "Admission to MOE-Approved Institution", description: "School admission letter from MOE-approved education provider", required: true, conditionalOn: "under18" },
    ],
  },

  switzerland: {
    code: "switzerland",
    name: "Switzerland",
    flag: "🇨🇭",
    photo: {
      dimensions: "35 x 45 mm",
      background: "Plain light",
      headHeight: "30-36 mm",
      glassesAllowed: "no-reflection",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 0,
    },
    documents: [
      familyCardDoc("sworn", false),
      ...UNIVERSAL_DOCS,
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
    ],
  },

  uk: {
    code: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    photo: {
      dimensions: "35 x 45 mm",
      background: "Plain light",
      headHeight: "30-36 mm",
      glassesAllowed: "no-reflection",
      digitalFormats: [".jpg"],
      hardCopiesRequired: 0,
    },
    documents: [
      familyCardDoc("sworn", false),
      ...UNIVERSAL_DOCS.map(d => 
        d.id === "passport_biodata" 
          ? {...d, name: "Passport (ALL pages until signature)", description: "UK requires ALL pages of passport up to and including the signature page"} 
          : d
      ),
      ...COMPLIANCE_DOCS,
      ...UNDER_18_BASE,
    ],
    specialNotes: ["UK requires ALL passport pages up to and including signature page (not just biodata)"],
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getRequirementsForCountries(countryCodes: string[]): CountryRequirements[] {
  return countryCodes
    .map(c => COUNTRY_REQUIREMENTS[c as CountryCode])
    .filter(Boolean);
}

export function mergeRequirements(countries: CountryRequirements[]): DocumentRequirement[] {
  // De-duplicate by document id, preferring stricter requirements
  const merged = new Map<string, DocumentRequirement>();
  for (const country of countries) {
    for (const doc of country.documents) {
      const existing = merged.get(doc.id);
      if (!existing) {
        merged.set(doc.id, doc);
      } else {
        // Merge — keep stricter version (required wins, apostille wins, sworn wins)
        merged.set(doc.id, {
          ...existing,
          required: existing.required || doc.required,
          needsApostille: existing.needsApostille || doc.needsApostille,
          needsTranslation: doc.needsTranslation === "sworn" ? "sworn" : existing.needsTranslation,
        });
      }
    }
  }
  return Array.from(merged.values());
}

export function isStudentUnder18(student: any): boolean {
  if (!student?.date_of_birth) return false;
  try {
    const dob = new Date(student.date_of_birth);
    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    return ageYears < 18;
  } catch {
    return false;
  }
}

export function shouldShowDocument(doc: DocumentRequirement, student: any): boolean {
  if (!doc.conditionalOn) return true;
  if (doc.conditionalOn === "under18") return isStudentUnder18(student);
  if (doc.conditionalOn === "postgrad") {
    const p = (student?.program_interest || "").toUpperCase();
    return p.includes("MASTER") || p.includes("MBA") || p.includes("PHD") || p.includes("POSTGRAD") || p.includes("S2") || p.includes("S3");
  }
  if (doc.conditionalOn === "grad") {
    const p = (student?.program_interest || "").toUpperCase();
    return p.includes("MASTER") || p.includes("PHD");
  }
  return true;
}

// Category metadata for UI grouping
export const CATEGORY_META: Record<string, {label: string, icon: string, color: string}> = {
  identity:    {label: "Identity & Personal", icon: "User", color: "blue"},
  family:      {label: "Family Documents",    icon: "Users", color: "orange"},
  passport:    {label: "Passport",            icon: "BookOpen", color: "purple"},
  compliance:  {label: "Compliance & Background", icon: "ShieldCheck", color: "rose"},
  academic:    {label: "Academic",            icon: "GraduationCap", color: "indigo"},
  language:    {label: "Language",            icon: "Globe", color: "cyan"},
  work:        {label: "Work Experience",     icon: "Briefcase", color: "amber"},
  financial:   {label: "Financial",           icon: "DollarSign", color: "emerald"},
  "visa-form": {label: "Visa Forms",          icon: "FileText", color: "violet"},
  postal:      {label: "Postal & Delivery",   icon: "MapPin", color: "teal"},
  under18:     {label: "Under-18 Documentation", icon: "Baby", color: "pink"},
};