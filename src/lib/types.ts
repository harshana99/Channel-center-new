export type Role = 'doctor' | 'reception';

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
}

export type AllergyType = 'drug' | 'food' | 'other';
export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface AllergyItem {
  id: string;
  allergen: string;
  type: AllergyType;
  reaction: string;
  severity: AllergySeverity;
}

export interface ConditionItem {
  id: string;
  name: string;
  notes?: string;
}

export interface Patient {
  id: string; // P-0001
  full_name: string;
  dob: string; // YYYY-MM-DD
  sex: 'Male' | 'Female' | 'Other' | '';
  phone: string;
  nic: string;
  address: string;
  allergies_assessed: number; // 0 or 1
  no_known_allergies: number; // 0 or 1
  allergies_json: string; // JSON array of AllergyItem
  conditions_assessed: number; // 0 or 1
  no_conditions: number; // 0 or 1
  conditions_json: string; // JSON array of ConditionItem
  created_at: string;
  updated_at: string;
}

export type DrugFrequency = 'OD' | 'BD' | 'TDS' | 'QDS' | 'Nocte' | 'SOS' | '';

export interface DrugMasterItem {
  id: string;
  name: string;
  default_dose: string;
  default_frequency: DrugFrequency;
  drug_class: string;
  active: number; // 1 or 0
  created_at: string;
}

export interface PrescribedDrug {
  id: string;
  drug_name: string;
  dose: string;
  frequency: DrugFrequency;
  duration_days: number | string;
  instructions: string;
}

export interface Vitals {
  bp_systolic?: string;
  bp_diastolic?: string;
  pulse?: string;
  weight_kg?: string;
  temperature_c?: string;
  blood_sugar_mg?: string;
}

export interface Visit {
  id: string; // V-0001 or uuid
  patient_id: string;
  visit_date: string; // YYYY-MM-DD
  complaint: string;
  diagnosis: string;
  notes: string; // Hidden from reception role
  vitals_json: string; // Vitals object
  drugs_json: string; // Array of PrescribedDrug
  follow_up_date?: string; // YYYY-MM-DD or empty
  follow_up_note?: string;
  created_by: string; // e.g. Dr. Aruna Perera
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  patient_id: string;
  changed_by_name: string;
  changed_by_role: Role;
  change_type: 'allergies_updated' | 'conditions_updated' | 'first_visit_assessment';
  details_json: string;
  created_at: string;
}
