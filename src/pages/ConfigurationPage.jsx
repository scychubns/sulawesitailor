import { useState } from "react";
import CustomerForm from "../components/CustomerForm";
import DesignControls from "../components/DesignControl";
import MeasurementForm from "../components/MeasurementForm";
import DesignSummary from "../components/DesignSummary";
import { Link } from "react-router-dom";
import SkirtPatternPreview from "../components/PatternPreview";
import SkirtPattern from "../components/SkirtPattern";
import placeholderRok from "../assets/placeholder-rok.jpg";

const isEmptyValue = (v) => v === "" || v == null || Number(v) <= 0;

const FIELD_LABELS = {
  waist: "lingkar pinggang",
  hip: "lingkar pinggul",
  skirtLength: "panjang rok",
};

export default function ConfigurationPage({
  customer,
  listCustomer,
  onCustomerChange,
  onAddCustomer,
  design,
  onDesignChange,
  measurements,
  onMeasurementChange,
  status,
  onSave,
  designTitle,
  onTitleChange,
  nextDesignNumber,
  readOnly = false,
}) {
  // Hiasan yang sedang dipilih, dibagi antara preview rok dan form dekorasi
  const [selectedExtraId, setSelectedExtraId] = useState(null);

  // Kolom ukuran yang belum diisi
  const missing = Object.keys(FIELD_LABELS).filter((k) =>
    isEmptyValue(measurements[k])
  );
  const isComplete = missing.length === 0;

  return (
    <main className="container">
      <div>
        <Link to="/" className="back-link">
          ← Kembali
        </Link>
      </div>

      <header className="page-header">
        <div>
          <input
            type="text"
            className="design-title-input"
            value={designTitle || `Desain ${nextDesignNumber}`}
            disabled={readOnly}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={`Desain ${nextDesignNumber}`}
            aria-label="Judul desain"
          />
        </div>

        <span
          className={`status ${
            status === "Desain Selesai" ? "approved" : ""
          }`}
        >
          {status}
        </span>
      </header>

      <CustomerForm
        customer={customer}
        listCustomer={listCustomer}
        onCustomerChange={onCustomerChange}
        onAddCustomer={onAddCustomer}
        disabled={readOnly}
      />

      <section className="workspace">
        <div className="panel preview-panel">
          <h2>2. Visualisasi Desain</h2>
          <p className="muted">
            Pratinjau yang dihasilkan berdasarkan elemen desain yang dipilih.
          </p>

          {isComplete ? (
            <>
              <div>
                <SkirtPattern
                  design={design}
                  measurements={measurements}
                  readOnly={readOnly}
                  onExtrasChange={(list) => onDesignChange("extras", list)}
                  selectedExtraId={selectedExtraId}
                  onSelectExtra={setSelectedExtraId}
                />
              </div>
              
            </>
          ) : (
            <div
              role="status"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "16px 0",
              }}
            >
               <p style={{ textAlign: "center", margin: 0, fontWeight: 600 }}>
                Lengkapi lingkar pinggang, lingkar pinggul, dan panjang rok
              </p>
              <img
                src={placeholderRok}
                alt="Contoh siluet rok sebagai placeholder"
                style={{ width: "100%", maxWidth: 320, height: "auto", opacity: 0.85 }}
              />
              {missing.length < 3 && (
                <p className="muted" style={{ textAlign: "center", margin: 0, fontSize: 13 }}>
                  Yang belum diisi: {missing.map((k) => FIELD_LABELS[k]).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <MeasurementForm
            measurements={measurements}
            onChange={onMeasurementChange}
            disabled={readOnly}
          />
          <DesignControls
            design={design}
            onChange={onDesignChange}
            disabled={readOnly}
            selectedExtraId={selectedExtraId}
            onSelectExtra={setSelectedExtraId}
          />
        </div>
      </section>
      <SkirtPatternPreview
        design={design}
        measurements={measurements}
      />
      <DesignSummary
        customer={customer}
        design={design}
        status={status}
        onSave={onSave}
        disabled={readOnly}
        measurements={measurements}
      />
    </main>
  );
}