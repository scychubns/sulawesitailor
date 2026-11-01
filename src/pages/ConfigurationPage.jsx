import { useState } from "react";
import CustomerForm from "../components/CustomerForm";
import DesignControls from "../components/DesignControl";
import MeasurementForm from "../components/MeasurementForm";
import DesignSummary from "../components/DesignSummary";
import { Link } from "react-router-dom";
import SkirtPatternPreview from "../components/PatternPreview";
import SkirtPattern from "../components/SkirtPattern";

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
            value={designTitle|| `Desain ${nextDesignNumber}`}
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
           <div >
            <SkirtPattern 
              design={design} 
              measurements={measurements} 
              readOnly={readOnly}
              onExtrasChange={(list) => onDesignChange("extras", list)}
              selectedExtraId={selectedExtraId}
              onSelectExtra={setSelectedExtraId}
            />
          </div>
           <div>
            <SkirtPatternPreview 
              design={design} 
              measurements={measurements} 
            />
          </div>
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

      

      <DesignSummary
        customer={customer}
        design={design}
        status={status}
        onSave={onSave}
        disabled={readOnly}
      />
    </main>
  );
}