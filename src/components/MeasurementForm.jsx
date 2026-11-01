export const LIMITS = {
  waist: { min: 40, max: 150 },
  hip: { max: 180 }, // minimum sama dengan lingkar pinggang
  skirtLength: { min: 20, max: 120 },
};

export function getMeasurementErrors({ waist, hip, skirtLength }) {
  const w = Number(waist);
  const h = Number(hip);
  const l = Number(skirtLength);
  const errors = {};

  if (!(w >= LIMITS.waist.min && w <= LIMITS.waist.max)) {
    errors.waist = `Lingkar pinggang harus ${LIMITS.waist.min}-${LIMITS.waist.max} cm`;
  }

  const hipMin = w >= LIMITS.waist.min ? w : LIMITS.waist.min;
  if (!(h >= hipMin && h <= LIMITS.hip.max)) {
    errors.hip = `Lingkar pinggul harus ${hipMin}-${LIMITS.hip.max} cm (tidak boleh lebih kecil dari pinggang)`;
  }

  if (!(l >= LIMITS.skirtLength.min && l <= LIMITS.skirtLength.max)) {
    errors.skirtLength = `Panjang rok harus ${LIMITS.skirtLength.min}-${LIMITS.skirtLength.max} cm`;
  }

  return errors;
}

export function measurementsValid(measurements) {
  return Object.keys(getMeasurementErrors(measurements)).length === 0;
}

export default function MeasurementForm({ measurements, onChange, disabled }) {
  const errors = getMeasurementErrors(measurements);
  // pesan error hanya muncul setelah kolom diisi
  const filled = (key) => measurements[key] !== "" && measurements[key] != null;
  const err = (key) => (filled(key) ? errors[key] : undefined);
  const errStyle = { color: "#b91c1c", display: "block" };

  return (
    <section className="panel section-panel">
      <h2>3. Ukuran Pelanggan & Elemen Desain</h2>
      <p className="muted">
        Isi ketiga ukuran dalam rentang yang ditentukan. Visualisasi rok
        menyesuaikan skala berdasarkan ukuran yang diinput.
      </p>

      <div className="measurement-grid">
        <label>
          Lingkar Pinggang (cm)
          <input
            type="number"
            step="any"
            min={LIMITS.waist.min}
            max={LIMITS.waist.max}
            value={measurements.waist}
            disabled={disabled}
            onChange={(e) => onChange("waist", e.target.value)}
            placeholder={`${LIMITS.waist.min}-${LIMITS.waist.max}, contoh: 70`}
            aria-invalid={!!err("waist")}
          />
          {err("waist") && <small role="alert" style={errStyle}>{err("waist")}</small>}
        </label>

        <label>
          Lingkar Pinggul (cm)
          <input
            type="number"
            step="any"
            min={Number(measurements.waist) || LIMITS.waist.min}
            max={LIMITS.hip.max}
            value={measurements.hip}
            disabled={disabled}
            onChange={(e) => onChange("hip", e.target.value)}
            placeholder={`maks ${LIMITS.hip.max}, contoh: 92`}
            aria-invalid={!!err("hip")}
          />
          {err("hip") && <small role="alert" style={errStyle}>{err("hip")}</small>}
        </label>

        <label>
          Panjang Rok (cm)
          <input
            type="number"
            step="any"
            min={LIMITS.skirtLength.min}
            max={LIMITS.skirtLength.max}
            value={measurements.skirtLength}
            disabled={disabled}
            onChange={(e) => onChange("skirtLength", e.target.value)}
            placeholder={`${LIMITS.skirtLength.min}-${LIMITS.skirtLength.max}, contoh: 60`}
            aria-invalid={!!err("skirtLength")}
          />
          {err("skirtLength") && <small role="alert" style={errStyle}>{err("skirtLength")}</small>}
        </label>
      </div>
    </section>
  );
}