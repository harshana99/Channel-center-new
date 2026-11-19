export const COMMON_SRI_LANKAN_DRUGS = [
  // Penicillins
  { name: "Penicillin V", default_dose: "500mg", default_frequency: "QDS", drug_class: "penicillin" },
  { name: "Amoxicillin", default_dose: "500mg", default_frequency: "TDS", drug_class: "penicillin" },
  { name: "Co-amoxiclav", default_dose: "625mg", default_frequency: "BD", drug_class: "penicillin" },
  { name: "Flucloxacillin", default_dose: "500mg", default_frequency: "QDS", drug_class: "penicillin" },
  { name: "Ampicillin", default_dose: "500mg", default_frequency: "QDS", drug_class: "penicillin" },

  // Cephalosporins
  { name: "Cefalexin", default_dose: "500mg", default_frequency: "TDS", drug_class: "cephalosporin" },
  { name: "Cefixime", default_dose: "200mg", default_frequency: "BD", drug_class: "cephalosporin" },
  { name: "Cefuroxime", default_dose: "500mg", default_frequency: "BD", drug_class: "cephalosporin" },
  { name: "Ceftriaxone", default_dose: "1g", default_frequency: "OD", drug_class: "cephalosporin" },

  // Macrolides
  { name: "Azithromycin", default_dose: "500mg", default_frequency: "OD", drug_class: "macrolide" },
  { name: "Clarithromycin", default_dose: "500mg", default_frequency: "BD", drug_class: "macrolide" },
  { name: "Erythromycin", default_dose: "500mg", default_frequency: "QDS", drug_class: "macrolide" },

  // Fluoroquinolones
  { name: "Ciprofloxacin", default_dose: "500mg", default_frequency: "BD", drug_class: "fluoroquinolone" },
  { name: "Levofloxacin", default_dose: "500mg", default_frequency: "OD", drug_class: "fluoroquinolone" },
  { name: "Norfloxacin", default_dose: "400mg", default_frequency: "BD", drug_class: "fluoroquinolone" },

  // Sulfonamides
  { name: "Co-trimoxazole", default_dose: "960mg", default_frequency: "BD", drug_class: "sulfonamide" },
  { name: "Silver sulfadiazine cream 1%", default_dose: "apply thin layer", default_frequency: "BD", drug_class: "sulfonamide" },
  { name: "Sulfasalazine", default_dose: "500mg", default_frequency: "BD", drug_class: "sulfonamide" },

  // Tetracyclines & Other Antimicrobials
  { name: "Doxycycline", default_dose: "100mg", default_frequency: "BD", drug_class: "tetracycline" },
  { name: "Metronidazole", default_dose: "400mg", default_frequency: "TDS", drug_class: "nitroimidazole" },
  { name: "Nitrofurantoin", default_dose: "100mg", default_frequency: "BD", drug_class: "nitrofuran" },

  // Analgesics & NSAIDs
  { name: "Paracetamol", default_dose: "500mg", default_frequency: "TDS", drug_class: "analgesic" },
  { name: "Paracetamol 1000mg", default_dose: "1000mg", default_frequency: "TDS", drug_class: "analgesic" },
  { name: "Ibuprofen", default_dose: "400mg", default_frequency: "TDS", drug_class: "NSAID" },
  { name: "Diclofenac sodium", default_dose: "50mg", default_frequency: "BD", drug_class: "NSAID" },
  { name: "Mefenamic acid", default_dose: "500mg", default_frequency: "TDS", drug_class: "NSAID" },
  { name: "Celecoxib", default_dose: "200mg", default_frequency: "OD", drug_class: "NSAID" },
  { name: "Meloxicam", default_dose: "15mg", default_frequency: "OD", drug_class: "NSAID" },
  { name: "Aceclofenac", default_dose: "100mg", default_frequency: "BD", drug_class: "NSAID" },
  { name: "Ketoprofen", default_dose: "100mg", default_frequency: "BD", drug_class: "NSAID" },
  { name: "Tramadol", default_dose: "50mg", default_frequency: "SOS", drug_class: "opioid" },

  // Antihistamines
  { name: "Cetirizine", default_dose: "10mg", default_frequency: "Nocte", drug_class: "antihistamine" },
  { name: "Loratadine", default_dose: "10mg", default_frequency: "OD", drug_class: "antihistamine" },
  { name: "Fexofenadine", default_dose: "120mg", default_frequency: "OD", drug_class: "antihistamine" },
  { name: "Fexofenadine 180mg", default_dose: "180mg", default_frequency: "OD", drug_class: "antihistamine" },
  { name: "Chlorpheniramine", default_dose: "4mg", default_frequency: "TDS", drug_class: "antihistamine" },
  { name: "Levocetirizine", default_dose: "5mg", default_frequency: "Nocte", drug_class: "antihistamine" },

  // Asthma & Respiratory
  { name: "Salbutamol inhaler", default_dose: "2 puffs (100mcg)", default_frequency: "SOS", drug_class: "bronchodilator" },
  { name: "Beclomethasone inhaler", default_dose: "2 puffs (100mcg)", default_frequency: "BD", drug_class: "corticosteroid" },
  { name: "Montelukast", default_dose: "10mg", default_frequency: "Nocte", drug_class: "leukotriene receptor antagonist" },
  { name: "Fluticasone/Salmeterol inhaler", default_dose: "1 puff", default_frequency: "BD", drug_class: "corticosteroid" },
  { name: "Dextromethorphan syrup", default_dose: "10ml", default_frequency: "TDS", drug_class: "antitussive" },
  { name: "Bromhexine", default_dose: "8mg", default_frequency: "TDS", drug_class: "mucolytic" },
  { name: "Theophylline", default_dose: "200mg", default_frequency: "BD", drug_class: "xanthine" },
  { name: "Ipratropium respules", default_dose: "1 respule (250mcg)", default_frequency: "SOS", drug_class: "anticholinergic" },
  { name: "Budesonide inhaler", default_dose: "200mcg", default_frequency: "BD", drug_class: "corticosteroid" },
  { name: "Salbutamol syrup", default_dose: "5ml (2mg)", default_frequency: "TDS", drug_class: "bronchodilator" },

  // Gastrointestinal & Stomach
  { name: "Omeprazole", default_dose: "20mg", default_frequency: "BD", drug_class: "proton pump inhibitor" },
  { name: "Pantoprazole", default_dose: "40mg", default_frequency: "OD", drug_class: "proton pump inhibitor" },
  { name: "Esomeprazole", default_dose: "40mg", default_frequency: "OD", drug_class: "proton pump inhibitor" },
  { name: "Rabeprazole", default_dose: "20mg", default_frequency: "OD", drug_class: "proton pump inhibitor" },
  { name: "Famotidine", default_dose: "20mg", default_frequency: "BD", drug_class: "H2 blocker" },
  { name: "Domperidone", default_dose: "10mg", default_frequency: "TDS", drug_class: "prokinetic" },
  { name: "Metoclopramide", default_dose: "10mg", default_frequency: "TDS", drug_class: "antiemetic" },
  { name: "Hyoscine butylbromide", default_dose: "10mg", default_frequency: "TDS", drug_class: "antispasmodic" },
  { name: "Antacid suspension", default_dose: "10ml", default_frequency: "TDS", drug_class: "antacid" },
  { name: "Mebeverine", default_dose: "135mg", default_frequency: "TDS", drug_class: "antispasmodic" },
  { name: "Loperamide", default_dose: "2mg", default_frequency: "SOS", drug_class: "antidiarrheal" },

  // Diabetes
  { name: "Metformin", default_dose: "500mg", default_frequency: "BD", drug_class: "biguanide" },
  { name: "Metformin 850mg", default_dose: "850mg", default_frequency: "BD", drug_class: "biguanide" },
  { name: "Gliclazide", default_dose: "80mg", default_frequency: "OD", drug_class: "sulfonylurea" },
  { name: "Gliclazide MR 60mg", default_dose: "60mg", default_frequency: "OD", drug_class: "sulfonylurea" },
  { name: "Glimepiride", default_dose: "2mg", default_frequency: "OD", drug_class: "sulfonylurea" },
  { name: "Sitagliptin", default_dose: "100mg", default_frequency: "OD", drug_class: "DPP-4 inhibitor" },
  { name: "Vildagliptin", default_dose: "50mg", default_frequency: "BD", drug_class: "DPP-4 inhibitor" },
  { name: "Empagliflozin", default_dose: "10mg", default_frequency: "OD", drug_class: "SGLT2 inhibitor" },
  { name: "Dapagliflozin", default_dose: "10mg", default_frequency: "OD", drug_class: "SGLT2 inhibitor" },
  { name: "Pioglitazone", default_dose: "15mg", default_frequency: "OD", drug_class: "thiazolidinedione" },
  { name: "Insulin Human Mixtard 30/70", default_dose: "20 units", default_frequency: "BD", drug_class: "insulin" },

  // Blood Pressure & Cardiovascular
  { name: "Amlodipine", default_dose: "5mg", default_frequency: "OD", drug_class: "calcium channel blocker" },
  { name: "Amlodipine 10mg", default_dose: "10mg", default_frequency: "OD", drug_class: "calcium channel blocker" },
  { name: "Losartan", default_dose: "50mg", default_frequency: "OD", drug_class: "angiotensin receptor blocker" },
  { name: "Telmisartan", default_dose: "40mg", default_frequency: "OD", drug_class: "angiotensin receptor blocker" },
  { name: "Enalapril", default_dose: "5mg", default_frequency: "OD", drug_class: "ACE inhibitor" },
  { name: "Enalapril 10mg", default_dose: "10mg", default_frequency: "OD", drug_class: "ACE inhibitor" },
  { name: "Atenolol", default_dose: "50mg", default_frequency: "OD", drug_class: "beta blocker" },
  { name: "Bisoprolol", default_dose: "2.5mg", default_frequency: "OD", drug_class: "beta blocker" },
  { name: "Bisoprolol 5mg", default_dose: "5mg", default_frequency: "OD", drug_class: "beta blocker" },
  { name: "Carvedilol", default_dose: "6.25mg", default_frequency: "BD", drug_class: "beta blocker" },
  { name: "Hydrochlorothiazide", default_dose: "25mg", default_frequency: "OD", drug_class: "thiazide diuretic" },
  { name: "Indapamide", default_dose: "1.5mg", default_frequency: "OD", drug_class: "thiazide-like diuretic" },
  { name: "Nifedipine SR", default_dose: "20mg", default_frequency: "BD", drug_class: "calcium channel blocker" },
  { name: "Diltiazem", default_dose: "60mg", default_frequency: "TDS", drug_class: "calcium channel blocker" },
  { name: "Spironolactone", default_dose: "25mg", default_frequency: "OD", drug_class: "aldosterone antagonist" },

  // Cholesterol (Statins)
  { name: "Atorvastatin", default_dose: "20mg", default_frequency: "Nocte", drug_class: "statin" },
  { name: "Atorvastatin 40mg", default_dose: "40mg", default_frequency: "Nocte", drug_class: "statin" },
  { name: "Rosuvastatin", default_dose: "10mg", default_frequency: "Nocte", drug_class: "statin" },
  { name: "Fenofibrate", default_dose: "160mg", default_frequency: "OD", drug_class: "fibrate" },

  // Thyroid
  { name: "Levothyroxine", default_dose: "50mcg", default_frequency: "OD", drug_class: "thyroid hormone" },
  { name: "Levothyroxine 100mcg", default_dose: "100mcg", default_frequency: "OD", drug_class: "thyroid hormone" },
  { name: "Carbimazole", default_dose: "10mg", default_frequency: "TDS", drug_class: "antithyroid" },

  // Vitamins & Supplements
  { name: "Vitamin C", default_dose: "500mg", default_frequency: "OD", drug_class: "vitamin" },
  { name: "Vitamin B Complex", default_dose: "1 tab", default_frequency: "OD", drug_class: "vitamin" },
  { name: "Calcium Carbonate + Vit D3", default_dose: "500mg", default_frequency: "BD", drug_class: "supplement" },
  { name: "Ferrous Fumarate", default_dose: "200mg", default_frequency: "BD", drug_class: "mineral" },
  { name: "Folic Acid", default_dose: "5mg", default_frequency: "OD", drug_class: "vitamin" },
  { name: "Zinc sulfate", default_dose: "20mg", default_frequency: "OD", drug_class: "mineral" },
  { name: "Vitamin D3", default_dose: "60000 IU", default_frequency: "OD", drug_class: "vitamin" },
  { name: "Neurobion", default_dose: "1 tab", default_frequency: "OD", drug_class: "vitamin" },

  // Antifungals & Skin
  { name: "Fluconazole", default_dose: "150mg", default_frequency: "OD", drug_class: "antifungal" },
  { name: "Itraconazole", default_dose: "100mg", default_frequency: "BD", drug_class: "antifungal" },
  { name: "Griseofulvin", default_dose: "500mg", default_frequency: "OD", drug_class: "antifungal" },
  { name: "Hydrocortisone cream 1%", default_dose: "apply thin film", default_frequency: "BD", drug_class: "corticosteroid" },
  { name: "Betamethasone cream 0.1%", default_dose: "apply thin film", default_frequency: "BD", drug_class: "corticosteroid" },
  { name: "Clotrimazole cream 1%", default_dose: "apply twice daily", default_frequency: "BD", drug_class: "antifungal" },
  { name: "Fusidic acid cream 2%", default_dose: "apply 3 times daily", default_frequency: "TDS", drug_class: "antibacterial" },
  { name: "Mupirocin ointment 2%", default_dose: "apply 3 times daily", default_frequency: "TDS", drug_class: "antibacterial" },
  { name: "Ketoconazole shampoo 2%", default_dose: "apply to scalp", default_frequency: "SOS", drug_class: "antifungal" },
  { name: "Calamine lotion", default_dose: "apply generously", default_frequency: "SOS", drug_class: "astringent" },
  { name: "Permethrin 5% lotion", default_dose: "apply neck down", default_frequency: "OD", drug_class: "scabicide" },

  // Antiparasitics
  { name: "Albendazole", default_dose: "400mg", default_frequency: "OD", drug_class: "anthelmintic" },
  { name: "Mebendazole", default_dose: "100mg", default_frequency: "BD", drug_class: "anthelmintic" },
];
