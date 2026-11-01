
export default function MeasurementForm({ measurements, onChange, disabled }) {
  return (
    <section className="panel section-panel">
      <h2>3. Ukuran Pelanggan & Elemen Desain</h2>
      <p className="muted">
        Ukuran dicatat sebagai referensi penjahit dan tidak
        mengubah visualisasi rok secara otomatis.
      </p>

      <div className="measurement-grid">
        <label>
          Lingkar Pinggang (cm)
          <input
            type="number"
            min="0"
            value={measurements.waist}
            disabled={disabled}
            onChange={(e) => onChange("waist", e.target.value)}
            placeholder="Contoh: 70"
          />
        </label>

        <label>
          Lingkar Pinggul (cm)
          <input
            type="number"
            min="0"
            value={measurements.hip}
            disabled={disabled}
            onChange={(e) => onChange("hip", e.target.value)}
            placeholder="Contoh: 92"
          />
        </label>

        <label>
          Panjang Rok (cm)
          <input
            type="number"
            min="0"
            value={measurements.skirtLength}
            disabled={disabled}
            onChange={(e) => onChange("skirtLength", e.target.value)}
            placeholder="Contoh: 60"
          />
        </label>
      </div>

      {/* <label className="notes-label">
        Catatan Penjahit
        <textarea
          rows="3"
          value={measurements.notes}
          disabled={disabled}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Catatan tambahan..."
        />
      </label> */}
    </section>
  );
}
