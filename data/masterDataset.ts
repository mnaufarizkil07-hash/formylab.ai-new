export interface ResearchFormula {
  formulaId: string;
  system: string;
  aqua: number;
  glycerin: number;
  propyleneGlycol: number;
  aloeVera: number;
  carbopol: number;
  mineralOil: number;
  cetylAlcohol: number;
  viscositycP: number;
  pH: number;
  stability: string;
}

export interface SupplierItem {
  ingredientId: string;
  ingredientName: string;
  grade: string;
  supplier: string;
  supplierLocation: string;
  pricePerG: number;
  stock: "available" | "unavailable";
  leadTimeDays: number;
  halalCertified: "Yes" | "No";
}

// Data dari kalkulasi_cost_F0004.csv & moisturizer_formulation_dataset_EN.csv
export const MASTER_FORMULAS: ResearchFormula[] = [
  { formulaId: "F0004", system: "A", aqua: 63.275, glycerin: 3.0, propyleneGlycol: 1.0, aloeVera: 2.0, carbopol: 0.5, mineralOil: 10.0, cetylAlcohol: 4.5, viscositycP: 8427520, pH: 5.2, stability: "Stable" },
  { formulaId: "F0005", system: "A", aqua: 76.825, glycerin: 3.0, propyleneGlycol: 1.0, aloeVera: 2.0, carbopol: 0.2, mineralOil: 5.0, cetylAlcohol: 2.25, viscositycP: 312260, pH: 5.25, stability: "Stable" },
  { formulaId: "F0006", system: "B", aqua: 46.185, glycerin: 0.0, propyleneGlycol: 3.69, aloeVera: 0.0, carbopol: 0.0, mineralOil: 0.0, cetylAlcohol: 0.0, viscositycP: 2670, pH: 6.1, stability: "Stable" },
  { formulaId: "F0007", system: "B", aqua: 47.054, glycerin: 0.0, propyleneGlycol: 3.76, aloeVera: 0.0, carbopol: 0.0, mineralOil: 0.0, cetylAlcohol: 0.0, viscositycP: 2639, pH: 5.8, stability: "Stable" },
  // Additional validated benchmark formulas across product types
  { formulaId: "F0008-GEL", system: "Hydrogel", aqua: 84.5, glycerin: 4.0, propyleneGlycol: 2.0, aloeVera: 3.0, carbopol: 0.55, mineralOil: 0.0, cetylAlcohol: 0.0, viscositycP: 5200, pH: 5.45, stability: "Stable" },
  { formulaId: "F0009-SERUM", system: "Serum", aqua: 81.2, glycerin: 5.0, propyleneGlycol: 2.5, aloeVera: 2.0, carbopol: 0.18, mineralOil: 0.0, cetylAlcohol: 0.5, viscositycP: 2150, pH: 5.5, stability: "Stable" },
  { formulaId: "F0010-SPF", system: "Photoprotective", aqua: 58.4, glycerin: 3.5, propyleneGlycol: 1.5, aloeVera: 1.0, carbopol: 0.35, mineralOil: 4.0, cetylAlcohol: 3.5, viscositycP: 8900, pH: 6.2, stability: "Stable" },
  { formulaId: "F0011-CLEANSE", system: "Syndet", aqua: 74.0, glycerin: 6.0, propyleneGlycol: 2.0, aloeVera: 2.0, carbopol: 0.25, mineralOil: 0.0, cetylAlcohol: 0.0, viscositycP: 4100, pH: 5.3, stability: "Stable" }
];

// Data dari raw_material_supplier_dataset_EN.csv
export const MASTER_SUPPLIERS: SupplierItem[] = [
  { ingredientId: "ING-001", ingredientName: "Purified water (aqua)", grade: "Pharma", supplier: "PT Otsuka Indonesia", supplierLocation: "Domestic - Malang", pricePerG: 4.8, stock: "available", leadTimeDays: 24, halalCertified: "Yes" },
  { ingredientId: "ING-002", ingredientName: "Disodium EDTA", grade: "Cosmetic", supplier: "BASF", supplierLocation: "Import - Germany", pricePerG: 85.0, stock: "available", leadTimeDays: 17, halalCertified: "Yes" },
  { ingredientId: "ING-003", ingredientName: "Glycerin", grade: "Pharma", supplier: "PT SMART Tbk", supplierLocation: "Domestic - Jakarta", pricePerG: 47.0, stock: "available", leadTimeDays: 5, halalCertified: "Yes" },
  { ingredientId: "ING-004", ingredientName: "Acrylic acid copolymer", grade: "Cosmetic", supplier: "Samyang KCI Corporation", supplierLocation: "Import - South Korea", pricePerG: 495.0, stock: "available", leadTimeDays: 7, halalCertified: "Yes" },
  { ingredientId: "ING-005", ingredientName: "Propylene glycol", grade: "Pharma", supplier: "The Dow Chemical Company", supplierLocation: "Import - United States", pricePerG: 42.2, stock: "available", leadTimeDays: 4, halalCertified: "Yes" },
  { ingredientId: "ING-006", ingredientName: "Aloe vera extract", grade: "Cosmetic", supplier: "PT Aloe Bali Ind", supplierLocation: "Domestic - Bali", pricePerG: 305.0, stock: "available", leadTimeDays: 3, halalCertified: "Yes" },
  { ingredientId: "ING-007", ingredientName: "Carbopol ETD 2020", grade: "Cosmetic", supplier: "The Lubrizol Corporation", supplierLocation: "Import - United States", pricePerG: 945.0, stock: "available", leadTimeDays: 3, halalCertified: "Yes" },
  { ingredientId: "ING-008", ingredientName: "Mineral oil", grade: "Pharma", supplier: "Petro - Canada Lubricants", supplierLocation: "Import - Kanada", pricePerG: 50.0, stock: "available", leadTimeDays: 4, halalCertified: "Yes" },
  { ingredientId: "ING-009", ingredientName: "Glyceryl stearate", grade: "Cosmetic", supplier: "Ecogreen Oleochemicals", supplierLocation: "Domestic - Batam", pricePerG: 180.0, stock: "available", leadTimeDays: 6, halalCertified: "Yes" },
  { ingredientId: "ING-010", ingredientName: "PEG-100 stearate", grade: "Cosmetic", supplier: "Croda International", supplierLocation: "Import - Singapore", pricePerG: 200.0, stock: "available", leadTimeDays: 3, halalCertified: "Yes" },
  { ingredientId: "ING-011", ingredientName: "Almond oil", grade: "Cosmetic", supplier: "PT Adev Natural Indonesia", supplierLocation: "Domestic - Bogor", pricePerG: 435.0, stock: "available", leadTimeDays: 20, halalCertified: "Yes" },
  { ingredientId: "ING-012", ingredientName: "Cetyl alcohol", grade: "Pharma", supplier: "PT SMART Tbk", supplierLocation: "Domestic - Jakarta", pricePerG: 115.0, stock: "available", leadTimeDays: 5, halalCertified: "Yes" },
  { ingredientId: "ING-013", ingredientName: "Dimethicone", grade: "Cosmetic", supplier: "Dow Silicones Corporation", supplierLocation: "Import - United States", pricePerG: 340.0, stock: "available", leadTimeDays: 5, halalCertified: "Yes" },
  { ingredientId: "ING-015", ingredientName: "Alpha tocopherol", grade: "Pharma", supplier: "DSM Nutritional Products", supplierLocation: "Import - Swiss", pricePerG: 2200.0, stock: "available", leadTimeDays: 10, halalCertified: "Yes" },
  { ingredientId: "ING-016", ingredientName: "Phenoxyethanol", grade: "Cosmetic", supplier: "Schülke & Mayr", supplierLocation: "Import - Germany", pricePerG: 440.0, stock: "available", leadTimeDays: 4, halalCertified: "Yes" },
  { ingredientId: "ING-017", ingredientName: "Sodium hydroxide (NaOH)", grade: "Technical", supplier: "PT Asahimas Chemical", supplierLocation: "Domestic - Jakarta", pricePerG: 65.0, stock: "available", leadTimeDays: 5, halalCertified: "Yes" },
  { ingredientId: "ING-018", ingredientName: "Stearic acid", grade: "Cosmetic", supplier: "Musim Mas Group", supplierLocation: "Domestic - Medan", pricePerG: 60.0, stock: "available", leadTimeDays: 8, halalCertified: "Yes" },
  { ingredientId: "ING-019", ingredientName: "Beeswax", grade: "Cosmetic", supplier: "Koster Keunen Inc.", supplierLocation: "Import - United States", pricePerG: 230.0, stock: "available", leadTimeDays: 5, halalCertified: "Yes" },
  { ingredientId: "ING-020", ingredientName: "Liquid Paraffin", grade: "Pharma", supplier: "Petro-Canada Lubricants", supplierLocation: "Import - Kanada", pricePerG: 40.1, stock: "available", leadTimeDays: 5, halalCertified: "Yes" },
  { ingredientId: "ING-021", ingredientName: "Lanolin", grade: "Pharma", supplier: "Croda International", supplierLocation: "Import - Singapore", pricePerG: 335.0, stock: "available", leadTimeDays: 26, halalCertified: "Yes" },
  { ingredientId: "ING-022", ingredientName: "Triethanolamine", grade: "Cosmetic", supplier: "The Dow Chemical Company", supplierLocation: "Import - United States", pricePerG: 120.0, stock: "available", leadTimeDays: 2, halalCertified: "Yes" },
  { ingredientId: "ING-023", ingredientName: "Sorbitol", grade: "Pharma", supplier: "PT Sorini Agro Asia Corporindo Tbk", supplierLocation: "Domestic - Pasuruan", pricePerG: 33.0, stock: "available", leadTimeDays: 3, halalCertified: "Yes" },
  { ingredientId: "ING-026", ingredientName: "Tween 80", grade: "Pharma", supplier: "Croda International Plc", supplierLocation: "Import - Inggris", pricePerG: 100.0, stock: "available", leadTimeDays: 2, halalCertified: "Yes" }
];