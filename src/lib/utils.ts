import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates human-readable age from a YYYY-MM-DD birthdate.
 */
export function calculateAge(dobString?: string): string {
  if (!dobString) return "N/A";
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return "N/A";

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }

  if (years > 1) {
    return `${years} yrs`;
  } else if (years === 1) {
    return "1 yr";
  } else {
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    return months > 0 ? `${months} mo${months > 1 ? "s" : ""}` : "Infant";
  }
}

/**
 * Formats date into readable format: e.g., 20 Nov 2026
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

// Known common drug-class synonyms & member lookup
const DRUG_CLASS_MAP: Record<string, string[]> = {
  penicillin: ["penicillin", "amoxicillin", "co-amoxiclav", "augmentin", "ampicillin", "flucloxacillin", "cloxacillin"],
  cephalosporin: ["cephalosporin", "cefalexin", "cefixime", "cefuroxime", "ceftriaxone", "ceftazidime"],
  sulfonamide: ["sulfa", "sulfonamide", "co-trimoxazole", "bactrim", "silver sulfadiazine", "sulfasalazine"],
  nsaid: ["nsaid", "ibuprofen", "diclofenac", "aspirin", "mefenamic acid", "celecoxib", "meloxicam", "ketoprofen", "naproxen"],
  macrolide: ["macrolide", "azithromycin", "clarithromycin", "erythromycin"],
  fluoroquinolone: ["fluoroquinolone", "quinolone", "ciprofloxacin", "levofloxacin", "norfloxacin"],
  statin: ["statin", "atorvastatin", "rosuvastatin", "simvastatin"],
};

/**
 * Checks if a drug name matches any recorded drug allergy, with:
 * (a) direct drug name match (case-insensitive substring)
 * (b) drug-class cross-allergy (e.g. Penicillin allergy flags Amoxicillin, Co-amoxiclav)
 */
export function checkDrugAllergyMatch(
  drugInput: string,
  allergies: Array<{ allergen: string; type?: string; severity?: string; reaction?: string }>,
  drugClass?: string
): {
  hasWarning: boolean;
  isClassMatch?: boolean;
  matchedAllergen?: string;
  matchedClass?: string;
  warningMessage?: string;
  reaction?: string;
  severity?: string;
} {
  if (!drugInput || drugInput.trim().length < 2 || !allergies || allergies.length === 0) {
    return { hasWarning: false };
  }

  const cleanInput = drugInput.toLowerCase().trim();
  const cleanClass = (drugClass || "").toLowerCase().trim();

  // 1. Direct name match check
  for (const allergy of allergies) {
    if (allergy.type === "drug" || !allergy.type) {
      const cleanAllergen = allergy.allergen.toLowerCase().trim();

      if (
        cleanInput.includes(cleanAllergen) ||
        cleanAllergen.includes(cleanInput)
      ) {
        return {
          hasWarning: true,
          isClassMatch: false,
          matchedAllergen: allergy.allergen,
          warningMessage: `Contraindicated: Patient has recorded allergy to "${allergy.allergen}"`,
          reaction: allergy.reaction,
          severity: allergy.severity,
        };
      }
    }
  }

  // 2. Drug-class cross-allergy check
  for (const allergy of allergies) {
    if (allergy.type === "drug" || !allergy.type) {
      const cleanAllergen = allergy.allergen.toLowerCase().trim();

      // Check if allergen name matches the candidate drug's class directly
      // e.g. Allergen is "penicillin" and drug has drug_class = "penicillin"
      if (cleanClass && (cleanClass.includes(cleanAllergen) || cleanAllergen.includes(cleanClass))) {
        return {
          hasWarning: true,
          isClassMatch: true,
          matchedAllergen: allergy.allergen,
          matchedClass: drugClass,
          warningMessage: `Same class as recorded allergy: ${allergy.allergen}`,
          reaction: allergy.reaction,
          severity: allergy.severity,
        };
      }

      // Check cross-allergy dictionary:
      // Does allergen belong to the same class as candidate drug?
      for (const [cls, members] of Object.entries(DRUG_CLASS_MAP)) {
        const allergenInClass = members.some((m) => cleanAllergen.includes(m) || m.includes(cleanAllergen));
        const drugInClass = cleanClass === cls || members.some((m) => cleanInput.includes(m) || m.includes(cleanInput));

        if (allergenInClass && drugInClass) {
          return {
            hasWarning: true,
            isClassMatch: true,
            matchedAllergen: allergy.allergen,
            matchedClass: cls,
            warningMessage: `Same class as recorded allergy: ${allergy.allergen}`,
            reaction: allergy.reaction,
            severity: allergy.severity,
          };
        }
      }
    }
  }

  return { hasWarning: false };
}
