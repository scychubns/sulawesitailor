import { formatTimeStamp } from "./formatTimestamp";
export default function DesignSummary({
  customer,
  design,
  status,
  onSave,
  disabled
}) {
  return (
    <section className="panel save-panel">
      <div>
        <h2>4. Ringkasan Desain</h2>
        <p><strong>Pelanggan:</strong> {customer || "-"}</p>
        <p><strong>Model:</strong> {design.model}</p>
        <p><strong>Panjang Rok:</strong> {design.length}</p>
        <p><strong>Kantong:</strong> {design.pocket}</p>
        <p><strong>Warna:</strong> 
          <input disabled
            type="color"
            value={design.color}
            onChange={(e) => onChange("color", e.target.value)}
          />
          <span>{design.color.toUpperCase()}</span></p>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Dibuat: </strong>{formatTimeStamp(design.createdAt)}</p>
        <p><strong>Terakhir diubah:</strong> {formatTimeStamp(design.updatedAt)}</p>
      </div>
      {disabled ? "":
        <div className="button-row">
          <button
            className="secondary-button"
            onClick={() => onSave("Draft")}
          >
            Simpan Draft
          </button>

          <button
            className="primary-button"
            onClick={() => onSave("Desain Selesai")}
          >
            Tandai Selesai
          </button>
        </div>
      }
    </section>
  );
}
