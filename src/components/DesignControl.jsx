import { useMemo, useRef, useState } from "react";
import { duplicateExtra, layerInfo, nextZ, removeExtraAt, shiftLayer, withIds } from "./ornaments";
import { validateFabricAndModel } from "../utils/fabricRules";

/* ---------- Dekorasi tambahan (design.extras) ---------- */
const MAX_EXTRAS = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MODEL_RULE_KEY = { "A-Line": "a-line", Pleated: "plisket", Pensil: "pensil" };

const FABRICS = [
  { value: "cotton", label: "Katun Murni" },
  { value: "chiffon", label: "Chiffon / Sifon" },
  { value: "polyester", label: "Polyester" },
  { value: "jersey", label: "Kaos / Jersey" },
  { value: "denim", label: "Denim / Jeans" },
  { value: "batik", label: "Batik" },
];
const warningBoxStyle = {
  backgroundColor: "#fffbe6",
  border: "1px solid #ffe58f",
  borderRadius: 8,
  padding: "12px 16px",
  color: "#8c6b00",
};
const EXTRA_PRESETS = {
  lace: {
    label: "Renda",
    make: () => ({
      type: "lace", part: "both", anchor: "hem", y: "0", h: "3.5",
      w: "", x: "0", color: "#fff8ef", scallop: "4", tileSize: "15", image: "",
    }),
  },
  overlay: {
    label: "Layer brokat",
    make: () => ({
      type: "overlay", part: "both", anchor: "waist", y: "0", h: "",
      w: "", x: "0", color: "#ffffff", opacity: "0.9", tileSize: "15", image: "", blend: "auto",
    }),
  },
  // ribbon: {
  //   label: "Pita",
  //   make: () => ({
  //     type: "ribbon", part: "both", anchor: "waist", y: "10", h: "1.5",
  //     w: "", x: "0", color: "#c0392b",
  //   }),
  // },
};

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ex-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

function readImage(file, done) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Silakan pilih file gambar.");
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    alert("Ukuran gambar maksimal 5 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => done(reader.result);
  reader.onerror = () => alert("Gambar gagal dibaca.");
  reader.readAsDataURL(file);
}

const cardStyle = {
  display: "grid",
  gap: 8,
  marginTop: 10,
  padding: 10,
  border: "1px solid rgba(128,128,128,0.35)",
  borderRadius: 8,
};
const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const fieldStyle = { display: "grid", gap: 2, fontSize: 13 };
const rowStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };

function ExtraEditor({ item, disabled, selected, onSelect, onPatch, onRemove, onDuplicate, layer, onLayer }) {
  const preset = EXTRA_PRESETS[item.type] || EXTRA_PRESETS.overlay;
  const hasImage = item.type === "overlay" || item.type === "lace";
  const fullWidth = !(Number(item.w) > 0);
  const inputId = `extra-img-${item.id}`;
  const visible = !item.hidden;

  return (
    <div
      style={{
        ...cardStyle,
        opacity: visible ? 1 : 0.6,
        border: selected ? "1px solid #2563eb" : cardStyle.border,
        boxShadow: selected ? "0 0 0 1px #2563eb" : "none",
      }}
    >
      <div style={{ ...rowStyle, justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={onSelect}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 600 }}
          title="Pilih hiasan ini di preview rok"
        >
          {item.label || preset.label}
        </button>
        <span style={rowStyle}>
          <label style={rowStyle}>
            <input
              type="checkbox"
              checked={visible}
              disabled={disabled}
              onChange={(e) => onPatch({ hidden: !e.target.checked })}
            />
            Tampilkan
          </label>
          <button type="button" disabled={disabled} onClick={onDuplicate}>
            Duplikat
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Lapisan {layer.pos}/{layer.total}</span>
          <button
            type="button" disabled={disabled || layer.pos >= layer.total} onClick={() => onLayer(1)}
            title="Naikkan lapisan: menutupi hiasan lain yang bertumpuk. Urutan kartu tidak berubah."
          >
            Naikkan lapisan
          </button>
          <button
            type="button" disabled={disabled || layer.pos <= 1} onClick={() => onLayer(-1)}
            title="Turunkan lapisan: tertutup hiasan lain yang bertumpuk. Urutan kartu tidak berubah."
          >
            Turunkan lapisan
          </button>
          <button type="button" disabled={disabled} onClick={onRemove}>
            Hapus
          </button>
        </span>
      </div>

      <label style={fieldStyle}>
        Nama (opsional)
        <input
          type="text"
          value={item.label || ""}
          placeholder={preset.label}
          disabled={disabled}
          onChange={(e) => onPatch({ label: e.target.value })}
        />
      </label>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          Letak
          <select
            value={item.part || "both"}
            disabled={disabled}
            onChange={(e) => onPatch({ part: e.target.value })}
          >
            <option value="both">Depan dan belakang</option>
            <option value="front">Depan saja</option>
            <option value="back">Belakang saja</option>
          </select>
        </label>

        <label style={fieldStyle}>
          Ukur dari
          <select
            value={item.anchor || "waist"}
            disabled={disabled}
            onChange={(e) => onPatch({ anchor: e.target.value })}
          >
            <option value="waist">Pinggang (dari atas)</option>
            <option value="hem">Hem (dari bawah)</option>
          </select>
        </label>

        <label style={fieldStyle}>
          {item.anchor === "hem" ? "Jarak dari hem (cm)" : "Jarak dari pinggang (cm)"}
          <input
            type="number" min="0" step="0.5"
            value={item.y ?? ""}
            disabled={disabled}
            onChange={(e) => onPatch({ y: e.target.value })}
          />
        </label>

        <label style={fieldStyle}>
          Tinggi (cm)
          <input
            type="number" min="0.5" step="0.5"
            value={item.h ?? ""}
            placeholder={item.type === "overlay" ? "seluruh rok" : ""}
            disabled={disabled}
            onChange={(e) => onPatch({ h: e.target.value })}
          />
        </label>
      </div>

      <label style={rowStyle}>
        <input
          type="checkbox"
          checked={fullWidth}
          disabled={disabled}
          onChange={(e) => onPatch({ w: e.target.checked ? "" : "10", x: "0" })}
        />
        Selebar rok penuh
      </label>

      {!fullWidth && (
        <div style={gridStyle}>
          <label style={fieldStyle}>
            Lebar (cm)
            <input
              type="number" min="1" step="0.5"
              value={item.w ?? ""}
              disabled={disabled}
              onChange={(e) => onPatch({ w: e.target.value })}
            />
          </label>
          <label style={fieldStyle}>
            Geser dari tengah (cm, minus = kiri)
            <input
              type="number" step="0.5"
              value={item.x ?? "0"}
              disabled={disabled}
              onChange={(e) => onPatch({ x: e.target.value })}
            />
          </label>
        </div>
      )}

      <div style={gridStyle}>
        {!(item.type === "overlay" && item.image) && (
          <label style={fieldStyle}>
            Warna
            <input
              type="color"
              value={item.color || "#ffffff"}
              disabled={disabled}
              onChange={(e) => onPatch({ color: e.target.value })}
            />
          </label>
        )}

        {item.type === "overlay" && (
          <label style={fieldStyle}>
            Kepekatan layer ({Math.round((Number(item.opacity) || 0) * 100)}%)
            <input
              type="range" min="0.1" max="1" step="0.05"
              value={item.opacity ?? "0.9"}
              disabled={disabled}
              onChange={(e) => onPatch({ opacity: e.target.value })}
            />
          </label>
        )}

        {item.type === "lace" && (
          <label style={fieldStyle}>
            Lebar skalop (cm)
            <input
              type="number" min="1" step="0.5"
              value={item.scallop ?? "4"}
              disabled={disabled}
              onChange={(e) => onPatch({ scallop: e.target.value })}
            />
          </label>
        )}
      </div>

      {hasImage && (
        <div style={fieldStyle}>
          <span>Gambar {item.type === "lace" ? "renda" : "brokat"} (opsional)</span>
          <div style={rowStyle}>
            <input
              id={inputId}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              disabled={disabled}
              onChange={(e) => {
                readImage(e.target.files?.[0], (url) => onPatch({ image: url }));
                e.target.value = "";
              }}
            />
            {item.image && (
              <>
                <img
                  src={item.image}
                  alt=""
                  style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }}
                />
                <button type="button" disabled={disabled} onClick={() => onPatch({ image: "" })}>
                  Hapus gambar
                </button>
              </>
            )}
          </div>
          {item.type === "overlay" && (
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              Disarankan PNG transparan (motif brokat tanpa latar), persegi, bisa
              menyambung (seamless), minimal 1000 px. Gambar berlatar putih atau
              hitam juga bisa dipakai.
            </span>
          )}
          {item.type === "overlay" && item.image && (
            <label style={fieldStyle}>
              Jenis gambar
              <select
                value={item.blend || "auto"}
                disabled={disabled}
                onChange={(e) => onPatch({ blend: e.target.value })}
              >
                <option value="auto">Otomatis (deteksi dari file)</option>
                <option value="normal">PNG transparan</option>
                <option value="multiply">Latar putih (putih dihilangkan)</option>
                <option value="screen">Latar hitam (hitam dihilangkan)</option>
              </select>
            </label>
          )}
          {item.image && (
            <label style={fieldStyle}>
              Lebar satu pengulangan gambar (cm)
              <input
                type="number" min="2" step="1"
                value={item.tileSize ?? "15"}
                disabled={disabled}
                onChange={(e) => onPatch({ tileSize: e.target.value })}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Rekomendasi model berdasarkan jenis acara ---------- */
const OCCASIONS = {
  formal: {
    label: "Formal",
    hint: "kantor, wisuda, acara resmi",
    primary: {
      model: "Pleated",
      length: "Panjang",
      why: "Lipit yang rapi dan jatuhnya yang anggun memberi kesan resmi dan elegan.",
    },
    alternative: {
      model: "A-Line",
      length: "Panjang",
      why: "Siluet sederhana dan nyaman bergerak; tetap resmi bila panjangnya sampai betis atau mata kaki.",
    },
    tips: [
      "Pilih warna netral atau gelap, misalnya hitam, navy, abu-abu, atau krem.",
      "Ornamen secukupnya: renda sempit di hem. Layer brokat cocok untuk acara resmi seperti kondangan.",
      "Kantong sebaiknya tidak ada atau hanya satu sisi agar siluet tetap rapi.",
    ],
  },
  nonformal: {
    label: "Nonformal",
    hint: "kuliah, santai, jalan-jalan",
    primary: {
      model: "A-Line",
      length: "Pendek",
      why: "Ringan, mudah bergerak, dan memberi kesan santai.",
    },
    alternative: {
      model: "Pleated",
      length: "Pendek",
      why: "Lipit memberi kesan ceria dan bergaya, tetap nyaman dipakai sehari-hari.",
    },
    tips: [
      "Warna cerah atau motif, termasuk batik modern, cocok untuk tampilan santai.",
      "Ornamen lebih bebas: renda di hem memberi kesan manis.",
      "Kantong kiri dan kanan praktis untuk dibawa bepergian.",
    ],
  },
};

function RecommendationRow({ title, rec }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <strong style={{ fontSize: 13 }}>
        {title}: {rec.model} {rec.length.toLowerCase()}
      </strong>
      <span style={{ fontSize: 12, opacity: 0.85 }}>{rec.why}</span>
    </div>
  );
}

function OccasionRecommendation({ design, onChange, disabled }) {
  const current = OCCASIONS[design.occasion] ? design.occasion : "";
  const info = current ? OCCASIONS[current] : null;

  return (
    <div style={{ display: "grid", gap: 8, margin: "0 0 12px" }}>
      <span style={{ fontWeight: 600 }}>Jenis Acara</span>
      <div style={{ ...rowStyle, gap: 10 }}>
        {Object.entries(OCCASIONS).map(([key, o]) => {
          const isActive = current === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              className={isActive ? "primary-button" : "secondary-button"}
              onClick={() => onChange("occasion", isActive ? "" : key)}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {!info && (
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          Pilih jenis acara untuk melihat rekomendasi model.
        </span>
      )}

      {info && (
        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 12,
            borderRadius: 8,
            background: "rgba(250,204,21,0.18)",
          }}
        >
          <span style={{ fontSize: 13 }}>
            Rekomendasi untuk acara {info.label.toLowerCase()} ({info.hint})
          </span>

          <RecommendationRow title="Disarankan" rec={info.primary} />
          <RecommendationRow title="Alternatif" rec={info.alternative} />

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.9, display: "grid", gap: 2 }}>
            {info.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          {/* <span style={{ fontSize: 11, opacity: 0.7 }}>
            Rekomendasi hanya saran umum. Pilih model, panjang, dan ornamen sendiri pada form di bawah.
          </span> */}
        </div>
      )}
    </div>
  );
}

export default function DesignControls({
  design,
  onChange,
  disabled,
  selectedExtraId, // opsional: pilihan hiasan yang dibagi dengan preview rok
  onSelectExtra, // opsional: (id | null) => void
  maxHeight = "calc(100vh - 140px)", // tinggi maksimal panel; isi form bergulir sendiri
}) {
 const motifUploadRef = useRef(null);
 const extras = Array.isArray(design.extras) ? design.extras : [];

 const [innerSel, setInnerSel] = useState(null);
 const selectedId = selectedExtraId !== undefined ? selectedExtraId : innerSel;
 const select = (id) => {
  setInnerSel(id);
  if (onSelectExtra) onSelectExtra(id);
 };

 const addExtra = (type) => {
  if (extras.length >= MAX_EXTRAS) return;
  const id = newId();
  const list = withIds(extras);
  onChange("extras", [...list, { id, ...EXTRA_PRESETS[type].make(), z: nextZ(list) }]);
  select(id);
 };
 const patchExtra = (id, patch) =>
  onChange("extras", withIds(extras).map((e) => (e.id === id ? { ...e, ...patch } : e)));
 const removeExtra = (id) => {
  const list = withIds(extras);
  onChange("extras", removeExtraAt(list, list.findIndex((e) => e.id === id)));
  if (selectedId === id) select(null);
 };
 const duplicateOne = (id) => {
  if (extras.length >= MAX_EXTRAS) return;
  const list = withIds(extras);
  const out = duplicateExtra(list, list.findIndex((e) => e.id === id));
  onChange("extras", out.list);
  if (out.newId) select(out.newId);
 };
 const layerOne = (id, dir) => {
  const list = withIds(extras);
  onChange("extras", shiftLayer(list, list.findIndex((e) => e.id === id), dir));
 };

 const handleMotifUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Silakan pilih file gambar.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Ukuran gambar maksimal 5 MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    onChange("motifType", "image");
    onChange("motifFile", file);
    onChange("motifImage", reader.result);
  };

  reader.onerror = () => {
    alert("Gambar gagal dibaca.");
  };

  reader.readAsDataURL(file);
  };

const handleRemoveMotif = () => {
  onChange("motifType", "color");
  onChange("motifImage", "");
  onChange("motifFile", null);
  if (motifUploadRef.current) {
    motifUploadRef.current.value = "";
  }
};
const suggestion = useMemo(
  () => validateFabricAndModel(MODEL_RULE_KEY[design.model] || design.model, design.fabricType),
  [design.model, design.fabricType]
);
  return (
    <div
      className="panel controls"
      style={{
        maxHeight,
        overflowY: "auto",
        overscrollBehavior: "contain", // gulir form tidak ikut menggulir halaman
        scrollbarGutter: "stable",
      }}
    >
      <h2>Elemen Desain</h2>

      <OccasionRecommendation design={design} onChange={onChange} disabled={disabled} />

      <label>
        Model Rok
        <select
          value={design.model || ""}
          disabled={disabled}
          onChange={(e) => onChange("model", e.target.value)}
        >
          <option value="" disabled>Pilih model</option>
          <option value="A-Line">A-Line</option>
          <option value="Pleated">Pleated</option>
          <option value="Pensil">Pensil</option>
        </select>
      </label>
      <label>
        Jenis Bahan Kain
        <select
          value={design.fabricType || "cotton"}
          disabled={disabled}
          onChange={(e) => onChange("fabricType", e.target.value)}
        >
          {FABRICS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </label>

      {suggestion && (
        <div style={{ ...warningBoxStyle, margin: "8px 0 12px" }}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>💡 {suggestion.title}</div>
          <p style={{ margin: "4px 0", fontSize: 13 }}>{suggestion.message}</p>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            <strong>Rekomendasi bahan terbaik untuk model ini:</strong>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
              {(suggestion.recommendedFabrics || []).map((fab) => (
                <li key={fab}>{fab}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <label>
        Kantong Rok
        <select
          value={design.pocket}
          onChange={(e) => onChange("pocket", e.target.value)}
        >
          <option value="Tanpa kantong">Tanpa kantong</option>
          <option value="kiri">Kantong kiri</option>
          <option value="kanan">Kantong kanan</option>
          <option value="2 kantong">Kantong kiri dan kanan</option>
        </select>
      </label>
        
      <label>Jenis Motif Rok
        <div className="options">
          <div className="motif-option">
          <label className="motif-radio">
            <input
              type="radio"
              name="motifType"
              value="color"
              disabled={disabled}
              checked={(design.motifType || "color") === "color"}
              onChange={() => {
                onChange("motifType", "color");
                onChange("motifImage", "");
                onChange("motifFile", null);
              }}
            />
            Warna
          </label>
          <div className="color-input-group">
          <input
            id="skirt-color"
            type="color"
            disabled={disabled}
            value={design.color || "#ffffff"}
            onChange={(event) => {
              /* memilih warna berarti kembali ke warna polos: gambar motif dilepas */
              onChange("motifImage", "");
              onChange("motifFile", null);
              onChange("motifType", "color");
              onChange("color", event.target.value);
            }}
          />
          </div>
          </div>
          <div className="motif-option">
            <label className="motif-radio">
              <input
                ref={motifUploadRef}
                type="radio"
                name="motifType"
                value="image"
                disabled={disabled}
                checked={design.motifType === "image"}
                onChange={() => {
                  onChange("motifType", "image");
                  motifUploadRef.current?.click();
                }}
              />
              Gambar motif
            </label>

            <div className="image-motif-input">
              <input
                ref={motifUploadRef}
                id="motif-upload"
                type="file"
                disabled={disabled}
                accept="image/png, image/jpeg, image/webp"
                onChange={handleMotifUpload}
              />
              <label
                htmlFor="motif-upload"
                className="motif-image-box"
                title="Pilih gambar motif"
              >
              </label>
              <div className="motif-image-actions">
                {disabled ? "" :
                  (design.motifImage && (
                    <button
                      type="button"
                      onClick={() => {handleRemoveMotif()}}
                    >
                      Hapus
                    </button>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

      </label>

      <fieldset style={{ border: "none", padding: 0, margin: "16px 0 0" }}>
        <legend style={{ fontWeight: 600, padding: 0 }}>Dekorasi Tambahan</legend>
        <p style={{ fontSize: 13, margin: "4px 0 0", opacity: 0.8 }}>
          Tambahkan renda, layer brokat, atau pita di posisi mana saja. Hiasan
          bisa diseret langsung di preview rok, atau diatur angkanya di sini.
          Ukuran dalam cm pada rok jadi.
        </p>

        <div style={{ ...rowStyle, marginTop: 8 }}>
          {Object.entries(EXTRA_PRESETS).map(([type, preset]) => (
            <button
              key={type}
              type="button"
              disabled={disabled || extras.length >= MAX_EXTRAS}
              onClick={() => addExtra(type)}
            >
              + {preset.label}
            </button>
          ))}
        </div>

        {extras.length === 0 && (
          <p style={{ fontSize: 13, margin: "8px 0 0", opacity: 0.7 }}>
            Belum ada dekorasi tambahan.
          </p>
        )}

        {withIds(extras).map((item, idx, arr) => (
          <ExtraEditor
            key={item.id}
            item={item}
            disabled={disabled}
            selected={item.id === selectedId}
            onSelect={() => select(item.id)}
            onPatch={(patch) => patchExtra(item.id, patch)}
            onRemove={() => removeExtra(item.id)}
            onDuplicate={() => duplicateOne(item.id)}
            layer={layerInfo(arr, idx)}
            onLayer={(dir) => layerOne(item.id, dir)}
          />
        ))}
      </fieldset>
    </div>
  );
}