import { formatTimeStamp } from "./formatTimestamp";
import { measurementsValid } from "./MeasurementForm";
import SkirtPattern from "./SkirtPattern";
import ZoomableImage from "./ZoomableImage";
import placeholderRok from "../assets/placeholder-rok.jpg";

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

const TYPE_LABELS = { lace: "Renda", overlay: "Brokat", ribbon: "Pita" };
const PART_LABELS = {
  both: "depan dan belakang",
  front: "depan saja",
  back: "belakang saja",
};

const swatch = {
  width: 80,
  height: 30,
  borderRadius: 6,
  border: "1px solid #ccc",
  display: "inline-block",
  verticalAlign: "middle",
};

function extraDetail(e) {
  const parts = [PART_LABELS[e.part] || PART_LABELS.both];

  if (e.type === "overlay" && !(Number(e.h) > 0)) {
    parts.push("seluruh rok");
  } else {
    const from = e.anchor === "hem" ? "hem" : "pinggang";
    parts.push(`${Number(e.y) || 0} cm dari ${from}`);
    if (Number(e.h) > 0) parts.push(`tinggi ${Number(e.h)} cm`);
  }

  parts.push(Number(e.w) > 0 ? `lebar ${Number(e.w)} cm` : "selebar rok");
  if (e.type === "overlay") {
    parts.push(`kepekatan ${Math.round((Number(e.opacity) || 0.9) * 100)}%`);
  }
  return parts.join(", ");
}

function ExtraItem({ e }) {
  const name = e.label || TYPE_LABELS[e.type] || "Hiasan";
  const customName = e.label && e.label !== TYPE_LABELS[e.type] ? e.label : null;
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
      {e.image ? (
        <ZoomableImage
          src={e.image}
          alt={`${name} yang dipilih`}
          thumbStyle={{ ...swatch, objectFit: "cover" }}
        />
      ) : (
        <span style={{ ...swatch, background: e.color || "#ffffff" }} />
      )}
      <span>
        <strong>Keterangan:</strong>{" "}
        {customName ? `${customName}, ` : ""}
        {extraDetail(e)}
        {e.image ? ", memakai gambar unggahan" : ""}
      </span>
    </li>
  );
}

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

  // Hanya hiasan yang ditampilkan di rok
  const extras = (Array.isArray(design?.extras) ? design.extras : []).filter((e) => !e.hidden);
  const laces = extras.filter((e) => e.type === "lace");
  const overlays = extras.filter((e) => e.type === "overlay");
  const ribbons = extras.filter((e) => e.type === "ribbon");

  const canSave = !!design?.model && !!measurements && measurementsValid(measurements);
  const showPreview = canSave;
  const renderGroup = (title, list) => (
    <div style={{ margin: "8px 0" }}>
      <strong>{title}:</strong>
      {list.length === 0 ? (
        <span> Tidak ada</span>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((e, i) => (
            <ExtraItem key={e.id || i} e={e} />
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="panel save-panel">
      <div style={{display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)"}}>
        <div>
          <h2>4. Ringkasan Desain</h2>
          <div>
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
              <ZoomableImage
                src={design.motifImage}
                alt="Motif kain yang dipilih"
                thumbStyle={{ ...swatch, objectFit: "cover" }}
              />
            ) : (
              <>
                <span style={{ ...swatch, background: color }} />{" "}
                <span>{color.toUpperCase()}</span>
              </>
            )}
          </p>

          {renderGroup("Renda", laces)}
          {renderGroup("Brokat", overlays)}
          {ribbons.length > 0 && renderGroup("Pita", ribbons)}

          <p><strong>Status:</strong> {status}</p>
          <p><strong>Dibuat:</strong> {formatTimeStamp(design?.createdAt)}</p>
          <p><strong>Terakhir diubah:</strong> {formatTimeStamp(design?.updatedAt)}</p>
          </div>
        </div>
        <div
          aria-label="Hasil visualisasi rok (hanya tampilan)"
          style={{
            maxWidth: 420,
            margin: "8px 0 16px",
            padding: 8,
            borderLeft: "1px solid rgba(128,128,128,0.35)",
            // borderRadius: 8,
            pointerEvents: "none", // pengaman tambahan: tidak bisa diklik atau diseret
            userSelect: "none",
          }}
        >
        {showPreview ? (
          <SkirtPattern
            design={design}
            measurements={measurements}
            readOnly
            selectedExtraId={null}
            onSelectExtra={() => {}}
          />
        ) : (
          <img
            src={placeholderRok}
            alt="Contoh siluet rok sebagai placeholder"
            style={{ width: "100%", maxWidth: 300, height: "auto", opacity: 0.85, display: "flex", margin: "auto" }}
          />
        )}
        </div>
      </div>
      {!disabled && canSave && (
  <div className="button-row">
    <button
      className="primary-button"
      onClick={() => onSave("Desain Selesai")}
    >
      Tandai Selesai
    </button>
    <button
      className="secondary-button"
      onClick={() => onSave("Draft")}
    >
      Simpan Draft
    </button>
  </div>
)}
      {!disabled && !canSave && (
        <p className="muted" style={{ fontSize: 13, display: "flex", flexDirection: "row-reverse"}}>
          Pilih model dan lengkapi ukuran dalam rentang yang ditentukan untuk menyimpan.
        </p>
      )}
    </section>
  );
}