import React, { useMemo } from "react";
import { validateFabricAndModel } from "./fabricRules";

export function DesignForm({ design, onChangeDesign }) {
  // Jalankan validasi secara dinamis saat model atau jenis bahan berubah
  const suggestion = useMemo(() => {
    return validateFabricAndModel(design?.model, design?.fabricType);
  }, [design?.model, design?.fabricType]);

  return (
    <div className="design-form-container">
      {/* Input Pilihan Model */}
      <label>Model Rok:</label>
      <select 
        value={design?.model || "a-line"} 
        onChange={(e) => onChangeDesign({ ...design, model: e.target.value })}
      >
        <option value="a-line">A-Line</option>
        <option value="pensil">Pensil / Span</option>
        <option value="plisket">Plisket (Pleated)</option>
      </select>

      {/* Input Pilihan Bahan */}
      <label>Jenis Bahan Kain:</label>
      <select 
        value={design?.fabricType || "cotton"} 
        onChange={(e) => onChangeDesign({ ...design, fabricType: e.target.value })}
      >
        <option value="cotton">Katun Murni</option>
        <option value="chiffon">Chiffon / Sifon</option>
        <option value="polyester">Polyester</option>
        <option value="jersey">Kaos / Jersey</option>
        <option value="denim">Denim / Jeans</option>
      </select>

      {/* TAMPILKAN UI SARAN/PERINGATAN JIKA ADA KETIDAKCOCOKAN */}
      {suggestion && (
        <div style={warningBoxStyle}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            💡 {suggestion.title}
          </div>
          <p style={{ margin: "4px 0", fontSize: "13px" }}>{suggestion.message}</p>
          <div style={{ marginTop: "8px", fontSize: "12px" }}>
            <strong>Rekomendasi bahan terbaik untuk model ini:</strong>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
              {suggestion.recommendedFabrics.map((fab) => (
                <li key={fab}>{fab}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const warningBoxStyle = {
  backgroundColor: "#fffbe6",
  border: "1px solid #ffe58f",
  borderRadius: "8px",
  padding: "12px 16px",
  marginTop: "16px",
  color: "#8c6b00",
};