import { formatTimeStamp } from "./formatTimestamp";
import { measurementsValid } from "./MeasurementForm";
import ZoomableImage from "./ZoomableImage";

const POCKET_LABELS = {
  none: "Tanpa kantong",
  left: "kiri depan",
  right: "kanan depan",
  both: "kiri dan kanan depan",
};

function pocketText(design) {
  const raw = String(design?.pocketOption ?? design?.pocket ?? "").toLowerCase().trim();
  if (raw === "left" || raw === "kiri") return POCKET_LABELS.left;
  if (raw === "right" || raw === "kanan") return POCKET_LABELS.right;
  if (raw === "both" || raw === "2 kantong" || raw === "kiri dan kanan") return POCKET_LABELS.both;
  return POCKET_LABELS.none;
}

const swatch = {
  width: 80,
  height: 30,
  borderRadius: 6,
  border: "1px solid #ccc",
  display: "inline-block",
  verticalAlign: "middle",
};

export default function DesignSummary({
  customer,
  design,
  measurements,
  status,
  onSave,
  disabled,
}) {
  // Aturan sama dengan preview: motif menggantikan warna
  const useMotif = design?.motifType !== "color" && !!design?.motifImage;
  const color = design?.color || "#ffffff";

  const canSave = !!design?.model && (!measurements || measurementsValid(measurements));

  return (
    <section className="panel save-panel">
      <div>
        <h2>4. Ringkasan Desain</h2>
        <p><strong>Pelanggan:</strong> {customer || "-"}</p>
        <p><strong>Model:</strong> {design?.model || "-"}</p>
        {measurements && (
          <p>
            <strong>Ukuran:</strong> pinggang {measurements.waist || "-"} cm,
            pinggul {measurements.hip || "-"} cm, panjang rok {measurements.skirtLength || "-"} cm
          </p>
        )}
        <p><strong>Kantong:</strong> {pocketText(design)}</p>

        <p>
          <strong>{useMotif ? "Motif kain:" : "Warna kain:"}</strong>{" "}
          {useMotif ? (
            <>
            <ZoomableImage
            src={design.motifImage}
            alt="Motif kain yang dipilih"
            thumbStyle={{ ...swatch, objectFit: "cover" }}
          />
          </>
          ) : (
            <>
              <span style={{ ...swatch, background: color }} />{" "}
              <span>{color.toUpperCase()}</span>
            </>
          )}
        </p>

        {design?.useBrokat && design?.brokatImage && (
          <p>
            <strong>Brokat:</strong>{" "}
            <img
              src={design.brokatImage}
              alt="Brokat yang dipilih"
              style={{ ...swatch, objectFit: "cover" }}
            />
          </p>
        )}

        <p><strong>Status:</strong> {status}</p>
        <p><strong>Dibuat:</strong> {formatTimeStamp(design?.createdAt)}</p>
        <p><strong>Terakhir diubah:</strong> {formatTimeStamp(design?.updatedAt)}</p>
      </div>

      {!disabled && (
        <div className="button-row">
          <button
            className="secondary-button"
            disabled={!canSave}
            onClick={() => onSave("Draft")}
          >
            Simpan Draft
          </button>
          <button
            className="primary-button"
            disabled={!canSave}
            onClick={() => onSave("Desain Selesai")}
          >
            Tandai Selesai
          </button>
        </div>
      )}
      {!disabled && !canSave && (
        <p className="muted" style={{ fontSize: 13 }}>
          Pilih model dan lengkapi ukuran dalam rentang yang ditentukan untuk menyimpan.
        </p>
      )}
    </section>
  );
}