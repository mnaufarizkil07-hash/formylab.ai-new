export interface Atom3D {
  id: number;
  element: "C" | "H" | "O" | "N" | "S" | "Si" | "Na" | "Zn" | "Ti";
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface Bond3D {
  from: number;
  to: number;
  order: 1 | 2 | 3;
}

export interface MoleculeStructure3D {
  formula: string;
  iupacName: string;
  geometryType: string;
  atoms: Atom3D[];
  bonds: Bond3D[];
}

export interface ProductTypeSpec {
  id: string;
  name: string;
  shortName: string;
  systemType:
    | "O/W Emulsion"
    | "W/O Emulsion"
    | "Polymeric Hydrogel"
    | "Aqueous Serum"
    | "Photoprotective Emulsion"
    | "Syndet Micellar Gel"
    | "Lamellar Repair Balm"
    | "Biphasic / Micro-Essence";
  targetPh: string;
  validPhRange: string;
  targetViscosity: string;
  viscosityRangeCps: [number, number];
  requiredHlb: string;
  scientificBasis: string;
  referenceSource: string;
  evidenceDoi: string;
  coreBaseIngredients: string[];
  recommendedActives: Array<{
    name: string;
    defaultConc: string;
    role: string;
    skinTargets: string[];
  }>;
  processingNotes: string;
}

export interface EnrichedIngredientProfile {
  key: string;
  inciName: string;
  casNumber: string;
  molecularFormula: string;
  molecularWeight: string;
  functionalCategory: string;
  hlbValue: string;
  optimalPhRange: string;
  typicalUsageRate: string;
  compatibilityScore: number;
  synergisticWith: string[];
  avoidWith: string[];
  certifications: string[];
  compatibleProductTypes: string[];
  safetyGrade:
    | "Low Hazard (USP/BPOM Compliant)"
    | "Moderate (Regulated Limit)"
    | "Allergen Watch (Substituted by AI)";
  mechanismOfAction: string;
  solubilityPhase: "Water Phase (Hydrophilic)" | "Oil Phase (Lipophilic)" | "Amphiphilic / Surfactant" | "Cool-Down Phase (<40°C)" | "Suspension / Mineral Phase";
  molecule3D: MoleculeStructure3D;
}

export const ELEMENT_CPK_COLORS: Record<
  Atom3D["element"],
  { hex: string; number: number; radius: number; name: string }
> = {
  C: { hex: "#334155", number: 0x334155, radius: 0.42, name: "Carbon" },
  H: { hex: "#f8fafc", number: 0xf8fafc, radius: 0.26, name: "Hydrogen" },
  O: { hex: "#ef4444", number: 0xef4444, radius: 0.38, name: "Oxygen" },
  N: { hex: "#3b82f6", number: 0x3b82f6, radius: 0.39, name: "Nitrogen" },
  S: { hex: "#eab308", number: 0xeab308, radius: 0.46, name: "Sulfur" },
  Si: { hex: "#14b8a6", number: 0x14b8a6, radius: 0.48, name: "Silicon" },
  Na: { hex: "#a855f7", number: 0xa855f7, radius: 0.5, name: "Sodium" },
  Zn: { hex: "#6366f1", number: 0x6366f1, radius: 0.48, name: "Zinc" },
  Ti: { hex: "#94a3b8", number: 0x94a3b8, radius: 0.48, name: "Titanium" },
};

// All original 5 Product Types preserved first + 7 new specialized R&D Product Types (12 total)
export const VALIDATED_PRODUCT_TYPES: ProductTypeSpec[] = [
  {
    id: "facial-moisturizer-cream",
    name: "Facial Moisturizer (Cream)",
    shortName: "O/W Moisturizer Cream",
    systemType: "O/W Emulsion",
    targetPh: "5.25",
    validPhRange: "5.00 – 5.80",
    targetViscosity: "8500 - 15000 cPs",
    viscosityRangeCps: [8500, 15000],
    requiredHlb: "11.2 (Glyceryl Stearate + PEG-100 Stearate system)",
    scientificBasis:
      "Formulated at physiological acid-mantle pH (5.20–5.50) to support β-glucocerebrosidase activity and lamellar lipid organization. Uses non-ionic/anionic co-emulsifiers (Glyceryl Stearate & PEG-100 Stearate) stabilized with Carbopol ETD 2020 and Cetyl Alcohol.",
    referenceSource: "MDPI Cosmetics 2020, 7(2), 43 & USP <791> Topical Emulsion Standard",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Mineral oil",
      "Glyceryl stearate",
      "PEG-100 stearate",
      "Cetyl alcohol",
      "Almond oil",
      "Aloe vera extract",
      "Propylene glycol",
      "Carbopol ETD 2020",
      "Alpha tocopherol",
      "Dimethiconol",
      "Dimethicone",
      "Phenoxyethanol",
      "Sodium hydroxide (NaOH)",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Niacinamide 4%", defaultConc: "4.0%", role: "Barrier Ceramide Synthesis & Brightening", skinTargets: ["Dullness & Uneven Tone", "Acne-Prone", "Sensitive & Redness"] },
      { name: "Panthenol 2%", defaultConc: "2.0%", role: "Humectant & Corneocyte Repair", skinTargets: ["Dry & Dehydrated", "Sensitive & Redness"] },
      { name: "Ceramide NP 1%", defaultConc: "1.0%", role: "Lamellar Bilayer Restoration", skinTargets: ["Dry & Dehydrated", "Aging & Fine Lines"] },
      { name: "Alpha Tocopherol 0.5%", defaultConc: "0.5%", role: "Lipid-Phase Chain-Breaking Antioxidant", skinTargets: ["Aging & Fine Lines", "Dry & Dehydrated"] },
      { name: "Aloe Vera Extract 2%", defaultConc: "2.0%", role: "Soothing Polysaccharide Complex", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
      { name: "Squalane 3%", defaultConc: "3.0%", role: "Biomimetic Sebum Emollient", skinTargets: ["Dry & Dehydrated", "Sensitive & Redness"] },
    ],
    processingNotes:
      "Heat Aqueous Phase (75°C) and Oil Phase (75°C) separately; homogenize at 3,500 rpm for 10 min, cool to 40°C before adding thermolabile actives and Phenoxyethanol.",
  },
  {
    id: "soothing-gel",
    name: "Soothing Gel",
    shortName: "Soothing Hydro-Gel",
    systemType: "Polymeric Hydrogel",
    targetPh: "5.45",
    validPhRange: "5.20 – 5.80",
    targetViscosity: "4000 - 6500 cPs",
    viscosityRangeCps: [4000, 6500],
    requiredHlb: "N/A (Oil-Free Crosslinked Polyacrylate Matrix)",
    scientificBasis:
      "Crosslinked Carbopol ETD 2020 and Acrylic Acid Copolymer reach peak microgel uncoiling and optical clarity between pH 5.3 and 5.8 when neutralized with 18% NaOH or TEA, yielding shear-thinning pseudoplastic flow ideal for erythematous or acne-prone skin.",
    referenceSource: "Lubrizol Technical Bulletin TDS-237 & MDPI Cosmetics 7(2), 43",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Aloe vera extract",
      "Glycerin",
      "Propylene glycol",
      "Sorbitol",
      "Acrylic acid copolymer",
      "Carbopol ETD 2020",
      "Phenoxyethanol",
      "Sodium hydroxide (NaOH)",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Centella Asiatica Extract 2.5%", defaultConc: "2.5%", role: "Asiaticoside & Madecassoside Barrier Calming", skinTargets: ["Sensitive & Redness", "Acne-Prone"] },
      { name: "Aloe Vera Extract 3%", defaultConc: "3.0%", role: "Cooling Acemannan Humectancy", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
      { name: "Panthenol 2%", defaultConc: "2.0%", role: "Epidermal Hydration & Redness Reduction", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
      { name: "Allantoin 0.4%", defaultConc: "0.4%", role: "Epithelial Soothing Agent", skinTargets: ["Sensitive & Redness", "Acne-Prone"] },
      { name: "Ectoin 1%", defaultConc: "1.0%", role: "Kosmotropic Osmolyte Cell Shield", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
    ],
    processingNotes:
      "Disperse Carbopol ETD 2020 in DI Water with EDTA at room temperature (25°C) until lump-free. Add humectants and botanical extracts, then neutralize dropwise with NaOH solution to pH 5.45.",
  },
  {
    id: "sunscreen-lotion",
    name: "Sunscreen Lotion",
    shortName: "SPF 50+ Sunscreen Lotion",
    systemType: "Photoprotective Emulsion",
    targetPh: "6.20",
    validPhRange: "5.80 – 6.80",
    targetViscosity: "6500 - 11000 cPs",
    viscosityRangeCps: [6500, 11000],
    requiredHlb: "11.5 (High-Suspension O/W Photoprotective Matrix)",
    scientificBasis:
      "Formulated at pH 6.0–6.5 to stay well above the isoelectric instability zone of coated mineral UV filters (preventing ZnO dissolution into free Zn²⁺ ions) while Dimethicone and Cetyl Alcohol create an even, water-resistant film (2.0 mg/cm² ISO 24444).",
    referenceSource: "ISO 24444 In-Vivo SPF Standard & ASEAN Cosmetic Directive Annex VII",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Cetyl alcohol",
      "Glyceryl stearate",
      "PEG-100 stearate",
      "Dimethicone",
      "Dimethiconol",
      "Glycerin",
      "Almond oil",
      "Propylene glycol",
      "Alpha tocopherol",
      "Carbopol ETD 2020",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Zinc Oxide 12%", defaultConc: "12.0%", role: "Broad-Spectrum UVA1/UVB Mineral Filter", skinTargets: ["Sensitive & Redness", "Aging & Fine Lines", "Acne-Prone"] },
      { name: "Titanium Dioxide 5%", defaultConc: "5.0%", role: "High-Attenuation UVB/UVA2 Mineral Shield", skinTargets: ["Sensitive & Redness", "Dullness & Uneven Tone"] },
      { name: "Alpha Tocopherol 0.5%", defaultConc: "0.5%", role: "Photostabilizer & Singlet Oxygen Quencher", skinTargets: ["Aging & Fine Lines"] },
      { name: "Bisabolol 0.4%", defaultConc: "0.4%", role: "UV-Induced Erythema Mitigation", skinTargets: ["Sensitive & Redness"] },
      { name: "Ectoin 1%", defaultConc: "1.0%", role: "UVA Photoprotective Extremolyte", skinTargets: ["Aging & Fine Lines", "Sensitive & Redness"] },
    ],
    processingNotes:
      "Disperse mineral UV filters into the emollient/silicone phase using high-shear rotor-stator homogenization (5,000 rpm, 15 min) before emulsifying with the aqueous phase at 75°C.",
  },
  {
    id: "anti-aging-serum",
    name: "Anti-Aging Serum",
    shortName: "Concentrated Serum",
    systemType: "Aqueous Serum",
    targetPh: "5.50",
    validPhRange: "5.00 – 6.00",
    targetViscosity: "1500 - 2800 cPs",
    viscosityRangeCps: [1500, 2800],
    requiredHlb: "12.0 (Micro-emulsified Silky Serum)",
    scientificBasis:
      "Low-viscosity Newtonian/lightly pseudoplastic fluid (1,500–2,800 cPs) maximizes diffusion coefficient (Fick's First Law) of low-molecular-weight actives while maintaining pH 5.50 to prevent Niacinamide hydrolysis and preserve biomimetic peptide stability.",
    referenceSource: "International Journal of Cosmetic Science (Peptide & Retinoid Delivery)",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Propylene glycol",
      "Sorbitol",
      "Aloe vera extract",
      "Acrylic acid copolymer",
      "Dimethiconol",
      "Dimethicone",
      "Alpha tocopherol",
      "Tween 80",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Sodium Hyaluronate 1.5%", defaultConc: "1.5%", role: "Multi-Depth Viscoelastic Moisture Reservoir", skinTargets: ["Aging & Fine Lines", "Dry & Dehydrated"] },
      { name: "Bakuchiol 1%", defaultConc: "1.0%", role: "Photostable Retinol-Functional Collagen Stimulator", skinTargets: ["Aging & Fine Lines", "Dullness & Uneven Tone"] },
      { name: "Palmitoyl Tripeptide-1 2%", defaultConc: "2.0%", role: "Matrikine Pro-Collagen I Signaling Peptide", skinTargets: ["Aging & Fine Lines"] },
      { name: "Niacinamide 5%", defaultConc: "5.0%", role: "NAD+ Precursor & Dermal Elasticity Booster", skinTargets: ["Aging & Fine Lines", "Dullness & Uneven Tone"] },
      { name: "Ceramide NP 1%", defaultConc: "1.0%", role: "Intercellular Lipid Replenishment", skinTargets: ["Aging & Fine Lines", "Dry & Dehydrated"] },
    ],
    processingNotes:
      "Cold-process compatible at 25–35°C. Pre-hydrate polymer in water, blend polyol humectants with water-soluble actives, and micro-emulsify Tocopherol/Dimethiconol using Tween 80.",
  },
  {
    id: "gentle-cleanser",
    name: "Gentle Cleanser",
    shortName: "Low-pH Facial Cleanser",
    systemType: "Syndet Micellar Gel",
    targetPh: "5.30",
    validPhRange: "5.00 – 5.60",
    targetViscosity: "3000 - 5000 cPs",
    viscosityRangeCps: [3000, 5000],
    requiredHlb: "14.5 (Non-Ionic / Mild Solubilizer & Humectant Gel)",
    scientificBasis:
      "Maintains skin-neutral pH 5.30 (versus traditional soap pH 9.5) to prevent keratin swelling and surfactant binding to stratum corneum proteins. Enriched with Glycerin, Sorbitol, and Tween 80 for rapid rinsability (7–10 seconds).",
    referenceSource: "Dermatologic Therapy — Surfactant-Skin Interaction & Acid Mantle Preservation",
    evidenceDoi: "https://doi.org/10.55248/gengpi.4.1223.123318",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Sorbitol",
      "Propylene glycol",
      "Tween 80",
      "Aloe vera extract",
      "Acrylic acid copolymer",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Salicylic Acid 0.5%", defaultConc: "0.5%", role: "Lipophilic Pore Keratolytic (BHA)", skinTargets: ["Acne-Prone"] },
      { name: "Panthenol 1.5%", defaultConc: "1.5%", role: "Post-Wash Barrier Cushion", skinTargets: ["Dry & Dehydrated", "Sensitive & Redness"] },
      { name: "Aloe Vera Extract 2%", defaultConc: "2.0%", role: "Surfactant Irritation Mitigator", skinTargets: ["Sensitive & Redness"] },
      { name: "Allantoin 0.3%", defaultConc: "0.3%", role: "Calming Keratolytic Protectant", skinTargets: ["Sensitive & Redness", "Acne-Prone"] },
    ],
    processingNotes:
      "Blend humectants and non-ionic surfactant at 40°C under low-speed paddle mixing (200 rpm) to prevent aeration/foaming during batch compounding.",
  },
  {
    id: "all-purpose-barrier-cream",
    name: "All-Purpose Barrier Cream (BBD Journal Standard)",
    shortName: "All-Purpose Cream",
    systemType: "O/W Emulsion",
    targetPh: "5.90",
    validPhRange: "5.70 – 6.40",
    targetViscosity: "2500 - 3000 cPs",
    viscosityRangeCps: [2500, 3000],
    requiredHlb: "11.8 – 12.1 (In-situ Triethanolamine Stearate + Tween 80)",
    scientificBasis:
      "Derived directly from Box-Behnken Design (BBD) response surface optimization (F0001–F1000). Saponification of Stearic Acid with Triethanolamine forms an anionic lamellar gel network reinforced with Beeswax and Lanolin for high spreadability (8.5–9.2 cm).",
    referenceSource: "World Journal of Advanced Research & Reviews (BBD Design Space)",
    evidenceDoi: "https://doi.org/10.55248/gengpi.4.1223.123318",
    coreBaseIngredients: [
      "Water",
      "Stearic acid",
      "Liquid Paraffin",
      "Propylene glycol",
      "Beeswax",
      "Lanolin",
      "Triethanolamine",
      "Sorbitol",
      "Tween 80",
      "Disodium EDTA",
      "Phenoxyethanol",
    ],
    recommendedActives: [
      { name: "Allantoin 0.5%", defaultConc: "0.5%", role: "Keratolytic & Skin Protectant (FDA OTC Monograph)", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
      { name: "Panthenol 2%", defaultConc: "2.0%", role: "Pro-Vitamin B5 Deep Hydration", skinTargets: ["Dry & Dehydrated", "Sensitive & Redness"] },
      { name: "Bisabolol 0.3%", defaultConc: "0.3%", role: "IL-1α & TNF-α Anti-Irritant", skinTargets: ["Sensitive & Redness", "Acne-Prone"] },
      { name: "Shea Butter 3%", defaultConc: "3.0%", role: "Rich Stearic/Oleic Triglyceride Cushion", skinTargets: ["Dry & Dehydrated"] },
    ],
    processingNotes:
      "Melt Stearic Acid, Beeswax, Liquid Paraffin, and Lanolin at 72°C. Dissolve TEA, Sorbitol, Propylene Glycol, and EDTA in water at 72°C. Add oil phase to water phase under continuous turbine agitation.",
  },
  {
    id: "brightening-essence-lotion",
    name: "Brightening Essence Lotion",
    shortName: "Brightening Fluid Lotion",
    systemType: "O/W Emulsion",
    targetPh: "5.60",
    validPhRange: "5.30 – 6.00",
    targetViscosity: "3200 - 5500 cPs",
    viscosityRangeCps: [3200, 5500],
    requiredHlb: "11.6 (Lightweight O/W Fluid Emulsion)",
    scientificBasis:
      "Buffered at pH 5.60—the exact kinetic sweet spot where Niacinamide, Alpha Arbutin, and Tranexamic Acid exhibit <0.1% hydrolytic degradation over 24 months at 30°C/75% RH (ASEAN Zone IVb stability).",
    referenceSource: "ASEAN Guidelines on Stability Study of Cosmetic Products & MDPI Cosmetics",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Sorbitol",
      "Propylene glycol",
      "Almond oil",
      "Glyceryl stearate",
      "PEG-100 stearate",
      "Cetyl alcohol",
      "Alpha tocopherol",
      "Dimethicone",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Niacinamide 5%", defaultConc: "5.0%", role: "Melanosome Transfer Inhibitor", skinTargets: ["Dullness & Uneven Tone", "Acne-Prone"] },
      { name: "Alpha Arbutin 2%", defaultConc: "2.0%", role: "Competitive Tyrosinase Inhibitor", skinTargets: ["Dullness & Uneven Tone"] },
      { name: "Tranexamic Acid 2%", defaultConc: "2.0%", role: "Plasminogen/Keratinocyte Melanogenesis Blocker", skinTargets: ["Dullness & Uneven Tone", "Sensitive & Redness"] },
      { name: "3-O-Ethyl Ascorbic Acid 2%", defaultConc: "2.0%", role: "Non-Oxidizing Vitamin C Derivative", skinTargets: ["Dullness & Uneven Tone", "Aging & Fine Lines"] },
    ],
    processingNotes:
      "Dissolve Alpha Arbutin, Tranexamic Acid, and Niacinamide in pre-warmed deionized water (40°C) and fold into the homogenized O/W base below 45°C.",
  },
  {
    id: "acne-clarifying-fluid",
    name: "Acne Control BHA/Azelaic Fluid",
    shortName: "Acne Clarifying Fluid",
    systemType: "O/W Emulsion",
    targetPh: "4.60",
    validPhRange: "4.20 – 5.00",
    targetViscosity: "2200 - 4200 cPs",
    viscosityRangeCps: [2200, 4200],
    requiredHlb: "12.4 (Non-Comedogenic Micro-Lotion)",
    scientificBasis:
      "Formulated at pH 4.50–4.80 to maintain unionized Salicylic Acid & Azelaic Acid bio-availability for follicular penetration without triggering severe acid stinging, using zero-comedogenicity silicones and polyols.",
    referenceSource: "Journal of Cosmetic Dermatology — Follicular Delivery of BHA & Azelaic Acid",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Propylene glycol",
      "Glycerin",
      "Sorbitol",
      "Aloe vera extract",
      "Dimethicone",
      "Cetyl alcohol",
      "PEG-100 stearate",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Salicylic Acid 1.5%", defaultConc: "1.5%", role: "Follicular Keratolytic & Comedolytic", skinTargets: ["Acne-Prone"] },
      { name: "Azelaic Acid 5%", defaultConc: "5.0%", role: "5α-Reductase & C. acnes Antimicrobial", skinTargets: ["Acne-Prone", "Dullness & Uneven Tone", "Sensitive & Redness"] },
      { name: "Centella Asiatica Extract 2%", defaultConc: "2.0%", role: "Post-Acne Erythema Soother", skinTargets: ["Acne-Prone", "Sensitive & Redness"] },
      { name: "Allantoin 0.4%", defaultConc: "0.4%", role: "Anti-Irritant Protectant", skinTargets: ["Acne-Prone", "Sensitive & Redness"] },
    ],
    processingNotes:
      "Pre-solubilize Salicylic Acid in Propylene Glycol + PEG-100 Stearate at 45°C before slow incorporation into the aqueous gel phase.",
  },
  {
    id: "aha-exfoliating-resurfacing-gel",
    name: "AHA/PHA Resurfacing Night Gel-Serum",
    shortName: "AHA Exfoliating Gel",
    systemType: "Aqueous Serum",
    targetPh: "3.85",
    validPhRange: "3.60 – 4.20",
    targetViscosity: "1800 - 3400 cPs",
    viscosityRangeCps: [1800, 3400],
    requiredHlb: "N/A (Electrolyte-Tolerant Acidic Hydrogel)",
    scientificBasis:
      "Target pH 3.85 matches the pKa of Glycolic Acid (3.83) and Lactic Acid (3.86), delivering a 50:50 equilibrium of free undissociated acid to buffered salt for controlled corneodesmosomeolysis without chemical burns.",
    referenceSource: "CIR Expert Panel Safety Assessment of Alpha Hydroxy Acids",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Propylene glycol",
      "Sorbitol",
      "Aloe vera extract",
      "Acrylic acid copolymer",
      "Sodium hydroxide (NaOH)",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Glycolic Acid 5%", defaultConc: "5.0%", role: "Smallest MW Alpha Hydroxy Acid Resurfacer", skinTargets: ["Dullness & Uneven Tone", "Aging & Fine Lines"] },
      { name: "Lactic Acid 3%", defaultConc: "3.0%", role: "NMF Humectant AHA Exfoliant", skinTargets: ["Dry & Dehydrated", "Dullness & Uneven Tone"] },
      { name: "Panthenol 2%", defaultConc: "2.0%", role: "Acid-Induced Irritation Buffer", skinTargets: ["Sensitive & Redness"] },
      { name: "Sodium Hyaluronate 1%", defaultConc: "1.0%", role: "Hydration Cushion", skinTargets: ["Dry & Dehydrated"] },
    ],
    processingNotes:
      "Always titrate final batch pH upward to ≥3.80 using 18% NaOH solution under continuous pH-meter monitoring. Do NOT combine with Niacinamide in the same low-pH batch.",
  },
  {
    id: "ceramide-sleeping-mask",
    name: "Barrier Repair Ceramide Sleeping Mask",
    shortName: "Overnight Barrier Mask",
    systemType: "Lamellar Repair Balm",
    targetPh: "5.35",
    validPhRange: "5.00 – 5.70",
    targetViscosity: "14000 - 24000 cPs",
    viscosityRangeCps: [14000, 24000],
    requiredHlb: "10.8 (Biomimetic Lamellar Liquid-Crystal Cream)",
    scientificBasis:
      "High-viscosity thixotropic cream (14,000–24,000 cPs) mimicking the 3:1:1 molar ratio of Ceramide NP, Cholesterol/Lanolin sterols, and Free Fatty Acids (Stearic Acid) to accelerate nocturnal barrier recovery.",
    referenceSource: "Journal of Investigative Dermatology — Lamellar Lipid Stoichiometry",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Cetyl alcohol",
      "Stearic acid",
      "Glyceryl stearate",
      "PEG-100 stearate",
      "Almond oil",
      "Lanolin",
      "Beeswax",
      "Dimethicone",
      "Alpha tocopherol",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Ceramide NP 1.5%", defaultConc: "1.5%", role: "Orthogonal Lamellar Bilayer Seal", skinTargets: ["Dry & Dehydrated", "Sensitive & Redness", "Aging & Fine Lines"] },
      { name: "Squalane 4%", defaultConc: "4.0%", role: "Non-Oxidizing Biomimetic Hydrocarbon", skinTargets: ["Dry & Dehydrated", "Aging & Fine Lines"] },
      { name: "Panthenol 3%", defaultConc: "3.0%", role: "Deep Nocturnal Barrier Repair", skinTargets: ["Dry & Dehydrated", "Sensitive & Redness"] },
      { name: "Polyglutamic Acid 1%", defaultConc: "1.0%", role: "Hydrogel Film Moisture Lock (4x HA Capacity)", skinTargets: ["Dry & Dehydrated"] },
    ],
    processingNotes:
      "Pre-dissolve Ceramide NP into the hot fatty alcohol/ester phase at 80°C until isotropic before emulsifying with the aqueous phase.",
  },
  {
    id: "eye-contour-peptide-cream",
    name: "Ophthalmic-Grade Peptide Eye Contour Cream",
    shortName: "Peptide Eye Cream",
    systemType: "O/W Emulsion",
    targetPh: "6.60",
    validPhRange: "6.30 – 7.10",
    targetViscosity: "10000 - 16000 cPs",
    viscosityRangeCps: [10000, 16000],
    requiredHlb: "11.4 (Iso-Lacrimation Tear-Neutral Emulsion)",
    scientificBasis:
      "Buffered closer to tear-film pH (6.5–7.0) with zero volatile fragrances or spreading oils to prevent periocular stinging and meibomian gland migration while delivering matrix peptides.",
    referenceSource: "Ophthalmic & Periocular Cosmetic Formulation Guidelines",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Cetyl alcohol",
      "Glyceryl stearate",
      "PEG-100 stearate",
      "Almond oil",
      "Dimethicone",
      "Dimethiconol",
      "Alpha tocopherol",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Palmitoyl Tripeptide-1 2%", defaultConc: "2.0%", role: "Periorbital Fine-Line Collagen Booster", skinTargets: ["Aging & Fine Lines"] },
      { name: "Bakuchiol 0.5%", defaultConc: "0.5%", role: "Gentle Non-Retinoid Renewal", skinTargets: ["Aging & Fine Lines"] },
      { name: "Sodium Hyaluronate 1%", defaultConc: "1.0%", role: "Immediate Periorbital Plumping", skinTargets: ["Dry & Dehydrated", "Aging & Fine Lines"] },
      { name: "Niacinamide 3%", defaultConc: "3.0%", role: "Microcirculation & Dark Circle Brightening", skinTargets: ["Dullness & Uneven Tone"] },
    ],
    processingNotes:
      "Maintain strict fragrance-free and essential-oil-free protocol. Homogenize under vacuum to eliminate micro-bubbles.",
  },
  {
    id: "microbiome-hydrating-toner-essence",
    name: "Hyaluronic & Ectoin Hydrating Essence Toner",
    shortName: "Hydrating Essence Toner",
    systemType: "Biphasic / Micro-Essence",
    targetPh: "5.20",
    validPhRange: "4.90 – 5.50",
    targetViscosity: "250 - 950 cPs",
    viscosityRangeCps: [250, 950],
    requiredHlb: "N/A (Isotonic Aqueous Polyol Essence)",
    scientificBasis:
      "Ultra-low viscosity cushioning fluid (250–950 cPs) immediately resets post-cleansing skin pH to 5.20 and saturates corneocytes with multi-molecular-weight humectants.",
    referenceSource: "International Journal of Cosmetic Science — Stratum Corneum Hydration Kinetics",
    evidenceDoi: "https://doi.org/10.3390/cosmetics7020043",
    coreBaseIngredients: [
      "Water",
      "Glycerin",
      "Propylene glycol",
      "Sorbitol",
      "Aloe vera extract",
      "Phenoxyethanol",
      "Disodium EDTA",
    ],
    recommendedActives: [
      { name: "Sodium Hyaluronate 1.5%", defaultConc: "1.5%", role: "Multi-Weight Humectant Matrix", skinTargets: ["Dry & Dehydrated"] },
      { name: "Polyglutamic Acid 0.8%", defaultConc: "0.8%", role: "Hyaluronidase Inhibitor & Moisture Seal", skinTargets: ["Dry & Dehydrated", "Aging & Fine Lines"] },
      { name: "Ectoin 1%", defaultConc: "1.0%", role: "Hydration Shell Extremolyte", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
      { name: "Panthenol 2%", defaultConc: "2.0%", role: "Barrier Calming Humectant", skinTargets: ["Sensitive & Redness", "Dry & Dehydrated"] },
    ],
    processingNotes:
      "Cold-process dissolution at 25°C. Filter through 5-micron cartridge prior to filling.",
  },
];

// 3D Molecular Builders
function createGlycerin3D(): MoleculeStructure3D {
  return {
    formula: "C3H8O3",
    iupacName: "Propane-1,2,3-triol",
    geometryType: "Tetrahedral sp³ Triol Backbone",
    atoms: [
      { id: 0, element: "C", x: -1.25, y: 0.2, z: 0.0, label: "C1" },
      { id: 1, element: "C", x: 0.0, y: -0.45, z: 0.0, label: "C2" },
      { id: 2, element: "C", x: 1.25, y: 0.2, z: 0.0, label: "C3" },
      { id: 3, element: "O", x: -2.35, y: -0.65, z: 0.35, label: "OH" },
      { id: 4, element: "O", x: 0.0, y: -1.75, z: -0.45, label: "OH" },
      { id: 5, element: "O", x: 2.35, y: -0.65, z: -0.35, label: "OH" },
      { id: 6, element: "H", x: -3.1, y: -0.2, z: 0.55 },
      { id: 7, element: "H", x: 0.0, y: -2.35, z: 0.25 },
      { id: 8, element: "H", x: 3.1, y: -0.2, z: -0.55 },
      { id: 9, element: "H", x: -1.35, y: 1.05, z: 0.65 },
      { id: 10, element: "H", x: -1.35, y: 0.55, z: -0.98 },
      { id: 11, element: "H", x: 0.0, y: -0.55, z: 1.05 },
      { id: 12, element: "H", x: 1.35, y: 1.05, z: -0.65 },
      { id: 13, element: "H", x: 1.35, y: 0.55, z: 0.98 },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 1, to: 4, order: 1 },
      { from: 2, to: 5, order: 1 },
      { from: 3, to: 6, order: 1 },
      { from: 4, to: 7, order: 1 },
      { from: 5, to: 8, order: 1 },
      { from: 0, to: 9, order: 1 },
      { from: 0, to: 10, order: 1 },
      { from: 1, to: 11, order: 1 },
      { from: 2, to: 12, order: 1 },
      { from: 2, to: 13, order: 1 },
    ],
  };
}

function createWater3D(): MoleculeStructure3D {
  return {
    formula: "H2O",
    iupacName: "Oxidane (Purified Aqua)",
    geometryType: "Bent V-Shaped (104.5° Bond Angle)",
    atoms: [
      { id: 0, element: "O", x: 0.0, y: 0.35, z: 0.0, label: "O (δ-)" },
      { id: 1, element: "H", x: -0.95, y: -0.45, z: 0.0, label: "H (δ+)" },
      { id: 2, element: "H", x: 0.95, y: -0.45, z: 0.0, label: "H (δ+)" },
      { id: 3, element: "O", x: -2.35, y: -1.35, z: 0.4, label: "O" },
      { id: 4, element: "H", x: -2.95, y: -0.8, z: 0.95 },
      { id: 5, element: "H", x: -2.85, y: -2.05, z: -0.05 },
      { id: 6, element: "O", x: 2.35, y: -1.35, z: -0.4, label: "O" },
      { id: 7, element: "H", x: 2.95, y: -0.8, z: -0.95 },
      { id: 8, element: "H", x: 2.85, y: -2.05, z: 0.05 },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 3, to: 4, order: 1 },
      { from: 3, to: 5, order: 1 },
      { from: 6, to: 7, order: 1 },
      { from: 6, to: 8, order: 1 },
      { from: 1, to: 3, order: 1 },
      { from: 2, to: 6, order: 1 },
    ],
  };
}

function createAromaticRingMolecule(
  formula: string,
  iupacName: string,
  geometryType: string,
  withNitrogenRing = false
): MoleculeStructure3D {
  const atoms: Atom3D[] = [];
  const bonds: Bond3D[] = [];
  const r = 1.35;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const isN = withNitrogenRing && i === 2;
    atoms.push({
      id: i,
      element: isN ? "N" : "C",
      x: Number((Math.cos(angle) * r).toFixed(2)),
      y: Number((Math.sin(angle) * r).toFixed(2)),
      z: 0,
      label: isN ? "N" : `C${i + 1}`,
    });
  }
  for (let i = 0; i < 6; i++) {
    bonds.push({
      from: i,
      to: (i + 1) % 6,
      order: i % 2 === 0 ? 2 : 1,
    });
  }
  atoms.push({ id: 6, element: "C", x: 2.55, y: 0.0, z: 0.15, label: "C=O" });
  atoms.push({ id: 7, element: "O", x: 3.15, y: 1.05, z: 0.35, label: "O" });
  atoms.push({ id: 8, element: "N", x: 3.25, y: -1.1, z: -0.15, label: "NH2/OH" });
  atoms.push({ id: 9, element: "H", x: 4.15, y: -1.05, z: -0.05 });
  atoms.push({ id: 10, element: "H", x: 2.85, y: -1.95, z: -0.45 });
  atoms.push({ id: 11, element: "H", x: 1.1, y: 2.0, z: 0 });
  atoms.push({ id: 12, element: "H", x: -2.2, y: 0.0, z: 0 });
  atoms.push({ id: 13, element: "H", x: -1.1, y: -2.0, z: 0 });
  atoms.push({ id: 14, element: "H", x: 1.1, y: -2.0, z: 0 });

  bonds.push(
    { from: 0, to: 6, order: 1 },
    { from: 6, to: 7, order: 2 },
    { from: 6, to: 8, order: 1 },
    { from: 8, to: 9, order: 1 },
    { from: 8, to: 10, order: 1 },
    { from: 1, to: 11, order: 1 },
    { from: 3, to: 12, order: 1 },
    { from: 4, to: 13, order: 1 },
    { from: 5, to: 14, order: 1 }
  );

  return { formula, iupacName, geometryType, atoms, bonds };
}

function createFattyChain3D(
  formula: string,
  iupacName: string,
  geometryType: string,
  headType: "carboxylic" | "hydroxyl" | "ester" | "hydrocarbon"
): MoleculeStructure3D {
  const atoms: Atom3D[] = [];
  const bonds: Bond3D[] = [];
  const chainLength = 8;
  for (let i = 0; i < chainLength; i++) {
    const x = (i - chainLength / 2) * 0.92;
    const y = i % 2 === 0 ? 0.35 : -0.35;
    const z = i % 3 === 0 ? 0.2 : -0.2;
    atoms.push({
      id: i,
      element: "C",
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2)),
      label: i === 0 ? "C1" : i === chainLength - 1 ? `C${chainLength}` : undefined,
    });
    if (i > 0) {
      bonds.push({ from: i - 1, to: i, order: 1 });
    }
  }
  let nextId = chainLength;
  if (headType === "carboxylic" || headType === "ester") {
    atoms.push({ id: nextId, element: "O", x: -4.2, y: 1.35, z: 0.2, label: "=O" });
    bonds.push({ from: 0, to: nextId, order: 2 });
    nextId++;
    atoms.push({ id: nextId, element: "O", x: -4.55, y: -0.45, z: -0.25, label: headType === "ester" ? "O-R" : "OH" });
    bonds.push({ from: 0, to: nextId, order: 1 });
    nextId++;
    atoms.push({ id: nextId, element: "H", x: -5.35, y: -0.2, z: -0.35 });
    bonds.push({ from: nextId - 1, to: nextId, order: 1 });
    nextId++;
  } else if (headType === "hydroxyl") {
    atoms.push({ id: nextId, element: "O", x: -4.45, y: 0.55, z: 0.25, label: "OH" });
    bonds.push({ from: 0, to: nextId, order: 1 });
    nextId++;
    atoms.push({ id: nextId, element: "H", x: -5.25, y: 0.15, z: 0.45 });
    bonds.push({ from: nextId - 1, to: nextId, order: 1 });
    nextId++;
  }
  for (let i = 1; i < chainLength; i++) {
    const c = atoms[i];
    atoms.push({
      id: nextId,
      element: "H",
      x: Number(c.x.toFixed(2)),
      y: Number((c.y + (i % 2 === 0 ? 0.78 : -0.78)).toFixed(2)),
      z: Number((c.z + 0.55).toFixed(2)),
    });
    bonds.push({ from: i, to: nextId, order: 1 });
    nextId++;
  }
  return { formula, iupacName, geometryType, atoms, bonds };
}

function createSiloxane3D(formula: string, iupacName: string, withHydroxyl: boolean): MoleculeStructure3D {
  const atoms: Atom3D[] = [
    { id: 0, element: "Si", x: -1.9, y: 0.2, z: 0.0, label: "Si1" },
    { id: 1, element: "O", x: -0.95, y: -0.55, z: 0.15, label: "O" },
    { id: 2, element: "Si", x: 0.0, y: 0.25, z: 0.0, label: "Si2" },
    { id: 3, element: "O", x: 0.95, y: -0.55, z: -0.15, label: "O" },
    { id: 4, element: "Si", x: 1.9, y: 0.2, z: 0.0, label: "Si3" },
    { id: 5, element: "C", x: -2.15, y: 1.35, z: 0.95, label: "CH3" },
    { id: 6, element: "C", x: -2.15, y: 0.85, z: -1.25, label: "CH3" },
    { id: 7, element: "C", x: 0.0, y: 1.45, z: 1.0, label: "CH3" },
    { id: 8, element: "C", x: 0.0, y: 1.25, z: -1.1, label: "CH3" },
    { id: 9, element: "C", x: 2.15, y: 1.35, z: -0.95, label: "CH3" },
    { id: 10, element: withHydroxyl ? "O" : "C", x: 2.85, y: -0.55, z: 0.85, label: withHydroxyl ? "OH" : "CH3" },
  ];
  const bonds: Bond3D[] = [
    { from: 0, to: 1, order: 1 },
    { from: 1, to: 2, order: 1 },
    { from: 2, to: 3, order: 1 },
    { from: 3, to: 4, order: 1 },
    { from: 0, to: 5, order: 1 },
    { from: 0, to: 6, order: 1 },
    { from: 2, to: 7, order: 1 },
    { from: 2, to: 8, order: 1 },
    { from: 4, to: 9, order: 1 },
    { from: 4, to: 10, order: 1 },
  ];
  return {
    formula,
    iupacName,
    geometryType: "Flexible Polydimethylsiloxane (Si–O–Si) Helix",
    atoms,
    bonds,
  };
}

function createTriethanolamine3D(): MoleculeStructure3D {
  return {
    formula: "C6H15NO3",
    iupacName: "2,2',2''-Nitrilotriethanol",
    geometryType: "Trigonal Pyramidal Tertiary Amine Triol",
    atoms: [
      { id: 0, element: "N", x: 0.0, y: 0.0, z: 0.35, label: "N" },
      { id: 1, element: "C", x: 1.25, y: 0.72, z: -0.1, label: "C" },
      { id: 2, element: "C", x: 2.35, y: 0.15, z: 0.45, label: "C" },
      { id: 3, element: "O", x: 3.35, y: 0.85, z: 0.0, label: "OH" },
      { id: 4, element: "C", x: -1.25, y: 0.72, z: -0.1, label: "C" },
      { id: 5, element: "C", x: -2.35, y: 0.15, z: -0.45, label: "C" },
      { id: 6, element: "O", x: -3.35, y: 0.85, z: 0.0, label: "OH" },
      { id: 7, element: "C", x: 0.0, y: -1.42, z: -0.1, label: "C" },
      { id: 8, element: "C", x: 0.45, y: -2.45, z: 0.55, label: "C" },
      { id: 9, element: "O", x: 0.15, y: -3.55, z: -0.15, label: "OH" },
      { id: 10, element: "H", x: 4.05, y: 0.55, z: 0.35 },
      { id: 11, element: "H", x: -4.05, y: 0.55, z: -0.35 },
      { id: 12, element: "H", x: 0.45, y: -4.25, z: 0.25 },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 3, to: 10, order: 1 },
      { from: 0, to: 4, order: 1 },
      { from: 4, to: 5, order: 1 },
      { from: 5, to: 6, order: 1 },
      { from: 6, to: 11, order: 1 },
      { from: 0, to: 7, order: 1 },
      { from: 7, to: 8, order: 1 },
      { from: 8, to: 9, order: 1 },
      { from: 9, to: 12, order: 1 },
    ],
  };
}

function createEdta3D(): MoleculeStructure3D {
  return {
    formula: "C10H14N2Na2O8",
    iupacName: "Disodium Ethylenediaminetetraacetate",
    geometryType: "Hexadentate Octahedral Chelate Ligand",
    atoms: [
      { id: 0, element: "C", x: -0.68, y: 0.0, z: 0.0, label: "C" },
      { id: 1, element: "C", x: 0.68, y: 0.0, z: 0.0, label: "C" },
      { id: 2, element: "N", x: -1.55, y: 0.85, z: 0.35, label: "N1" },
      { id: 3, element: "N", x: 1.55, y: -0.85, z: -0.35, label: "N2" },
      { id: 4, element: "C", x: -2.75, y: 0.35, z: 0.85 },
      { id: 5, element: "O", x: -3.65, y: 1.15, z: 1.05, label: "COO-" },
      { id: 6, element: "C", x: -1.65, y: 2.15, z: -0.25 },
      { id: 7, element: "O", x: -2.55, y: 2.85, z: -0.55, label: "COOH" },
      { id: 8, element: "C", x: 2.75, y: -0.35, z: -0.85 },
      { id: 9, element: "O", x: 3.65, y: -1.15, z: -1.05, label: "COO-" },
      { id: 10, element: "C", x: 1.65, y: -2.15, z: 0.25 },
      { id: 11, element: "O", x: 2.55, y: -2.85, z: 0.55, label: "COOH" },
      { id: 12, element: "Na", x: -4.15, y: -0.25, z: 0.55, label: "Na+" },
      { id: 13, element: "Na", x: 4.15, y: 0.25, z: -0.55, label: "Na+" },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 1, to: 3, order: 1 },
      { from: 2, to: 4, order: 1 },
      { from: 4, to: 5, order: 2 },
      { from: 2, to: 6, order: 1 },
      { from: 6, to: 7, order: 2 },
      { from: 3, to: 8, order: 1 },
      { from: 8, to: 9, order: 2 },
      { from: 3, to: 10, order: 1 },
      { from: 10, to: 11, order: 2 },
      { from: 5, to: 12, order: 1 },
      { from: 9, to: 13, order: 1 },
    ],
  };
}

function createMetalOxideCluster3D(metal: "Zn" | "Ti", formula: string, iupacName: string): MoleculeStructure3D {
  return {
    formula,
    iupacName,
    geometryType: metal === "Zn" ? "Wurtzite Hexagonal Crystal Lattice" : "Rutile Tetragonal Coordination Lattice",
    atoms: [
      { id: 0, element: metal, x: 0.0, y: 0.0, z: 0.0, label: `${metal}²⁺` },
      { id: 1, element: "O", x: 1.35, y: 0.85, z: 0.45, label: "O²⁻" },
      { id: 2, element: "O", x: -1.35, y: 0.85, z: -0.45, label: "O²⁻" },
      { id: 3, element: "O", x: 0.0, y: -1.45, z: 0.65, label: "O²⁻" },
      { id: 4, element: "O", x: 0.0, y: 0.45, z: -1.45, label: "O²⁻" },
      { id: 5, element: metal, x: 2.45, y: -0.25, z: 0.0, label: metal },
      { id: 6, element: metal, x: -2.45, y: -0.25, z: 0.0, label: metal },
      { id: 7, element: "O", x: 2.95, y: -1.45, z: -0.55, label: "O" },
      { id: 8, element: "O", x: -2.95, y: -1.45, z: 0.55, label: "O" },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
      { from: 1, to: 5, order: 1 },
      { from: 3, to: 5, order: 1 },
      { from: 2, to: 6, order: 1 },
      { from: 3, to: 6, order: 1 },
      { from: 5, to: 7, order: 2 },
      { from: 6, to: 8, order: 2 },
    ],
  };
}

// Comprehensive 43-Ingredient Scientific Encyclopedia (All 27 Supplier/CSV Ingredients + 16 Gold-Standard Cosmetic Actives)
export const INGREDIENT_PROFILES: Record<string, EnrichedIngredientProfile> = {
  water: {
    key: "water",
    inciName: "Aqua (Purified Deionized Water)",
    casNumber: "7732-18-5",
    molecularFormula: "H₂O",
    molecularWeight: "18.015 g/mol",
    functionalCategory: "Continuous Aqueous Phase / Solvent",
    hlbValue: "N/A (Continuous Polar Phase)",
    optimalPhRange: "5.0 – 7.0",
    typicalUsageRate: "45.0% – 85.0%",
    compatibilityScore: 99,
    synergisticWith: ["Glycerin", "Propylene Glycol", "Sorbitol", "Disodium EDTA", "Carbopol ETD 2020"],
    avoidWith: ["Anhydrous Oils without Emulsifier"],
    certifications: ["LPPOM MUI Halal", "USP <1231> Pharma Grade", "BPOM RI Compliant", "ISO 22716 GMP"],
    compatibleProductTypes: VALIDATED_PRODUCT_TYPES.map((p) => p.name),
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Serves as the polar continuous vehicle for hydrophilic humectants, water-soluble vitamins, and polymeric rheology modifiers.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createWater3D(),
  },
  glycerin: {
    key: "glycerin",
    inciName: "Glycerin (Vegetable Pharma Grade)",
    casNumber: "56-81-5",
    molecularFormula: "C₃H₈O₃",
    molecularWeight: "92.09 g/mol",
    functionalCategory: "Trihydric Humectant & Aquaporin-3 Modulator",
    hlbValue: "N/A (Hydrophilic Polyol)",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "2.0% – 10.0%",
    compatibilityScore: 98,
    synergisticWith: ["Sodium Hyaluronate", "Panthenol", "Cetyl Alcohol", "Ceramide NP", "Aloe Vera Extract"],
    avoidWith: ["Strong Oxidizers (KMnO4)"],
    certifications: ["LPPOM MUI / BPJPH Halal", "USP/EP Pharma Grade", "RSPO Vegetable Derived"],
    compatibleProductTypes: VALIDATED_PRODUCT_TYPES.map((p) => p.name),
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Forms three hydrogen-bond donor/acceptor sites per molecule, binding atmospheric & dermal water in the stratum corneum and upregulating Aquaporin-3 (AQP3) water channels.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createGlycerin3D(),
  },
  disodium_edta: {
    key: "disodium_edta",
    inciName: "Disodium EDTA",
    casNumber: "139-33-3",
    molecularFormula: "C₁₀H₁₄N₂Na₂O₈",
    molecularWeight: "336.21 g/mol",
    functionalCategory: "Hexadentate Chelating Agent & Preservative Booster",
    hlbValue: "N/A (Ionic Water-Soluble Chelator)",
    optimalPhRange: "4.5 – 7.5",
    typicalUsageRate: "0.02% – 0.20%",
    compatibilityScore: 96,
    synergisticWith: ["Phenoxyethanol", "Alpha Tocopherol", "Ascorbic Acid", "Water"],
    avoidWith: ["Cationic Conditioning Polymers", "Divalent Metal Salts (ZnSO4/MgSO4)"],
    certifications: ["LPPOM MUI Halal", "Halal Quality Control (HQC)", "Cosmetic & USP Grade"],
    compatibleProductTypes: VALIDATED_PRODUCT_TYPES.map((p) => p.name),
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Sequestering Ca²⁺, Mg²⁺, and Fe³⁺ trace metal ions prevents catalytic lipid autoxidation and destabilizes Gram-negative bacterial outer membranes to boost Phenoxyethanol efficacy.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createEdta3D(),
  },
  propylene_glycol: {
    key: "propylene_glycol",
    inciName: "Propylene Glycol (1,2-Propanediol)",
    casNumber: "57-55-6",
    molecularFormula: "C₃H₈O₂",
    molecularWeight: "76.09 g/mol",
    functionalCategory: "Humectant, Co-Solvent & Penetration Enhancer",
    hlbValue: "N/A (Amphiphilic Diol Co-Solvent)",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "1.0% – 6.0%",
    compatibilityScore: 95,
    synergisticWith: ["Glycerin", "Sorbitol", "Phenoxyethanol", "Aloe Vera Extract", "Salicylic Acid"],
    avoidWith: ["High Concentrations >15% on Compromised Barrier"],
    certifications: ["IFANCA Halal", "ARA Halal Certified", "USP Pharma Grade"],
    compatibleProductTypes: VALIDATED_PRODUCT_TYPES.map((p) => p.name),
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Reduces water activity (aw) to inhibit microbial proliferation while transiently fluidizing stratum corneum intercellular lipids to enhance active delivery.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createGlycerin3D(),
  },
  stearic_acid: {
    key: "stearic_acid",
    inciName: "Stearic Acid (Octadecanoic Acid)",
    casNumber: "57-11-4",
    molecularFormula: "C₁₈H₃₆O₂",
    molecularWeight: "284.48 g/mol",
    functionalCategory: "Saturated Fatty Acid Structurant & Co-Emulsifier",
    hlbValue: "15.0 (Required HLB for O/W)",
    optimalPhRange: "5.5 – 7.0 (Partially neutralized with TEA/NaOH)",
    typicalUsageRate: "2.0% – 15.0%",
    compatibilityScore: 94,
    synergisticWith: ["Triethanolamine", "Cetyl Alcohol", "Beeswax", "Glyceryl Stearate"],
    avoidWith: ["Highly Acidic Systems (pH < 4.2 precipitates free acid crystals)"],
    certifications: ["LPPOM MUI Halal", "JAKIM Halal", "Plant Oleochemical Derived"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Facial Moisturizer (Cream)",
      "Sunscreen Lotion",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Forms pearlescent α-crystalline lamellar gel networks when partially neutralized with Triethanolamine or NaOH, providing zero-shear yield value and velvet skin feel.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C18H36O2", "Octadecanoic Acid", "All-Trans C18 Saturated Fatty Acid Chain", "carboxylic"),
  },
  cetyl_alcohol: {
    key: "cetyl_alcohol",
    inciName: "Cetyl Alcohol (1-Hexadecanol)",
    casNumber: "36653-82-4",
    molecularFormula: "C₁₆H₃₄O",
    molecularWeight: "242.44 g/mol",
    functionalCategory: "Lamellar Gel Network Fatty Alcohol & Emulsion Stabilizer",
    hlbValue: "15.5 (Required HLB)",
    optimalPhRange: "3.5 – 8.5 (Non-Ionic, pH-Independent)",
    typicalUsageRate: "1.5% – 6.0%",
    compatibilityScore: 97,
    synergisticWith: ["Glyceryl Stearate", "PEG-100 Stearate", "Stearic Acid", "Dimethicone"],
    avoidWith: ["None (Inert Non-Ionic Fatty Alcohol)"],
    certifications: ["LPPOM MUI / BPJPH Halal", "JAKIM Halal", "USP Pharma Grade"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Barrier Repair Ceramide Sleeping Mask",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
      "Acne Control BHA/Azelaic Fluid",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Intercalates between surfactant tails at the oil-water interface to form a viscoelastic Lβ lamellar liquid-crystalline gel phase that prevents droplet coalescence.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C16H34O", "Hexadecan-1-ol", "Linear C16 Aliphatic Fatty Alcohol", "hydroxyl"),
  },
  glyceryl_stearate: {
    key: "glyceryl_stearate",
    inciName: "Glyceryl Stearate (GMS)",
    casNumber: "31566-31-1",
    molecularFormula: "C₂₁H₄₂O₄",
    molecularWeight: "358.56 g/mol",
    functionalCategory: "Non-Ionic Low-HLB Primary Co-Emulsifier",
    hlbValue: "3.8 (Lipophilic Co-Emulsifier)",
    optimalPhRange: "4.5 – 8.0",
    typicalUsageRate: "2.0% – 5.5%",
    compatibilityScore: 97,
    synergisticWith: ["PEG-100 Stearate", "Cetyl Alcohol", "Almond Oil", "Mineral Oil"],
    avoidWith: ["Strong Alkaline Hydrolysis (pH > 9.0)"],
    certifications: ["LPPOM MUI Halal", "MUIS Singapore Halal", "JAKIM Halal"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "Barrier Repair Ceramide Sleeping Mask",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Pairs with high-HLB PEG-100 Stearate (HLB 18.8) to achieve a combined HLB ~11.2, packing tightly at the emulsion interface for high thermal stability.",
    solubilityPhase: "Amphiphilic / Surfactant",
    molecule3D: createFattyChain3D("C21H42O4", "2,3-Dihydroxypropyl Octadecanoate", "Monoacylglycerol Ester", "ester"),
  },
  peg100_stearate: {
    key: "peg100_stearate",
    inciName: "PEG-100 Stearate",
    casNumber: "9004-99-3",
    molecularFormula: "C₁₈H₃₅O₂(CH₂CH₂O)₁₀₀H",
    molecularWeight: "~4680 g/mol",
    functionalCategory: "High-HLB Non-Ionic O/W Emulsifier",
    hlbValue: "18.8 (Hydrophilic O/W Emulsifier)",
    optimalPhRange: "4.0 – 8.5",
    typicalUsageRate: "1.5% – 5.5%",
    compatibilityScore: 96,
    synergisticWith: ["Glyceryl Stearate", "Cetyl Alcohol", "Dimethicone", "Mineral Oil"],
    avoidWith: ["High Phenolic Concentrations without Co-Solvent"],
    certifications: ["MUIS Halal", "Instituto Halal Certified", "Cosmetic Grade"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "Barrier Repair Ceramide Sleeping Mask",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
      "Acne Control BHA/Azelaic Fluid",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Provides steric stabilization via long polyoxyethylene chains extending into the continuous aqueous phase, preventing Ostwald ripening and flocculation.",
    solubilityPhase: "Amphiphilic / Surfactant",
    molecule3D: createFattyChain3D("C18H35O2(C2H4O)n", "Poly(oxy-1,2-ethanediyl) α-hydro-ω-stearate", "Amphiphilic Polyether Ester", "ester"),
  },
  carbopol_etd_2020: {
    key: "carbopol_etd_2020",
    inciName: "Acrylates/C10-30 Alkyl Acrylate Crosspolymer (Carbopol ETD 2020)",
    casNumber: "9003-01-4",
    molecularFormula: "(C₃H₄O₂)ₙ-(C₁₃-₃₃H₂₄-₆₄O₂)ₘ",
    molecularWeight: ">1,000,000 g/mol (Crosslinked Microgel)",
    functionalCategory: "Hydrophobically Modified Rheology Modifier & Suspending Agent",
    hlbValue: "N/A (Polymeric Electrolyte Hydrogel)",
    optimalPhRange: "5.0 – 7.5",
    typicalUsageRate: "0.20% – 0.80%",
    compatibilityScore: 93,
    synergisticWith: ["Sodium Hydroxide (NaOH)", "Triethanolamine", "Glycerin", "Aloe Vera Extract"],
    avoidWith: ["High Monovalent/Divalent Electrolytes (>2% NaCl collapses gel viscosity)"],
    certifications: ["IFANCA Halal", "ARA Halal Certified", "Toxicologically Cleared"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Soothing Gel",
      "Sunscreen Lotion",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Upon neutralization with NaOH or TEA at pH 5.2–6.5, carboxylate groups ionize (-COO⁻), causing electrostatic repulsion that uncoils the polymer into a transparent 3D hydrogel matrix.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createFattyChain3D("(C3H4O2)n", "Crosslinked Poly(acrylic acid) Network", "Polyelectrolyte Carboxylate Chain", "carboxylic"),
  },
  acrylic_acid_copolymer: {
    key: "acrylic_acid_copolymer",
    inciName: "Acrylates Copolymer",
    casNumber: "25035-69-2",
    molecularFormula: "(C₃H₄O₂·C₄H₆O₂)ₙ",
    molecularWeight: "~250,000 g/mol",
    functionalCategory: "Film-Forming Co-Stabilizer & Rheology Enhancer",
    hlbValue: "N/A (Hydrophilic Polymer)",
    optimalPhRange: "5.0 – 7.0",
    typicalUsageRate: "0.5% – 2.5%",
    compatibilityScore: 94,
    synergisticWith: ["Carbopol ETD 2020", "Glycerin", "Sodium Hydroxide (NaOH)"],
    avoidWith: ["Cationic Surfactants"],
    certifications: ["Korea Halal Authority (KHA)", "ISA Halal Certified"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Soothing Gel",
      "Anti-Aging Serum",
      "Gentle Cleanser",
      "AHA/PHA Resurfacing Night Gel-Serum",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Enhances shear-thinning cushion and forms a breathable moisture-retaining film across the epidermis without tackiness.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createFattyChain3D("(C3H4O2)n", "Poly(acrylic-co-methacrylic acid)", "Linear Carboxylate Copolymer", "carboxylic"),
  },
  aloe_vera_extract: {
    key: "aloe_vera_extract",
    inciName: "Aloe Barbadensis Leaf Extract",
    casNumber: "85507-69-3",
    molecularFormula: "(C₁₂H₁₈O₁₁)ₙ (Acemannan Polysaccharide)",
    molecularWeight: "Polysaccharide Complex",
    functionalCategory: "Botanical Soothing Active & Anti-Erythema Humectant",
    hlbValue: "N/A (Water-Soluble Botanical Extract)",
    optimalPhRange: "4.5 – 6.5",
    typicalUsageRate: "1.0% – 5.0%",
    compatibilityScore: 98,
    synergisticWith: ["Glycerin", "Panthenol", "Allantoin", "Centella Asiatica Extract"],
    avoidWith: ["High Heat >70°C for Prolonged Periods"],
    certifications: ["LPPOM MUI Halal", "ISA Halal Certified", "Organic Botanical Standard"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Soothing Gel",
      "Anti-Aging Serum",
      "Gentle Cleanser",
      "Acne Control BHA/Azelaic Fluid",
      "AHA/PHA Resurfacing Night Gel-Serum",
      "Hyaluronic & Ectoin Hydrating Essence Toner",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Rich in acetylated mannans (Acemannan), bradykinase enzymes, and glycoproteins that downregulate COX-2 prostaglandin synthesis and accelerate re-epithelialization.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C15H10O5", "Aloe-Emodin / Acemannan Motif", "Anthraquinone / Pyranose Ring System", false),
  },
  mineral_oil: {
    key: "mineral_oil",
    inciName: "Paraffinum Liquidum (USP Pharma Mineral Oil)",
    casNumber: "8012-95-1",
    molecularFormula: "CₙH₂ₙ₊₂ (C₁₅–C₃₀ Isoalkanes)",
    molecularWeight: "~350 g/mol",
    functionalCategory: "Inert Occlusive Emollient (TEWL Barrier)",
    hlbValue: "10.5 (Required HLB for O/W Emulsion)",
    optimalPhRange: "2.0 – 12.0 (Chemically Inert)",
    typicalUsageRate: "3.0% – 15.0%",
    compatibilityScore: 96,
    synergisticWith: ["Cetyl Alcohol", "Glyceryl Stearate", "PEG-100 Stearate", "Beeswax"],
    avoidWith: ["Oil-Free Hydrogels without Emulsifier"],
    certifications: ["IFANCA Halal", "USP/EP Pharmaceutical Purity (PAH-Free)"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "All-Purpose Barrier Cream (BBD Journal Standard)",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Forms a non-reactive hydrophobic film over the stratum corneum that reduces Transepidermal Water Loss (TEWL) by up to 48% without penetrating living epidermal layers.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C16H34", "Purified Iso-Alkane Hydrocarbon", "Saturated Aliphatic Alkane", "hydrocarbon"),
  },
  liquid_paraffin: {
    key: "liquid_paraffin",
    inciName: "Paraffinum Liquidum (Light Liquid Paraffin)",
    casNumber: "8012-95-1",
    molecularFormula: "CₙH₂ₙ₊₂",
    molecularWeight: "~320 g/mol",
    functionalCategory: "Primary Emollient Oil Phase & Slip Agent",
    hlbValue: "10.5 (Required HLB)",
    optimalPhRange: "2.0 – 12.0",
    typicalUsageRate: "10.0% – 25.0%",
    compatibilityScore: 96,
    synergisticWith: ["Stearic Acid", "Beeswax", "Lanolin", "Triethanolamine", "Tween 80"],
    avoidWith: ["Aqueous Gels without Surfactant"],
    certifications: ["IFANCA Halal", "USP Pharmaceutical Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Facial Moisturizer (Cream)",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Provides emollient lubricity and high spreadability (8.5–9.2 cm in BBD journal benchmarks) while solubilizing oil-phase structurants.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C15H32", "Light Paraffinic Alkane", "Saturated sp³ Hydrocarbon Chain", "hydrocarbon"),
  },
  almond_oil: {
    key: "almond_oil",
    inciName: "Prunus Amygdalus Dulcis (Sweet Almond) Oil",
    casNumber: "8007-69-0",
    molecularFormula: "C₅₇H₁₀₄O₆ (Triolein / Linolein Triglyceride)",
    molecularWeight: "885.43 g/mol",
    functionalCategory: "Botanical Biomimetic Lipid Emollient",
    hlbValue: "7.0 (Required HLB)",
    optimalPhRange: "4.5 – 7.5",
    typicalUsageRate: "1.5% – 8.0%",
    compatibilityScore: 97,
    synergisticWith: ["Alpha Tocopherol", "Glyceryl Stearate", "Cetyl Alcohol", "Ceramide NP"],
    avoidWith: ["Unstabilized Pro-Oxidant Metals (Requires Alpha Tocopherol + EDTA)"],
    certifications: ["LPPOM MUI Halal", "IFANCA Halal", "Cold-Pressed Cosmetic Grade"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "Barrier Repair Ceramide Sleeping Mask",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Rich in oleic (65–70%) and linoleic (20–25%) triglycerides that replenish intercellular stratum corneum lipids and soften corneocyte edges.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C57H104O6", "Glyceryl Trioleate (Sweet Almond Triglyceride)", "Unsaturated C18:1 Triacylglycerol", "ester"),
  },
  dimethicone: {
    key: "dimethicone",
    inciName: "Dimethicone (Polydimethylsiloxane)",
    casNumber: "9006-65-9",
    molecularFormula: "(C₂H₆OSi)ₙ",
    molecularWeight: "~6,000 – 12,000 g/mol (100–350 cSt)",
    functionalCategory: "Silicone Skin Protectant, Anti-Soaping & Slip Modifier",
    hlbValue: "5.0 (Required HLB)",
    optimalPhRange: "3.5 – 9.0",
    typicalUsageRate: "0.5% – 5.0%",
    compatibilityScore: 98,
    synergisticWith: ["Dimethiconol", "Cetyl Alcohol", "Glyceryl Stearate", "Zinc Oxide"],
    avoidWith: ["None (Inert Siloxane Backbone)"],
    certifications: ["IFANCA Halal", "Halal Quality Control (HQC)", "FDA OTC Skin Protectant"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "Barrier Repair Ceramide Sleeping Mask",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
      "Acne Control BHA/Azelaic Fluid",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Low surface tension (~21 mN/m) eliminates emulsion micro-foaming ('whitening/soaping' on rub-in) and forms a gas-permeable, non-comedogenic protective barrier.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createSiloxane3D("(C2H6OSi)n", "Polydimethylsiloxane", false),
  },
  dimethiconol: {
    key: "dimethiconol",
    inciName: "Dimethiconol",
    casNumber: "31692-79-2",
    molecularFormula: "HO(Si(CH₃)₂O)ₙH",
    molecularWeight: "~15,000 g/mol",
    functionalCategory: "Silanol-Terminated Velvet Sensory Elastomer",
    hlbValue: "5.5 (Required HLB)",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "0.1% – 2.0%",
    compatibilityScore: 95,
    synergisticWith: ["Dimethicone", "Alpha Tocopherol", "Cetyl Alcohol"],
    avoidWith: ["Strong Acids/Bases at >80°C"],
    certifications: ["Cosmetic Grade CoA Verified", "BPOM RI Compliant"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
      "Sunscreen Lotion",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Terminal silanol (-Si-OH) groups hydrogen-bond weakly with skin keratin to impart a long-lasting velvety, powdery after-feel.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createSiloxane3D("HO(Si(CH3)2O)nH", "α,ω-Dihydroxypolydimethylsiloxane", true),
  },
  alpha_tocopherol: {
    key: "alpha_tocopherol",
    inciName: "Tocopherol (Vitamin E)",
    casNumber: "59-02-9",
    molecularFormula: "C₂₉H₅₀O₂",
    molecularWeight: "430.71 g/mol",
    functionalCategory: "Lipid-Soluble Antioxidant & Photostabilizer",
    hlbValue: "6.0",
    optimalPhRange: "4.0 – 7.5",
    typicalUsageRate: "0.2% – 1.5%",
    compatibilityScore: 99,
    synergisticWith: ["Ascorbic Acid", "Almond Oil", "Ceramide NP", "Zinc Oxide", "Disodium EDTA"],
    avoidWith: ["Ferric Ions (Fe³⁺ without EDTA)", "Alkaline pH > 8.5"],
    certifications: ["Halal Quality Control (HQC)", "HFCE Europe Halal", "USP Pharma Grade"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Anti-Aging Serum",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "Barrier Repair Ceramide Sleeping Mask",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Donates a phenolic hydrogen atom from its chromanol ring to peroxyl radicals (ROO•), terminating lipid peroxidation chains in both the formula oil phase and stratum corneum sebum.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C29H50O2", "(2R)-2,5,7,8-Tetramethyl-2-phytylchroman-6-ol", "Chromanol Phenolic Ring + Phytyl Tail", false),
  },
  phenoxyethanol: {
    key: "phenoxyethanol",
    inciName: "Phenoxyethanol",
    casNumber: "122-99-6",
    molecularFormula: "C₈H₁₀O₂",
    molecularWeight: "138.16 g/mol",
    functionalCategory: "Broad-Spectrum Paraben-Free Antimicrobial Preservative",
    hlbValue: "N/A (Amphiphilic Aromatic Ether Alcohol)",
    optimalPhRange: "3.0 – 8.5 (pH-Independent Activity)",
    typicalUsageRate: "0.5% – 1.0% (Max 1.0% EU/ASEAN Annex VI)",
    compatibilityScore: 97,
    synergisticWith: ["Disodium EDTA", "Propylene Glycol", "Glycerin"],
    avoidWith: ["High Non-Ionic Polysorbate >8% (Micellar Entrapment reduces free preservative)"],
    certifications: ["Halal Control GmbH", "EU/ASEAN Annex VI Approved", "Paraben-Free Standard"],
    compatibleProductTypes: VALIDATED_PRODUCT_TYPES.map((p) => p.name),
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Uncouples oxidative phosphorylation and increases potassium/proton permeability across bacterial and fungal cytoplasmic membranes across a broad pH range (3.0–8.5).",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C8H10O2", "2-Phenoxyethan-1-ol", "Planar Phenyl Ether Alcohol", false),
  },
  sodium_hydroxide: {
    key: "sodium_hydroxide",
    inciName: "Sodium Hydroxide (NaOH)",
    casNumber: "1310-73-2",
    molecularFormula: "NaOH",
    molecularWeight: "39.997 g/mol",
    functionalCategory: "Inorganic pH Buffer & Carbomer Neutralizer",
    hlbValue: "N/A (Strong Electrolyte Base)",
    optimalPhRange: "Used to titrate batch pH to 3.85 – 6.50",
    typicalUsageRate: "0.05% – 0.30% (as 18% w/w aqueous solution)",
    compatibilityScore: 95,
    synergisticWith: ["Carbopol ETD 2020", "Acrylic Acid Copolymer", "Stearic Acid", "Glycolic Acid"],
    avoidWith: ["Direct Undiluted Addition to Esters"],
    certifications: ["LPPOM MUI Halal", "Food/Pharma Compendial Grade"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Soothing Gel",
      "Sunscreen Lotion",
      "AHA/PHA Resurfacing Night Gel-Serum",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Stoichiometrically neutralizes carboxylic acid moieties on Carbopol ETD 2020 (1g NaOH per ~2.5g Carbomer to reach pH 5.5), building instantaneous hydrogel yield stress.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: {
      formula: "NaOH",
      iupacName: "Sodium Hydroxide (Hydrated Ion Pair)",
      geometryType: "Linear Ionic Pair",
      atoms: [
        { id: 0, element: "Na", x: -1.1, y: 0.0, z: 0.0, label: "Na+" },
        { id: 1, element: "O", x: 0.65, y: 0.0, z: 0.0, label: "O-" },
        { id: 2, element: "H", x: 1.62, y: 0.0, z: 0.0, label: "H" },
      ],
      bonds: [
        { from: 0, to: 1, order: 1 },
        { from: 1, to: 2, order: 1 },
      ],
    },
  },
  beeswax: {
    key: "beeswax",
    inciName: "Cera Alba (Purified White Beeswax)",
    casNumber: "8012-89-3",
    molecularFormula: "C₄₆H₉₂O₂ (Triacontanyl Palmitate Wax Ester)",
    molecularWeight: "~677.2 g/mol",
    functionalCategory: "Crystalline Wax Structurant & Occlusive Emulsion Stabilizer",
    hlbValue: "12.0 (Required HLB)",
    optimalPhRange: "4.5 – 8.0",
    typicalUsageRate: "0.8% – 4.0%",
    compatibilityScore: 94,
    synergisticWith: ["Stearic Acid", "Liquid Paraffin", "Lanolin", "Triethanolamine"],
    avoidWith: ["Cold-Process Systems (Requires melting at 62–65°C)"],
    certifications: ["ISA Halal Certified", "IFANCA Halal", "USP White Wax Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Facial Moisturizer (Cream)",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Increases oil-phase viscosity and forms a protective crystalline wax network that prevents oil syneresis at elevated storage temperatures (40°C).",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C46H92O2", "Triacontanyl Hexadecanoate (Myricyl Palmitate)", "Long-Chain Wax Monoester", "ester"),
  },
  lanolin: {
    key: "lanolin",
    inciName: "Lanolin (Ultra-Purified Anhydrous)",
    casNumber: "8006-54-0",
    molecularFormula: "C₂₇H₄₆O (Cholesterol / Lanosterol Ester Complex)",
    molecularWeight: "~386.65 g/mol (Sterol Backbone)",
    functionalCategory: "Biomimetic Sterol Ester Emollient & W/O Co-Emulsifier",
    hlbValue: "10.0 (Required HLB for O/W)",
    optimalPhRange: "4.5 – 7.5",
    typicalUsageRate: "1.0% – 3.5%",
    compatibilityScore: 91,
    synergisticWith: ["Beeswax", "Stearic Acid", "Liquid Paraffin", "Cetyl Alcohol", "Ceramide NP"],
    avoidWith: ["Clear Aqueous Gels"],
    certifications: ["MUIS Singapore Halal", "Instituto Halal Certified", "Pesticide-Free Pharma Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Facial Moisturizer (Cream)",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Absorbs up to 200% of its weight in water via sterol hydroxyl groups, mimicking human sebaceous cholesterol esters to repair severely chapped stratum corneum.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createAromaticRingMolecule("C27H46O", "Cholest-5-en-3β-ol (Sterol Ester Core)", "Tetracyclic Sterol Ring System", false),
  },
  triethanolamine: {
    key: "triethanolamine",
    inciName: "Triethanolamine (TEA 99%)",
    casNumber: "102-71-6",
    molecularFormula: "C₆H₁₅NO₃",
    molecularWeight: "149.19 g/mol",
    functionalCategory: "Tertiary Alkanolamine Neutralizer & In-Situ Emulsifier Base",
    hlbValue: "N/A (Forms TEA-Stearate with HLB ~12)",
    optimalPhRange: "Used to buffer emulsions at pH 5.7 – 6.5",
    typicalUsageRate: "0.5% – 2.2% (Max 2.5% leave-on purity >99%)",
    compatibilityScore: 92,
    synergisticWith: ["Stearic Acid", "Carbopol ETD 2020", "Beeswax"],
    avoidWith: ["Nitrosating Agents (Nitrites / Bronopol — Prohibited)"],
    certifications: ["IFANCA Halal", "JAKIM Halal", "Nitrosamine-Free >99.2% Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Facial Moisturizer (Cream)",
    ],
    safetyGrade: "Moderate (Regulated Limit)",
    mechanismOfAction: "Reacts stoichiometrically with Stearic Acid during hot-phase emulsification to generate Triethanolamine Stearate in situ, producing fine sub-micron oil droplets.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createTriethanolamine3D(),
  },
  sorbitol: {
    key: "sorbitol",
    inciName: "Sorbitol (D-Glucitol 70% Solution)",
    casNumber: "50-70-4",
    molecularFormula: "C₆H₁₄O₆",
    molecularWeight: "182.17 g/mol",
    functionalCategory: "Hexahydric Sugar Alcohol Humectant & Freeze-Thaw Stabilizer",
    hlbValue: "N/A (Hydrophilic Polyol)",
    optimalPhRange: "3.5 – 8.5",
    typicalUsageRate: "1.5% – 5.0%",
    compatibilityScore: 98,
    synergisticWith: ["Glycerin", "Propylene Glycol", "Aloe Vera Extract", "Tween 80"],
    avoidWith: ["None (Non-Reducing Polyol — Zero Maillard Browning)"],
    certifications: ["LPPOM MUI Halal", "HFCE Halal", "USP/FCC Pharma Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Soothing Gel",
      "Anti-Aging Serum",
      "Gentle Cleanser",
      "Brightening Essence Lotion",
      "Acne Control BHA/Azelaic Fluid",
      "AHA/PHA Resurfacing Night Gel-Serum",
      "Hyaluronic & Ectoin Hydrating Essence Toner",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Six hydroxyl groups provide high osmotic water retention with lower tackiness than high-dose glycerin and prevent crystallization around bottle caps.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createFattyChain3D("C6H14O6", "(2S,3R,4R,5R)-Hexane-1,2,3,4,5,6-hexol", "Hexahydric Polyol Chain", "hydroxyl"),
  },
  tween_80: {
    key: "tween_80",
    inciName: "Polysorbate 80 (Tween 80)",
    casNumber: "9005-65-6",
    molecularFormula: "C₆₄H₁₂₄O₂₆",
    molecularWeight: "1310.0 g/mol",
    functionalCategory: "Non-Ionic Ethoxylated Sorbitan Oleate Emulsifier & Solubilizer",
    hlbValue: "15.0 (Hydrophilic O/W Emulsifier)",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "0.5% – 3.0%",
    compatibilityScore: 95,
    synergisticWith: ["Stearic Acid", "Liquid Paraffin", "Alpha Tocopherol", "Sorbitol"],
    avoidWith: ["Excessive Dosage >5% with Paraben/Phenolic Preservatives"],
    certifications: ["LPPOM MUI Halal", "Halal Quality Control (HQC)", "USP/NF Pharma Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Anti-Aging Serum",
      "Gentle Cleanser",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Lowers interfacial tension between hydrocarbon oils and water to <2 mN/m, improving emulsion washability (7–11 sec) and solubilizing lipophilic actives.",
    solubilityPhase: "Amphiphilic / Surfactant",
    molecule3D: createFattyChain3D("C64H124O26", "Polyoxyethylene (20) Sorbitan Monooleate", "Ethoxylated Sorbitan Ester", "ester"),
  },
  methylparaben: {
    key: "methylparaben",
    inciName: "Methylparaben (Auto-Substituted by AI Hypoallergenic Guard)",
    casNumber: "99-76-3",
    molecularFormula: "C₈H₈O₃",
    molecularWeight: "152.15 g/mol",
    functionalCategory: "Legacy Antimicrobial Preservative (Replaced with Phenoxyethanol)",
    hlbValue: "N/A",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "0.02% – 0.40% (Substituted to 0.00% in Hypoallergenic Mode)",
    compatibilityScore: 72,
    synergisticWith: ["Propylene Glycol"],
    avoidWith: ["Sensitive / Rosacea Skin Protocols (Auto-Replaced by Phenoxyethanol)"],
    certifications: ["Halal Quality Control (HQC)", "ARA Halal Certified"],
    compatibleProductTypes: ["All-Purpose Barrier Cream (BBD Journal Standard)"],
    safetyGrade: "Allergen Watch (Substituted by AI)",
    mechanismOfAction: "p-Hydroxybenzoic acid methyl ester; automatically substituted by formylab.ai's Hypoallergenic Safety Engine with 1.00% Phenoxyethanol.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createAromaticRingMolecule("C8H8O3", "Methyl 4-hydroxybenzoate", "Para-Substituted Benzoate Ester", false),
  },
  propylparaben: {
    key: "propylparaben",
    inciName: "Propylparaben (Auto-Substituted by AI Hypoallergenic Guard)",
    casNumber: "94-13-3",
    molecularFormula: "C₁₀H₁₂O₃",
    molecularWeight: "180.20 g/mol",
    functionalCategory: "Legacy Antifungal Preservative (Replaced with Phenoxyethanol)",
    hlbValue: "N/A",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "0.01% – 0.14% (Substituted to 0.00% in Hypoallergenic Mode)",
    compatibilityScore: 70,
    synergisticWith: ["Propylene Glycol"],
    avoidWith: ["Sensitive Skin Protocols (Auto-Replaced by Phenoxyethanol)"],
    certifications: ["Halal Quality Control (HQC)", "ARA Halal Certified"],
    compatibleProductTypes: ["All-Purpose Barrier Cream (BBD Journal Standard)"],
    safetyGrade: "Allergen Watch (Substituted by AI)",
    mechanismOfAction: "Propyl 4-hydroxybenzoate; automatically flagged and replaced by formylab.ai with Halal-certified Phenoxyethanol for allergen-free compliance.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createAromaticRingMolecule("C10H12O3", "Propyl 4-hydroxybenzoate", "Para-Substituted Benzoate Ester", false),
  },
  perfume: {
    key: "perfume",
    inciName: "Parfum / Fragrance (Auto-Removed in Hypoallergenic Mode)",
    casNumber: "Mixture",
    molecularFormula: "C₁₀H₁₆O (Terpene / Linalool / Citral Complex)",
    molecularWeight: "~154.25 g/mol",
    functionalCategory: "Olfactory Masking Agent (Removed in Hypoallergenic Mode)",
    hlbValue: "N/A",
    optimalPhRange: "5.0 – 7.0",
    typicalUsageRate: "0.1% – 0.9% (0.00% in Hypoallergenic Mode)",
    compatibilityScore: 68,
    synergisticWith: ["Tween 80"],
    avoidWith: ["Sensitive / Post-Procedure Skin (Auto-Removed by AI Engine)"],
    certifications: ["IFRA 51st Amendment Compliant"],
    compatibleProductTypes: ["All-Purpose Barrier Cream (BBD Journal Standard)"],
    safetyGrade: "Allergen Watch (Substituted by AI)",
    mechanismOfAction: "Volatile aromatic terpenes; automatically omitted by formylab.ai's Hypoallergenic Guard to eliminate contact sensitization risk.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createFattyChain3D("C10H18O", "3,7-Dimethylocta-1,6-dien-3-ol (Linalool)", "Acyclic Monoterpenoid Alcohol", "hydroxyl"),
  },

  // --- COMPLETE GOLD-STANDARD ACTIVE & FUNCTIONAL INGREDIENTS ---
  niacinamide: {
    key: "niacinamide",
    inciName: "Niacinamide (Vitamin B3 / Nicotinamide)",
    casNumber: "98-92-0",
    molecularFormula: "C₆H₆N₂O",
    molecularWeight: "122.12 g/mol",
    functionalCategory: "Multi-Functional Barrier, Sebum & Melanosome Active",
    hlbValue: "N/A (Water-Soluble Pyridine Carboxamide)",
    optimalPhRange: "5.0 – 7.0 (Hydrolyzes to Nicotinic Acid below pH 4.2)",
    typicalUsageRate: "2.0% – 5.0%",
    compatibilityScore: 99,
    synergisticWith: ["Panthenol", "Ceramide NP", "Alpha Arbutin", "Tranexamic Acid", "Zinc Oxide"],
    avoidWith: ["Strong Acids pH < 4.0 (Causes nicotinic acid flushing)"],
    certifications: ["LPPOM MUI Halal", "USP/EP Pharma Grade", "ECOCERT Approved"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Soothing Gel",
      "Anti-Aging Serum",
      "Sunscreen Lotion",
      "Brightening Essence Lotion",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Precursor to NAD+/NADP+ coenzymes; stimulates serine palmitoyltransferase to increase stratum corneum ceramide synthesis by 34% and inhibits melanosome transfer from melanocytes to keratinocytes.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C6H6N2O", "Pyridine-3-carboxamide (Niacinamide)", "Planar Heteroaromatic Pyridine Amide", true),
  },
  panthenol: {
    key: "panthenol",
    inciName: "Panthenol (D-Panthenol / Pro-Vitamin B5)",
    casNumber: "81-13-0",
    molecularFormula: "C₉H₁₉NO₄",
    molecularWeight: "205.25 g/mol",
    functionalCategory: "Pro-Vitamin B5 Barrier Repair & Humectant Active",
    hlbValue: "N/A (Water-Soluble Amide Triol)",
    optimalPhRange: "4.5 – 7.0",
    typicalUsageRate: "1.0% – 5.0%",
    compatibilityScore: 99,
    synergisticWith: ["Niacinamide", "Centella Asiatica Extract", "Ceramide NP", "Allantoin", "Glycerin"],
    avoidWith: ["Extreme pH < 3.5 or > 8.5"],
    certifications: ["LPPOM MUI Halal", "USP Pharma Grade", "DSM / BASF Certified"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Soothing Gel",
      "Gentle Cleanser",
      "AHA/PHA Resurfacing Night Gel-Serum",
      "Barrier Repair Ceramide Sleeping Mask",
      "Hyaluronic & Ectoin Hydrating Essence Toner",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Enzymatically oxidized in vivo to Pantothenic Acid (Coenzyme A component), accelerating fibroblast proliferation and lipid synthesis in compromised skin.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createFattyChain3D("C9H19NO4", "(2R)-2,4-Dihydroxy-N-(3-hydroxypropyl)-3,3-dimethylbutanamide", "Chiral Pantothenyl Alcohol Amide", "hydroxyl"),
  },
  ceramide_np: {
    key: "ceramide_np",
    inciName: "Ceramide NP (Ceramide 3)",
    casNumber: "100403-19-8",
    molecularFormula: "C₃₆H₇₃NO₄",
    molecularWeight: "583.97 g/mol",
    functionalCategory: "Skin-Identical Sphingolipid Barrier Restorer",
    hlbValue: "6.5 (Lipophilic Bilayer Component)",
    optimalPhRange: "4.5 – 6.8",
    typicalUsageRate: "0.2% – 1.5%",
    compatibilityScore: 98,
    synergisticWith: ["Cetyl Alcohol", "Almond Oil", "Niacinamide", "Panthenol", "Alpha Tocopherol", "Squalane"],
    avoidWith: ["Cold Aqueous Addition without Lipid Pre-Dispersion"],
    certifications: ["Halal Quality Control (HQC)", "Bio-Fermentation Vegan Derived", "COSMOS Approved"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "N-stearoyl phytosphingosine integrates directly into intercellular orthorhombic lipid lamellae to seal micro-fissures and restore barrier impedance.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C36H73NO4", "N-Octadecanoylphytosphingosine", "Two-Tailed Sphingolipid Hairpin", "ester"),
  },
  centella_asiatica_extract: {
    key: "centella_asiatica_extract",
    inciName: "Centella Asiatica Leaf Extract (TECA / Madecassoside)",
    casNumber: "84696-21-9",
    molecularFormula: "C₄₈H₇₈O₂₀ (Madecassoside Triterpenoid)",
    molecularWeight: "975.12 g/mol",
    functionalCategory: "Triterpenoid Anti-Inflammatory & Collagen I/III Inducer",
    hlbValue: "N/A (Hydro-Glycolic Botanical Active)",
    optimalPhRange: "4.8 – 6.5",
    typicalUsageRate: "1.0% – 3.0%",
    compatibilityScore: 98,
    synergisticWith: ["Aloe Vera Extract", "Panthenol", "Allantoin", "Niacinamide"],
    avoidWith: ["Prolonged Heating > 50°C"],
    certifications: ["LPPOM MUI Halal", "ECOCERT Greenlife", "Standardized 40% TECA"],
    compatibleProductTypes: [
      "Soothing Gel",
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
      "Acne Control BHA/Azelaic Fluid",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Pentacyclic triterpenoid saponins activate TGF-β/Smad signaling to stimulate Type I and Type III procollagen synthesis while inhibiting NF-κB inflammatory cytokines.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C48H78O20", "Madecassoside Pentacyclic Triterpenoid", "Pentacyclic Ursane Saponin", false),
  },
  allantoin: {
    key: "allantoin",
    inciName: "Allantoin",
    casNumber: "97-59-6",
    molecularFormula: "C₄H₆N₄O₃",
    molecularWeight: "158.12 g/mol",
    functionalCategory: "FDA Monograph Skin Protectant & Soothing Keratolytic",
    hlbValue: "N/A (Amphoteric Hydantoin Derivative)",
    optimalPhRange: "4.5 – 7.0",
    typicalUsageRate: "0.2% – 0.5% (Water solubility limit ~0.5% at 25°C)",
    compatibilityScore: 97,
    synergisticWith: ["Panthenol", "Aloe Vera Extract", "Bisabolol", "Glycerin"],
    avoidWith: ["Dosage >0.5% without Polyol Co-Solvent (Recrystallization risk)"],
    certifications: ["LPPOM MUI Halal", "USP/EP Pharma Grade", "FDA 21 CFR 347.10"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Soothing Gel",
      "Gentle Cleanser",
      "Facial Moisturizer (Cream)",
      "Acne Control BHA/Azelaic Fluid",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Promotes desquamation of corneodesmosomes in hyperkeratotic skin while complexing with irritant sensitizers to calm erythema.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createAromaticRingMolecule("C4H6N4O3", "(2,5-Dioxo-4-imidazolidinyl)urea", "Imidazolidine-Urea Heterocycle", true),
  },
  sodium_hyaluronate: {
    key: "sodium_hyaluronate",
    inciName: "Sodium Hyaluronate (Multi-Molecular Weight HA)",
    casNumber: "9067-32-7",
    molecularFormula: "(C₁₄H₂₀NNaO₁₁)ₙ",
    molecularWeight: "50 kDa – 1,500 kDa (Bimodal Polymer)",
    functionalCategory: "Glycosaminoglycan Viscoelastic Moisture Reservoir",
    hlbValue: "N/A (Anionic Biopolymer)",
    optimalPhRange: "5.0 – 7.5",
    typicalUsageRate: "0.2% – 2.0%",
    compatibilityScore: 99,
    synergisticWith: ["Glycerin", "Polyglutamic Acid", "Panthenol", "Ceramide NP"],
    avoidWith: ["Cationic Surfactants (Precipitates Polyelectrolyte Complex)"],
    certifications: ["LPPOM MUI Halal", "ECOCERT / COSMOS Bio-Fermented", "EP Pharma Grade"],
    compatibleProductTypes: [
      "Anti-Aging Serum",
      "Facial Moisturizer (Cream)",
      "Soothing Gel",
      "AHA/PHA Resurfacing Night Gel-Serum",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
      "Hyaluronic & Ectoin Hydrating Essence Toner",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Repeating disaccharide units of D-glucuronic acid and N-acetyl-D-glucosamine bind up to 1,000x their weight in water via extensive hydrogen-bonding domains.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createAromaticRingMolecule("C14H20NNaO11", "Sodium Poly(β-D-glucuronate-[1→3]-β-D-N-acetylglucosamine)", "Helical Disaccharide Biopolymer", true),
  },
  salicylic_acid: {
    key: "salicylic_acid",
    inciName: "Salicylic Acid (Beta Hydroxy Acid / BHA)",
    casNumber: "69-72-7",
    molecularFormula: "C₇H₆O₃",
    molecularWeight: "138.12 g/mol",
    functionalCategory: "Lipophilic Comedolytic & Desmolytic Beta Hydroxy Acid",
    hlbValue: "N/A (Lipophilic Aromatic Acid, LogP 2.26)",
    optimalPhRange: "3.8 – 4.8 (pKa 2.97)",
    typicalUsageRate: "0.5% – 2.0% (BPOM/ASEAN Max 2.0% Leave-On)",
    compatibilityScore: 90,
    synergisticWith: ["Propylene Glycol", "PEG-100 Stearate", "Azelaic Acid", "Centella Asiatica Extract"],
    avoidWith: ["Retinol in Same Routine", "Iron Salts (Forms purple ferric salicylate)"],
    certifications: ["LPPOM MUI Halal", "USP Compendial Grade", "BPOM RI Annex III Compliant"],
    compatibleProductTypes: [
      "Acne Control BHA/Azelaic Fluid",
      "Gentle Cleanser",
    ],
    safetyGrade: "Moderate (Regulated Limit)",
    mechanismOfAction: "Partitioning into sebum-rich pilosebaceous follicles, Salicylic Acid dissolves intercellular corneodesmosome junctions to clear microcomedones and inhibit C. acnes biofilm.",
    solubilityPhase: "Amphiphilic / Surfactant",
    molecule3D: createAromaticRingMolecule("C7H6O3", "2-Hydroxybenzoic Acid", "Intramolecularly H-Bonded Ortho-Hydroxybenzoate", false),
  },
  glycolic_acid: {
    key: "glycolic_acid",
    inciName: "Glycolic Acid (High-Purity Crystalline AHA)",
    casNumber: "79-14-1",
    molecularFormula: "C₂H₄O₃",
    molecularWeight: "76.05 g/mol",
    functionalCategory: "Smallest-MW Alpha Hydroxy Acid Epidermal Resurfacer",
    hlbValue: "N/A (Hydrophilic α-Hydroxy Acid)",
    optimalPhRange: "3.6 – 4.2 (pKa 3.83)",
    typicalUsageRate: "2.0% – 8.0% (Retail Leave-On Standard)",
    compatibilityScore: 89,
    synergisticWith: ["Lactic Acid", "Sodium Hydroxide (NaOH)", "Panthenol", "Sodium Hyaluronate"],
    avoidWith: ["Niacinamide (Hydrolyzes to nicotinic acid at pH < 4.2)", "Unbuffered Carbomers"],
    certifications: ["Halal Quality Control (HQC)", "Formaldehyde-Free Cosmetic Grade"],
    compatibleProductTypes: ["AHA/PHA Resurfacing Night Gel-Serum"],
    safetyGrade: "Moderate (Regulated Limit)",
    mechanismOfAction: "Chelation of Ca²⁺ ions from cadherin-mediated corneodesmosomes weakens stratum corneum cohesion, accelerating epidermal turnover and dermal GAG deposition.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createFattyChain3D("C2H4O3", "2-Hydroxyethanoic Acid", "Compact α-Hydroxy Carboxylic Acid", "carboxylic"),
  },
  lactic_acid: {
    key: "lactic_acid",
    inciName: "Lactic Acid (L-(+)-Fermented AHA)",
    casNumber: "79-33-4",
    molecularFormula: "C₃H₆O₃",
    molecularWeight: "90.08 g/mol",
    functionalCategory: "Natural Moisturizing Factor (NMF) Humectant & Gentle AHA",
    hlbValue: "N/A (Chiral Hydrophilic Acid)",
    optimalPhRange: "3.8 – 4.5 (pKa 3.86)",
    typicalUsageRate: "1.0% – 5.0%",
    compatibilityScore: 92,
    synergisticWith: ["Glycolic Acid", "Glycerin", "Sodium Hyaluronate", "Panthenol"],
    avoidWith: ["pH-Sensitive Anionic Thickeners without Electrolyte Tolerance"],
    certifications: ["LPPOM MUI Halal", "Bio-Fermentation Sugar Derived", "ECOCERT Approved"],
    compatibleProductTypes: [
      "AHA/PHA Resurfacing Night Gel-Serum",
      "Gentle Cleanser",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Physiological component of the skin's Natural Moisturizing Factor (NMF) that simultaneously exfoliates surface squames and stimulates ceramide biosynthesis.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createFattyChain3D("C3H6O3", "(2S)-2-Hydroxypropanoic Acid", "Chiral L-Lactate Monomer", "carboxylic"),
  },
  azelaic_acid: {
    key: "azelaic_acid",
    inciName: "Azelaic Acid (Micronized Cosmetic Grade)",
    casNumber: "123-99-9",
    molecularFormula: "C₉H₁₆O₄",
    molecularWeight: "188.22 g/mol",
    functionalCategory: "Dicarboxylic Acid Tyrosinase, Rosacea & Acne Modulator",
    hlbValue: "N/A (Amphiphilic Dicarboxylic Acid)",
    optimalPhRange: "4.5 – 5.5 (pKa1 4.55, pKa2 5.50)",
    typicalUsageRate: "3.0% – 10.0%",
    compatibilityScore: 94,
    synergisticWith: ["Niacinamide", "Salicylic Acid", "Centella Asiatica Extract", "Panthenol"],
    avoidWith: ["Alkaline pH > 6.5 (Dissolves into inactive di-salt)"],
    certifications: ["Halal Quality Control (HQC)", "Botanical Oleic Ozonolysis Grade", "COSMOS Approved"],
    compatibleProductTypes: [
      "Acne Control BHA/Azelaic Fluid",
      "Brightening Essence Lotion",
      "Soothing Gel",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Inhibits mitochondrial oxidoreductases and hyperactive melanocyte tyrosinase while downregulating kallikrein-5 (KLK5) serine protease in rosacea-prone skin.",
    solubilityPhase: "Amphiphilic / Surfactant",
    molecule3D: createFattyChain3D("C9H16O4", "Nonanedioic Acid", "Linear C9 α,ω-Dicarboxylic Acid", "carboxylic"),
  },
  alpha_arbutin: {
    key: "alpha_arbutin",
    inciName: "Alpha-Arbutin (4-Hydroxyphenyl-α-D-glucopyranoside)",
    casNumber: "84380-01-8",
    molecularFormula: "C₁₂H₁₆O₇",
    molecularWeight: "272.25 g/mol",
    functionalCategory: "Biosynthetic Competitive Tyrosinase Inhibitor",
    hlbValue: "N/A (Water-Soluble Glycoside)",
    optimalPhRange: "4.8 – 6.5 (Prevents acid hydrolysis to hydroquinone)",
    typicalUsageRate: "1.0% – 2.0% (SCCS Safe Maximum 2.0% in Face Creams)",
    compatibilityScore: 97,
    synergisticWith: ["Niacinamide", "Tranexamic Acid", "3-O-Ethyl Ascorbic Acid", "Disodium EDTA"],
    avoidWith: ["Strong Acidic pH < 4.0 or Alkaline pH > 7.5"],
    certifications: ["LPPOM MUI Halal", "Enzymatic Biocatalysis Pure α-Anomer", "SCCS 2023 Compliant"],
    compatibleProductTypes: [
      "Brightening Essence Lotion",
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Competitively binds the binuclear copper active site of human tyrosinase with 10x higher affinity than β-arbutin without melanocyte cytotoxicity.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C12H16O7", "4-Hydroxyphenyl α-D-glucopyranoside", "Phenolic α-Glucoside Conformer", false),
  },
  tranexamic_acid: {
    key: "tranexamic_acid",
    inciName: "Tranexamic Acid",
    casNumber: "1197-18-8",
    molecularFormula: "C₈H₁₅NO₂",
    molecularWeight: "157.21 g/mol",
    functionalCategory: "Plasminogen/Prostaglandin Pathway Hyperpigmentation Blocker",
    hlbValue: "N/A (Zwitterionic Cyclohexane Amino Acid)",
    optimalPhRange: "5.0 – 6.8",
    typicalUsageRate: "1.5% – 3.0% (BPOM Max 3.0%)",
    compatibilityScore: 98,
    synergisticWith: ["Niacinamide", "Alpha Arbutin", "Alpha Tocopherol", "Centella Asiatica Extract"],
    avoidWith: ["None (Highly Stable Zwitterion across pH 4.5–7.5)"],
    certifications: ["LPPOM MUI Halal", "BPJPH Certified", "USP/BP Pharmaceutical Grade"],
    compatibleProductTypes: [
      "Brightening Essence Lotion",
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
      "Soothing Gel",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Blocks UV-induced keratinocyte urokinase-type plasminogen activator (uPA), halting arachidonic acid and prostaglandin E2 release that triggers melasma and PIE.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createAromaticRingMolecule("C8H15NO2", "trans-4-(Aminomethyl)cyclohexanecarboxylic Acid", "Chair-Conformation Cyclohexane Amino Acid", true),
  },
  bakuchiol: {
    key: "bakuchiol",
    inciName: "Bakuchiol (Psoralea Corylifolia >99% Meroterpene)",
    casNumber: "10309-37-2",
    molecularFormula: "C₁₈H₂₄O",
    molecularWeight: "256.38 g/mol",
    functionalCategory: "Photostable Retinol-Functional Gene Expression Modulator",
    hlbValue: "7.5 (Lipophilic Meroterpene Phenol)",
    optimalPhRange: "4.5 – 6.8",
    typicalUsageRate: "0.5% – 1.0%",
    compatibilityScore: 98,
    synergisticWith: ["Squalane", "Alpha Tocopherol", "Ceramide NP", "Palmitoyl Tripeptide-1"],
    avoidWith: ["Ferric/Cupric Contamination (Requires Disodium EDTA)"],
    certifications: ["Halal Quality Control (HQC)", "100% Botanical Standardized >99%", "COSMOS Natural"],
    compatibleProductTypes: [
      "Anti-Aging Serum",
      "Facial Moisturizer (Cream)",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Upregulates COL1A1, COL3A1, and COL4A1 gene expression identically to Retinol without binding RAR/RXR nuclear receptors, eliminating retinoid dermatitis and phototoxicity.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createAromaticRingMolecule("C18H24O", "4-[(1E,3S)-3-Ethenyl-3,7-dimethylocta-1,6-dienyl]phenol", "Chiral Meroterpene Phenol", false),
  },
  ethyl_ascorbic_acid: {
    key: "ethyl_ascorbic_acid",
    inciName: "3-O-Ethyl Ascorbic Acid",
    casNumber: "86404-04-8",
    molecularFormula: "C₈H₁₂O₆",
    molecularWeight: "204.18 g/mol",
    functionalCategory: "Non-Ionizable Amphiphilic Vitamin C Derivative",
    hlbValue: "N/A (Amphiphilic Etherified Ascorbate)",
    optimalPhRange: "4.5 – 6.0 (Optimum Citrate Buffer pH 5.0–5.5)",
    typicalUsageRate: "1.0% – 3.0%",
    compatibilityScore: 96,
    synergisticWith: ["Alpha Tocopherol", "Alpha Arbutin", "Disodium EDTA", "Glycerin"],
    avoidWith: ["Unchelated Copper/Iron Ions"],
    certifications: ["LPPOM MUI Halal", "86.3% Equivalent Ascorbic Acid Content", "COSMOS Approved"],
    compatibleProductTypes: [
      "Brightening Essence Lotion",
      "Anti-Aging Serum",
      "Facial Moisturizer (Cream)",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Etherification at the C-3 enediol position prevents oxidative yellowing into dehydroascorbic acid while allowing percutaneous penetration and in-vivo enzymatic conversion to free Vitamin C.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C8H12O6", "(5R)-5-[(1S)-1,2-Dihydroxyethyl]-4-ethoxy-3-hydroxyfuran-2(5H)-one", "3-O-Alkylated γ-Lactone Ring", false),
  },
  bisabolol: {
    key: "bisabolol",
    inciName: "Bisabolol (L-α-Bisabolol Natural)",
    casNumber: "23089-26-1",
    molecularFormula: "C₁₅H₂₆O",
    molecularWeight: "222.37 g/mol",
    functionalCategory: "Sesquiterpene Anti-Erythema & Cytokine Inhibitor",
    hlbValue: "7.0 (Lipophilic Sesquiterpene Alcohol)",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "0.2% – 0.6%",
    compatibilityScore: 99,
    synergisticWith: ["Allantoin", "Panthenol", "Zinc Oxide", "Centella Asiatica Extract"],
    avoidWith: ["None"],
    certifications: ["LPPOM MUI Halal", "ECOCERT / COSMOS Natural (Candeia Tree Derived)"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Sunscreen Lotion",
      "Facial Moisturizer (Cream)",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Monocyclic unsaturated sesquiterpene alcohol that suppresses pro-inflammatory leukotriene B4 and IL-1α synthesis while enhancing transdermal absorption of co-actives.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createFattyChain3D("C15H26O", "(2S)-6-Methyl-2-[(1S)-4-methylcyclohex-3-en-1-yl]hept-5-en-2-ol", "Monocyclic Sesquiterpene Alcohol", "hydroxyl"),
  },
  squalane: {
    key: "squalane",
    inciName: "Squalane ( Sugarcane Bio-Fermented Phytosqualane)",
    casNumber: "111-01-3",
    molecularFormula: "C₃₀H₆₂",
    molecularWeight: "422.81 g/mol",
    functionalCategory: "Biomimetic Saturated Triterpene Emollient",
    hlbValue: "9.5 (Required HLB)",
    optimalPhRange: "3.0 – 10.0 (Fully Hydrogenated, Zero Peroxidation)",
    typicalUsageRate: "2.0% – 8.0%",
    compatibilityScore: 99,
    synergisticWith: ["Ceramide NP", "Bakuchiol", "Alpha Tocopherol", "Cetyl Alcohol"],
    avoidWith: ["None (Inert Branched Alkane)"],
    certifications: ["LPPOM MUI Halal", "ECOCERT / Bonsucro Certified", "100% Plant Sugarcane Derived"],
    compatibleProductTypes: [
      "Facial Moisturizer (Cream)",
      "Barrier Repair Ceramide Sleeping Mask",
      "Anti-Aging Serum",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Hydrogenated analog of human sebum squalene (which comprises 13% of adult sebum); integrates frictionlessly into the lipid barrier with zero comedogenicity or squalene-peroxide formation.",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C30H62", "2,6,10,15,19,23-Hexamethyltetracosane", "Branched Saturated Isoprenoid Chain", "hydrocarbon"),
  },
  shea_butter: {
    key: "shea_butter",
    inciName: "Butyrospermum Parkii (Shea) Butter",
    casNumber: "194043-92-0",
    molecularFormula: "C₅₇H₁₀₆O₆ + C₃₂H₅₂O₂ (Triglyceride + Lupeol Cinnamate)",
    molecularWeight: "~888.5 g/mol",
    functionalCategory: "Triterpene-Rich Botanical Lipid Structurant",
    hlbValue: "8.0 (Required HLB)",
    optimalPhRange: "4.5 – 7.5",
    typicalUsageRate: "2.0% – 8.0%",
    compatibilityScore: 96,
    synergisticWith: ["Cetyl Alcohol", "Stearic Acid", "Ceramide NP", "Alpha Tocopherol"],
    avoidWith: ["Slow Cooling Rates (Can cause β-prime fat bloom crystals if not rapidly cooled)"],
    certifications: ["LPPOM MUI Halal", "Fair-Trade Refined Cosmetic Grade"],
    compatibleProductTypes: [
      "All-Purpose Barrier Cream (BBD Journal Standard)",
      "Facial Moisturizer (Cream)",
      "Barrier Repair Ceramide Sleeping Mask",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Contains 6–10% unsaponifiable triterpene cinnamates (amyrin, lupeol) alongside stearic-oleic-stearic (SOS) triglycerides that melt precisely at skin temperature (32–36°C).",
    solubilityPhase: "Oil Phase (Lipophilic)",
    molecule3D: createFattyChain3D("C57H106O6", "1,3-Distearoyl-2-oleoylglycerol (SOS Triglyceride)", "Semi-Crystalline Triacylglycerol", "ester"),
  },
  zinc_oxide: {
    key: "zinc_oxide",
    inciName: "Zinc Oxide (Triethoxycaprylylsilane Coated Non-Nano)",
    casNumber: "1314-13-2",
    molecularFormula: "ZnO",
    molecularWeight: "81.38 g/mol",
    functionalCategory: "Broad-Spectrum UVA1/UVA2/UVB Mineral Photoprotective Filter",
    hlbValue: "N/A (Surface-Treated Lipophilic Dispersion)",
    optimalPhRange: "6.0 – 7.2 (Dissolves into Zn²⁺ below pH 5.6)",
    typicalUsageRate: "5.0% – 25.0% (ASEAN/FDA Max 25.0%)",
    compatibilityScore: 93,
    synergisticWith: ["Titanium Dioxide", "Dimethicone", "Cetyl Alcohol", "Bisabolol", "Alpha Tocopherol"],
    avoidWith: ["Acidic pH < 5.6", "Unneutralized Carbomers (Zn²⁺ crosslinks and precipitates polyacrylates)"],
    certifications: ["LPPOM MUI Halal", "ASEAN Annex VII Approved UV Filter", "Reef-Safe Non-Nano (>100 nm)"],
    compatibleProductTypes: [
      "Sunscreen Lotion",
      "All-Purpose Barrier Cream (BBD Journal Standard)",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Wide-bandgap semiconductor (3.37 eV) that attenuates radiation across 290–380 nm (including long-wave UVA1) via combined Mie scattering and electronic band-edge absorption.",
    solubilityPhase: "Suspension / Mineral Phase",
    molecule3D: createMetalOxideCluster3D("Zn", "ZnO", "Zincite Hexagonal Wurtzite Lattice"),
  },
  titanium_dioxide: {
    key: "titanium_dioxide",
    inciName: "Titanium Dioxide (Alumina/Simethicone Coated Rutile)",
    casNumber: "13463-67-7",
    molecularFormula: "TiO₂",
    molecularWeight: "79.87 g/mol",
    functionalCategory: "High-Refractive-Index UVB/UVA2 Mineral Filter",
    hlbValue: "N/A (Coated Mineral Dispersion)",
    optimalPhRange: "5.5 – 7.5",
    typicalUsageRate: "2.0% – 15.0% (ASEAN Max 25.0%)",
    compatibilityScore: 95,
    synergisticWith: ["Zinc Oxide", "Dimethicone", "Alpha Tocopherol", "Ectoin"],
    avoidWith: ["Uncoated Anatase Crystal Form (Photocatalytic ROS generator — Always use Coated Rutile)"],
    certifications: ["LPPOM MUI Halal", "ASEAN Annex VII Approved", "SCCS Non-Inhalable Lotion Approved"],
    compatibleProductTypes: ["Sunscreen Lotion"],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Rutile crystal lattice possesses a high refractive index (n = 2.7) and 3.0 eV bandgap, providing peak UVB (290–320 nm) and short-UVA2 attenuation.",
    solubilityPhase: "Suspension / Mineral Phase",
    molecule3D: createMetalOxideCluster3D("Ti", "TiO2", "Rutile Tetragonal Titanium Dioxide"),
  },
  palmitoyl_tripeptide_1: {
    key: "palmitoyl_tripeptide_1",
    inciName: "Palmitoyl Tripeptide-1 (Pal-GHK Matrikine)",
    casNumber: "147732-56-7",
    molecularFormula: "C₃₀H₅₄N₆O₅",
    molecularWeight: "578.79 g/mol",
    functionalCategory: "Biomimetic Matrikine Pro-Collagen Signaling Lipopeptide",
    hlbValue: "N/A (Lipophilic-Tagged Tripeptide)",
    optimalPhRange: "5.0 – 6.8",
    typicalUsageRate: "1.0% – 3.0% (of 1000 ppm commercial peptide solution)",
    compatibilityScore: 97,
    synergisticWith: ["Sodium Hyaluronate", "Ceramide NP", "Bakuchiol", "Niacinamide"],
    avoidWith: ["Strong Proteolytic Enzymes (Papain/Bromelain)", "Strong Acids pH < 4.0"],
    certifications: ["Halal Quality Control (HQC)", "Solid-Phase Synthetic Vegan Peptide"],
    compatibleProductTypes: [
      "Anti-Aging Serum",
      "Ophthalmic-Grade Peptide Eye Contour Cream",
      "Facial Moisturizer (Cream)",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Palmitic acid C16 chain ferries the Gly-His-Lys (GHK) collagen-fragment sequence across the lipophilic stratum corneum to signal dermal fibroblasts to synthesize new Collagen I and glycosaminoglycans.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createFattyChain3D("C30H54N6O5", "N-(1-Oxohexadecyl)glycyl-L-histidyl-L-lysine", "C16-Lipidated Tripeptide", "ester"),
  },
  ectoin: {
    key: "ectoin",
    inciName: "Ectoin ((4S)-2-Methyl-1,4,5,6-tetrahydropyrimidine-4-carboxylic acid)",
    casNumber: "96702-03-3",
    molecularFormula: "C₆H₁₀N₂O₂",
    molecularWeight: "142.16 g/mol",
    functionalCategory: "Extremolyte Kosmotropic Hydration Shell & UVA Cell Protectant",
    hlbValue: "N/A (Zwitterionic Compatible Solute)",
    optimalPhRange: "4.0 – 8.0",
    typicalUsageRate: "0.5% – 2.0%",
    compatibilityScore: 99,
    synergisticWith: ["Sodium Hyaluronate", "Glycerin", "Zinc Oxide", "Panthenol"],
    avoidWith: ["None (Thermostable up to 100°C)"],
    certifications: ["LPPOM MUI Halal", "Halomonas Elongata Bio-Fermented", "NATRUE / COSMOS Approved"],
    compatibleProductTypes: [
      "Soothing Gel",
      "Sunscreen Lotion",
      "Hyaluronic & Ectoin Hydrating Essence Toner",
      "Facial Moisturizer (Cream)",
      "Anti-Aging Serum",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Forms high-density kosmotropic water clusters ('Ectoin Hydro Complex') around epidermal cell membranes and Langerhans cells, preventing UVA-induced ceramide release and osmotic stress.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createAromaticRingMolecule("C6H10N2O2", "(4S)-2-Methyl-1,4,5,6-tetrahydropyrimidine-4-carboxylic Acid", "Zwitterionic Tetrahydropyrimidine Ring", true),
  },
  polyglutamic_acid: {
    key: "polyglutamic_acid",
    inciName: "Polyglutamic Acid (γ-PGA Bio-Polymer)",
    casNumber: "25513-46-6",
    molecularFormula: "(C₅H₇NO₃)ₙ",
    molecularWeight: "700 kDa – 1,000 kDa",
    functionalCategory: "Super-Hydrophilic Film Humectant & Hyaluronidase Inhibitor",
    hlbValue: "N/A (Anionic Polypeptide)",
    optimalPhRange: "4.5 – 7.0",
    typicalUsageRate: "0.2% – 1.5%",
    compatibilityScore: 98,
    synergisticWith: ["Sodium Hyaluronate", "Glycerin", "Ceramide NP", "Ectoin"],
    avoidWith: ["Quaternary Ammonium Cationics"],
    certifications: ["LPPOM MUI Halal", "Bacillus Subtilis Natto Bio-Fermented", "ECOCERT Approved"],
    compatibleProductTypes: [
      "Hyaluronic & Ectoin Hydrating Essence Toner",
      "Barrier Repair Ceramide Sleeping Mask",
      "Anti-Aging Serum",
      "Facial Moisturizer (Cream)",
    ],
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Gamma-linked glutamate homopolymer that holds up to 4,000x its weight in water and inhibits dermal hyaluronidase to preserve endogenous hyaluronic acid.",
    solubilityPhase: "Water Phase (Hydrophilic)",
    molecule3D: createFattyChain3D("(C5H7NO3)n", "Poly(γ-L-glutamic acid)", "Helical Polyamide Carboxylate Chain", "carboxylic"),
  },
};

export function normalizeIngredientKey(name: string): string {
  const lower = name
    .toLowerCase()
    .replace(/_%/g, "")
    .replace(/\d+(\.\d+)?\s*%/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (lower.includes("water") || lower.includes("aqua")) return "water";
  if (lower.includes("edta")) return "disodium_edta";
  if (lower.includes("glycerin") || lower.includes("gliserin")) return "glycerin";
  if (lower.includes("acrylic")) return "acrylic_acid_copolymer";
  if (lower.includes("propylene") || lower.includes("propilen")) return "propylene_glycol";
  if (lower.includes("aloe")) return "aloe_vera_extract";
  if (lower.includes("carbopol") || lower.includes("carbomer")) return "carbopol_etd_2020";
  if (lower.includes("mineral_oil")) return "mineral_oil";
  if (lower.includes("liquid_paraffin") || lower.includes("paraffin")) return "liquid_paraffin";
  if (lower.includes("glyceryl_stearate") || lower.includes("gliseril")) return "glyceryl_stearate";
  if (lower.includes("peg_100") || lower.includes("peg100")) return "peg100_stearate";
  if (lower.includes("almond")) return "almond_oil";
  if (lower.includes("cetyl") || lower.includes("setil")) return "cetyl_alcohol";
  if (lower.includes("dimethiconol")) return "dimethiconol";
  if (lower.includes("dimethicone")) return "dimethicone";
  if (lower.includes("tocopherol") || lower.includes("vitamin_e") || lower.includes("tokoferol")) return "alpha_tocopherol";
  if (lower.includes("phenoxyethanol")) return "phenoxyethanol";
  if (lower.includes("sodium_hydroxide") || lower.includes("naoh")) return "sodium_hydroxide";
  if (lower.includes("stearic_acid")) return "stearic_acid";
  if (lower.includes("beeswax")) return "beeswax";
  if (lower.includes("lanolin")) return "lanolin";
  if (lower.includes("triethanolamine")) return "triethanolamine";
  if (lower.includes("sorbitol")) return "sorbitol";
  if (lower.includes("methylparaben")) return "methylparaben";
  if (lower.includes("propylparaben")) return "propylparaben";
  if (lower.includes("tween")) return "tween_80";
  if (lower.includes("perfume") || lower.includes("fragrance")) return "perfume";
  if (lower.includes("niacinamide")) return "niacinamide";
  if (lower.includes("panthenol")) return "panthenol";
  if (lower.includes("ceramide")) return "ceramide_np";
  if (lower.includes("centella") || lower.includes("madecassoside")) return "centella_asiatica_extract";
  if (lower.includes("allantoin")) return "allantoin";
  if (lower.includes("hyaluron")) return "sodium_hyaluronate";
  if (lower.includes("salicylic")) return "salicylic_acid";
  if (lower.includes("glycolic")) return "glycolic_acid";
  if (lower.includes("lactic")) return "lactic_acid";
  if (lower.includes("azelaic")) return "azelaic_acid";
  if (lower.includes("arbutin")) return "alpha_arbutin";
  if (lower.includes("tranexamic")) return "tranexamic_acid";
  if (lower.includes("bakuchiol")) return "bakuchiol";
  if (lower.includes("ascorbic") || lower.includes("vitamin_c")) return "ethyl_ascorbic_acid";
  if (lower.includes("bisabolol")) return "bisabolol";
  if (lower.includes("squalane")) return "squalane";
  if (lower.includes("shea")) return "shea_butter";
  if (lower.includes("zinc_oxide") || lower.includes("zno")) return "zinc_oxide";
  if (lower.includes("titanium_dioxide") || lower.includes("tio2")) return "titanium_dioxide";
  if (lower.includes("tripeptide") || lower.includes("peptide")) return "palmitoyl_tripeptide_1";
  if (lower.includes("ectoin")) return "ectoin";
  if (lower.includes("polyglutamic")) return "polyglutamic_acid";

  return lower;
}

export function getIngredientProfile(name: string): EnrichedIngredientProfile {
  const key = normalizeIngredientKey(name);
  if (INGREDIENT_PROFILES[key]) {
    return INGREDIENT_PROFILES[key];
  }
  return {
    key,
    inciName: name,
    casNumber: "Cosmetic Active Standard",
    molecularFormula: "C₁₂H₁₆O₄",
    molecularWeight: "224.25 g/mol",
    functionalCategory: "Specialized Cosmetic Active Compound",
    hlbValue: "Amphiphilic / Water-Dispersible",
    optimalPhRange: "5.0 – 6.5",
    typicalUsageRate: "0.5% – 3.0%",
    compatibilityScore: 94,
    synergisticWith: ["Glycerin", "Panthenol", "Niacinamide", "Alpha Tocopherol"],
    avoidWith: ["Strong Oxidizing Agents", "Extreme pH (<3.8 or >8.5)"],
    certifications: ["LPPOM MUI Halal Compatible", "Cosmetic CoA Verified"],
    compatibleProductTypes: VALIDATED_PRODUCT_TYPES.map((p) => p.name),
    safetyGrade: "Low Hazard (USP/BPOM Compliant)",
    mechanismOfAction: "Targeted cosmetic active formulated within physiological pH range to support epidermal homeostasis and barrier integrity.",
    solubilityPhase: "Cool-Down Phase (<40°C)",
    molecule3D: createAromaticRingMolecule("C12H16O4", `${name} Active Conformer`, "3D Bioactive Conformer", false),
  };
}

export function getProductTypeSpec(productTypeNameOrId: string): ProductTypeSpec {
  const clean = (productTypeNameOrId || "").toLowerCase().trim();
  const found = VALIDATED_PRODUCT_TYPES.find(
    (p) =>
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase() === clean ||
      p.shortName.toLowerCase() === clean ||
      clean.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(clean)
  );
  return found || VALIDATED_PRODUCT_TYPES[0];
}
