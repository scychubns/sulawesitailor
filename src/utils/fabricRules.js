export const FABRIC_SUGGESTIONS = {
  pleated: {
    incompatible: ["jersey", "cotton", "rayon", "katun", "kaos"],
    recommended: ["Polyester", "Satin", "Chiffon", "Semi-Wool"],
    reason: "Model plisket/plated memerlukan bahan sintetis yang stabil agar lipatan kain tahan lama dan tidak hilang setelah dicuci.",
  },
  pencil: {
    incompatible: ["chiffon", "organza", "sifon"],
    recommended: ["Cotton Stretch", "Semi-Wool", "Denim", "Drill", "Twill"],
    reason: "Model pensil/span membutuhkan bahan berstruktur atau yang memiliki sedikit kelenturan (stretch) agar tetap nyaman saat melangkah.",
  },
  "a-line": {
    incompatible: [], // Hampir semua bahan cocok untuk A-Line
    recommended: ["Cotton", "Rayon", "Crepe", "Denim", "Chiffon"],
    reason: "Model A-Line sangat fleksibel, namun bahan jatuh (flowy) akan memberikan efek melambai yang anggun.",
  },
};

/**
 * Memeriksa kecocokan bahan dan model rok
 */
export function validateFabricAndModel(model, fabricType) {
  if (!model || !fabricType) return null;

  const normalizedModel = String(model).toLowerCase().trim();
  const normalizedFabric = String(fabricType).toLowerCase().trim();

  // Pemetaan kata kunci model (mencakup 'plated', 'pleat', 'pleated', 'plisket')
  let key = "a-line";
  if (
    normalizedModel.includes("plisket") || 
    normalizedModel.includes("pleat") || 
    normalizedModel.includes("plate") // Mengakomodasi ejaan "Plated"
  ) {
    key = "pleated";
  } else if (
    normalizedModel.includes("pensil") || 
    normalizedModel.includes("pencil") || 
    normalizedModel.includes("span")
  ) {
    key = "pencil";
  }

  const rule = FABRIC_SUGGESTIONS[key];
  if (!rule) return null;

  // Cek apakah bahan termasuk dalam daftar tidak cocok (incompatible)
  const isWarning = rule.incompatible.some((item) => normalizedFabric.includes(item));

  if (isWarning) {
    return {
      type: "warning",
      title: "Kombinasi Bahan & Model Kurang Pas",
      message: rule.reason,
      recommendedFabrics: rule.recommended,
    };
  }

  return null;
}