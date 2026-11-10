import test from "node:test";
import assert from "node:assert/strict";
import {
  VALIDATED_PRODUCT_TYPES,
  INGREDIENT_PROFILES,
  normalizeIngredientKey,
  getIngredientProfile,
  getProductTypeSpec,
} from "./cosmeticChemistryData";

test("VALIDATED_PRODUCT_TYPES preserves all 5 original product types and adds 7 specialized types", () => {
  assert.ok(VALIDATED_PRODUCT_TYPES.length >= 12);
  const names = VALIDATED_PRODUCT_TYPES.map((p) => p.name);
  assert.ok(names.includes("Facial Moisturizer (Cream)"));
  assert.ok(names.includes("Soothing Gel"));
  assert.ok(names.includes("Sunscreen Lotion"));
  assert.ok(names.includes("Anti-Aging Serum"));
  assert.ok(names.includes("Gentle Cleanser"));
  assert.ok(names.includes("All-Purpose Barrier Cream (BBD Journal Standard)"));
  assert.ok(names.includes("Brightening Essence Lotion"));
});

test("Each product type has scientifically valid pH, viscosity range, and recommended actives", () => {
  for (const pt of VALIDATED_PRODUCT_TYPES) {
    const ph = parseFloat(pt.targetPh);
    assert.ok(!isNaN(ph) && ph >= 3.5 && ph <= 7.2, `Invalid pH for ${pt.name}: ${pt.targetPh}`);
    assert.ok(pt.viscosityRangeCps[0] > 0 && pt.viscosityRangeCps[1] >= pt.viscosityRangeCps[0]);
    assert.ok(pt.recommendedActives.length >= 4);
    assert.ok(pt.coreBaseIngredients.length >= 6);
  }
});

test("INGREDIENT_PROFILES contains all 27 supplier CSV ingredients plus gold-standard actives with 3D molecules", () => {
  const keys = Object.keys(INGREDIENT_PROFILES);
  assert.ok(keys.length >= 40, `Expected >= 40 ingredients, got ${keys.length}`);

  const requiredKeys = [
    "water",
    "glycerin",
    "disodium_edta",
    "propylene_glycol",
    "stearic_acid",
    "cetyl_alcohol",
    "glyceryl_stearate",
    "peg100_stearate",
    "carbopol_etd_2020",
    "aloe_vera_extract",
    "mineral_oil",
    "liquid_paraffin",
    "almond_oil",
    "dimethicone",
    "alpha_tocopherol",
    "phenoxyethanol",
    "triethanolamine",
    "sorbitol",
    "tween_80",
    "niacinamide",
    "panthenol",
    "ceramide_np",
    "centella_asiatica_extract",
    "sodium_hyaluronate",
    "salicylic_acid",
    "azelaic_acid",
    "alpha_arbutin",
    "tranexamic_acid",
    "bakuchiol",
    "zinc_oxide",
    "titanium_dioxide",
    "ectoin",
  ];

  for (const key of requiredKeys) {
    const profile = INGREDIENT_PROFILES[key];
    assert.ok(profile, `Missing ingredient profile for ${key}`);
    assert.ok(profile.compatibilityScore >= 65 && profile.compatibilityScore <= 100);
    assert.ok(profile.molecule3D.atoms.length >= 3, `Molecule 3D atoms missing for ${key}`);
    assert.ok(profile.molecule3D.bonds.length >= 2, `Molecule 3D bonds missing for ${key}`);
  }
});

test("normalizeIngredientKey and getIngredientProfile resolve CSV and custom ingredient names accurately", () => {
  assert.equal(normalizeIngredientKey("Stearic_Acid_%"), "stearic_acid");
  assert.equal(normalizeIngredientKey("Phenoxyethanol (Safe Preservative)"), "phenoxyethanol");
  assert.equal(normalizeIngredientKey("Niacinamide 4%"), "niacinamide");
  assert.equal(normalizeIngredientKey("Sodium hydroxide (NaOH)"), "sodium_hydroxide");

  const glycerin = getIngredientProfile("Glycerin");
  assert.equal(glycerin.casNumber, "56-81-5");
  assert.equal(glycerin.compatibilityScore, 98);

  const spec = getProductTypeSpec("Sunscreen Lotion");
  assert.equal(spec.targetPh, "6.20");
});
