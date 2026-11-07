import { useEffect, useId, useMemo, useState } from "react";
import { appliesTo, describeExtra, normalizeExtras } from "./ornaments";

/* ---------- Parameter konstruksi (nilai awal prototipe) ----------
   Semua angka di sini harus divalidasi dengan penjahit / buku teknik pola.
   Pola digambar SEPEREMPAT badan: tepi kiri = garis lipatan tengah,
   tepi kanan = garis kampuh samping. */
export const EASE = 2; // kelonggaran total keliling (cm), dibagi 4 per pola
export const HIP_DEPTH = 20; // jarak garis pinggang ke garis pinggul (cm)
const DART_SHARE = 0.6; // porsi selisih pinggul-pinggang yang jadi kupnat
export const DARTS_PER_QUARTER = { front: 1, back: 1 };
export const DART_LENGTH = { front: 10, back: 13 }; // cm
/* Kain tambahan di bawah garis hem untuk kelim (lipat tunggal), dipakai
   oleh semua model. Hanya muncul di pola potong; preview rok jadi
   menampilkan hem yang sudah rapi tanpa garis kelim. */
export const HEM_ALLOWANCE = 3; // cm

/* ---------- Daftar model ----------
   type "quarter": pola seperempat badan (flare = tambahan lebar hem untuk
                   setengah rok; pola seperempat memakai separuhnya).
   type "pleated": pola plisket dibuka datar (persegi panjang + ikat pinggang).
   Untuk menambah model baru: tambah entri di sini, lalu buat fungsi hitung
   dan tampilannya (lihat computePleated dan PleatedView sebagai contoh). */
const MODELS = {
  "a-line": { type: "quarter", flare: 12 },
  aline: { type: "quarter", flare: 12 },
  pensil: { type: "quarter", flare: -4 },
  pencil: { type: "quarter", flare: -4 },
  span: { type: "quarter", flare: 0 },
  plisket: { type: "pleated" },
  pleated: { type: "pleated" },
  plated: { type: "pleated" },
};
const DEFAULT_MODEL = { type: "quarter", flare: 4 };

export function resolveModel(model) {
  const key = String(model ?? "").toLowerCase().replace(/[\s_]/g, "");
  return MODELS[key] ?? DEFAULT_MODEL;
}

/* ---------- Parameter plisket (nilai awal, validasi dengan penjahit) ---------- */
export const PLEAT_COUNT = 12; // jumlah lipit (bisa diubah lewat design.pleatCount)
const PLEAT_FULLNESS = 2; // lebar kain datar = kelipatan lingkar pinggul jadi
export const BAND_HEIGHT = 4; // tinggi ikat pinggang jadi (cm)
const BAND_OVERLAP = 3; // tambahan panjang ikat pinggang untuk tumpang tindih (cm)
const SEAM_ALLOWANCE = 1.5; // kampuh samping di kiri dan kanan tiap potongan (cm)

/* ---------- Parameter tampilan ---------- */
const SCALE = 5; // unit layar per cm (bukan ukuran cetak 1:1)
const MARGIN = 60; // ruang atas pola (untuk garis ukuran tepi atas dan kupnat)
const SIDE = 56; // ruang kiri/kanan untuk angka ukuran
const GAP = 64;

/* Tata letak: potongan depan (kiri) dan belakang (kanan) berdampingan */
const PATTERN_MAX_WIDTH = 960; // px, lebar total kedua gambar; kecilkan untuk gambar lebih kecil
const sidesStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  alignItems: "start",
  maxWidth: PATTERN_MAX_WIDTH,
  margin: "0 auto",
};
const svgStyle = { display: "block", width: "100%", height: "auto", color: "inherit" };
const wideSvgStyle = { ...svgStyle, maxWidth: PATTERN_MAX_WIDTH, margin: "0 auto" };

/* Tiap <svg> memuat penanda panahnya sendiri supaya tidak bergantung pada svg lain */
function ArrowMarker() {
  return (
    <defs>
      <marker
        id="dim-arrow" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
      </marker>
    </defs>
  );
}

/* ---------- Motif kain ---------- */
const MOTIF_SIZE_CM = 20; // samakan dengan SkirtFinalPreview

/* Rasio tinggi/lebar asli gambar, supaya ubin motif tidak melar */
function useImageRatio(src) {
  const [ratio, setRatio] = useState(1);
  useEffect(() => {
    if (!src) return undefined;
    let alive = true;
    const img = new window.Image();
    img.onload = () => alive && setRatio(img.naturalHeight / img.naturalWidth || 1);
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return ratio;
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ---------- Kantong ---------- */
export const POCKET_DEPTH = 16; // cm dari pinggang ke ujung bawah bukaan (di kampuh samping)
export const POCKET_INSET = 9; // cm dari kampuh samping ke awal bukaan (di tepi atas)
export const POCKET_BAG_W = 16; // lebar pola kantong dalam (cm)
export const POCKET_BAG_H = 24; // tinggi pola kantong dalam (cm)

/* Kedalaman bukaan, dibatasi untuk rok yang sangat pendek */
export const pocketDepthFor = (length) => Math.min(POCKET_DEPTH, length * 0.5);

/* Nilai kantong dari form ("kiri", "kanan", "2 kantong", "Tanpa kantong")
   maupun format lama ("left", "right", "both") dijadikan satu bentuk. */
export function pocketSideOf(design) {
  const raw = String(design?.pocketOption ?? design?.pocket ?? "").toLowerCase().trim();
  if (raw === "left" || raw === "kiri") return "left";
  if (raw === "right" || raw === "kanan") return "right";
  if (raw === "both" || raw === "2 kantong" || raw === "kiri dan kanan") return "both";
  return "none";
}

/* Panjang bukaan kantong (cm): kurva dari (0,0) ke (dx, depth), titik kontrol (0, 0,62 depth) */
function curveLen(dx, depth) {
  const c = depth * 0.62;
  let len = 0;
  let px = 0;
  let py = 0;
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const x = t * t * dx;
    const y = 2 * (1 - t) * t * c + t * t * depth;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

/* Lebar pola seperempat badan pada kedalaman v (cm dari pinggang), di kampuh samping */
function sideWidthAt(p, v) {
  if (v <= p.hipDepth) return p.topWidth + (p.hipWidth - p.topWidth) * (v / p.hipDepth);
  return p.hipWidth + (p.hemWidth - p.hipWidth) * ((v - p.hipDepth) / (p.length - p.hipDepth));
}

function pocketBagDims(dx, depth) {
  return {
    W: Math.max(POCKET_BAG_W, dx + 5),
    H: Math.max(POCKET_BAG_H, depth + 8),
  };
}
const pocketBlockHeight = (dx, depth, scale) => pocketBagDims(dx, depth).H * scale + 114;

/* Pola kantong dalam (terpisah dari pola utama). Sisi kanan kantong = kampuh samping;
   garis putus-putus = bukaan kantong yang dijahit ke garis putus-putus di pola utama. */
function PocketBlock({ y0, x0, dx, depth, count, sides, scale, fabricColor, motif, uid }) {
  const { W, H } = pocketBagDims(dx, depth);
  const px = (u) => x0 + u * scale;
  const py = (v) => y0 + 48 + v * scale;
  const c = depth * 0.62;
  const open = `M ${px(W - dx)} ${py(0)} Q ${px(W - dx)} ${py(c)} ${px(W)} ${py(depth)}`;
  const body = `${open} L ${px(W)} ${py(H - 7)} Q ${px(W)} ${py(H)} ${px(W - 7)} ${py(H)} L ${px(7)} ${py(H)} Q ${px(0)} ${py(H)} ${px(0)} ${py(H - 7)} L ${px(0)} ${py(0)} Z`;
  const len = curveLen(dx, depth);
  const arrows = { markerStart: "url(#dim-arrow)", markerEnd: "url(#dim-arrow)" };
  const dim = { stroke: "currentColor", strokeOpacity: 0.7, strokeWidth: 1 };
  const ext = { stroke: "currentColor", strokeOpacity: 0.35, strokeWidth: 1 };
  const sidesText =
    sides.length === 2 ? "untuk kantong kiri dan kanan" : sides[0] === "left" ? "untuk kantong kiri" : "untuk kantong kanan";
  const tx = px(W) + 68;
  const lines = [
    `Potong ${count} kali (2 lembar per kantong)`,
    sidesText,
    `Garis putus-putus = bukaan kantong, ± ${fmt(Math.round(len * 10) / 10)} cm`,
    "Jahit ke garis putus-putus pada pola depan",
    "Sisi kanan kantong = kampuh samping",
    "Ukuran jadi, belum termasuk kampuh",
  ];
  const motifW = motif ? motif.size * scale : 0;
  const motifH = motif ? motifW * motif.ratio : 0;
  return (
    <g>
      <text x={x0} y={y0 + 14} fontSize="12" fontWeight="600" fill="currentColor">
        Pola kantong (kantong dalam)
      </text>
      <path d={body} fill={fabricColor || "currentColor"} fillOpacity={fabricColor ? "0.35" : "0.06"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {/* motif kain pada kantong */}
      {motif && (
        <>
          <defs>
            <pattern
              id={`${uid}-pocket-motif`} patternUnits="userSpaceOnUse"
              x={px(W / 2) - motifW / 2} y={py(0)} width={motifW} height={motifH}
            >
              <image href={motif.src} width={motifW} height={motifH} preserveAspectRatio="none" />
            </pattern>
          </defs>
          <path d={body} fill={`url(#${uid}-pocket-motif)`} fillOpacity="0.35" />
        </>
      )}
      <path d={open} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3" />

      <g {...ext}>
        <line x1={px(0)} x2={px(0)} y1={py(0)} y2={py(0) - 14} />
        <line x1={px(W - dx)} x2={px(W - dx)} y1={py(0)} y2={py(0) - 14} />
        <line x1={px(W)} x2={px(W) + 18} y1={py(0)} y2={py(0)} />
        <line x1={px(W)} x2={px(W) + 18} y1={py(depth)} y2={py(depth)} />
      </g>
      <g {...dim}>
        <line x1={px(0)} x2={px(W - dx)} y1={py(0) - 10} y2={py(0) - 10} {...arrows} />
        <line x1={px(0) - 14} x2={px(0) - 14} y1={py(0)} y2={py(H)} {...arrows} />
        <line x1={px(0)} x2={px(W)} y1={py(H) + 14} y2={py(H) + 14} {...arrows} />
        <line x1={px(W) + 14} x2={px(W) + 14} y1={py(0)} y2={py(depth)} {...arrows} />
      </g>
      <g fill="currentColor" fontSize="10">
        <text x={(px(0) + px(W - dx)) / 2} y={py(0) - 14} textAnchor="middle">{fmt(W - dx)} cm</text>
        <text x={px(0) - 22} y={(py(0) + py(H)) / 2 + 4} textAnchor="end">{fmt(H)} cm</text>
        <text x={(px(0) + px(W)) / 2} y={py(H) + 28} textAnchor="middle">{fmt(W)} cm</text>
        <text x={px(W) + 20} y={(py(0) + py(depth)) / 2 + 3} fontSize="9">{fmt(depth)} cm</text>
        {lines.map((t, i) => (
          <text key={i} x={tx} y={py(0) + 14 + i * 15} fontWeight={i === 0 ? 600 : 400} fillOpacity={i === 0 ? 1 : 0.85}>
            {t}
          </text>
        ))}
      </g>
    </g>
  );
}

export function computePattern(measurements, flare) {
  const waist = Number(measurements?.waist);
  const hip = Number(measurements?.hip);
  const length = Number(measurements?.skirtLength);

  if (![waist, hip, length].every((v) => Number.isFinite(v) && v > 0)) {
    return { status: "empty" };
  }
  if (hip < waist) {
    return {
      status: "error",
      message: "Lingkar pinggul tidak boleh lebih kecil dari lingkar pinggang.",
    };
  }

  // Semua lebar di bawah adalah lebar SEPEREMPAT badan
  const waistWidth = (waist + EASE) / 4; // lebar pinggang jadi
  const hipWidth = (hip + EASE) / 4;
  const dartTotal = (hipWidth - waistWidth) * DART_SHARE; // total kupnat per pola
  const topWidth = waistWidth + dartTotal; // tepi atas sebelum kupnat dijahit
  const hemWidth = Math.max(hipWidth + flare / 2, waistWidth);
  const hipDepth = Math.min(HIP_DEPTH, length * 0.5);

  // Kelim: sisi samping diteruskan lurus (kemiringan sama) sampai tepi potong
  const hem = HEM_ALLOWANCE;
  const hemCutWidth = Math.max(hemWidth + ((hemWidth - hipWidth) * hem) / (length - hipDepth), 0);

  return {
    status: "ok",
    type: "quarter",
    waist, hip, length,
    waistWidth, hipWidth, topWidth, hemWidth, hipDepth, dartTotal,
    hem, hemCutWidth,
    cutLength: length + hem, // panjang potong termasuk kelim
  };
}

/* Satu potongan seperempat badan. side "right" = garis tengah di kiri, kampuh samping di kanan;
   side "left" = bayangan cermin. u = jarak dari garis tengah (cm), v = jarak dari pinggang (cm). */
function buildPiece(p, part, side, ox, oy, panelWidth) {
  const x = (u) => (side === "right" ? ox + u * SCALE : ox + panelWidth - u * SCALE);
  const y = (v) => oy + MARGIN + v * SCALE;

  const outline = [
    `M ${x(0)} ${y(0)}`,
    `L ${x(p.topWidth)} ${y(0)}`,
    `L ${x(p.hipWidth)} ${y(p.hipDepth)}`,
    `L ${x(p.hemCutWidth)} ${y(p.cutLength)}`,
    `L ${x(0)} ${y(p.cutLength)}`,
    "Z",
  ].join(" ");

  // Area kelim (lipatan ke dalam) di bawah garis hem
  const allowance = [
    `M ${x(0)} ${y(p.length)}`,
    `L ${x(p.hemWidth)} ${y(p.length)}`,
    `L ${x(p.hemCutWidth)} ${y(p.cutLength)}`,
    `L ${x(0)} ${y(p.cutLength)}`,
    "Z",
  ].join(" ");

  // Kupnat dibagi rata di sepanjang tepi atas
  const n = DARTS_PER_QUARTER[part];
  const dartWcm = p.dartTotal / n; // lebar tiap kupnat (cm)
  const dartLcm = Math.min(DART_LENGTH[part], p.hipDepth - 2); // panjang kupnat (cm)
  const darts = [];
  const dartMarks = [];
  if (dartWcm * SCALE > 0.1 && dartLcm > 0) {
    for (let i = 0; i < n; i++) {
      const u = p.topWidth * ((i + 1) / (n + 1));
      darts.push(
        `M ${x(u - dartWcm / 2)} ${y(0)} L ${x(u)} ${y(dartLcm)} L ${x(u + dartWcm / 2)} ${y(0)}`
      );
      dartMarks.push({ u, x: x(u), y: y(dartLcm) });
    }
  }

  return { side, x, y, outline, allowance, darts, dartMarks, n, dartWcm, dartLcm };
}

/* Rentang hiasan (cm dari garis tengah) pada potongan kiri atau kanan; null bila tidak ada di sisi itu */
function sideSpan(extra, side, maxCm) {
  if (extra.full) return [0, maxCm];
  const lo = side === "right" ? Math.max(0, extra.x1) : Math.max(0, -extra.x2);
  const hi = Math.min(maxCm, side === "right" ? extra.x2 : -extra.x1);
  return hi - lo > 0.05 ? [lo, hi] : null;
}

export function computePleated(measurements, count) {
  const waist = Number(measurements?.waist);
  const hip = Number(measurements?.hip);
  const length = Number(measurements?.skirtLength);

  if (![waist, hip, length].every((v) => Number.isFinite(v) && v > 0)) {
    return { status: "empty" };
  }
  if (hip < waist) {
    return {
      status: "error",
      message: "",
    };
  }
  if (!Number.isInteger(count) || count < 4 || count > 60) {
    return { status: "error", message: "Jumlah lipit harus bilangan bulat antara 4 dan 60." };
  }
  if (count % 2 !== 0) {
    return {
      status: "error",
      message: "Jumlah lipit harus genap supaya terbagi rata ke bagian depan dan belakang.",
    };
  }

  const waistFinished = waist + EASE; // keliling pinggang jadi
  const hipFinished = hip + EASE;
  const totalWidth = PLEAT_FULLNESS * hipFinished; // lebar kain datar depan + belakang
  const visible = waistFinished / count; // lebar tiap lipit terlihat di pinggang
  const spacing = totalWidth / count; // jarak antar lipatan di kain datar
  const hidden = spacing - visible; // kain yang terlipat ke dalam per lipit
  const pieceWidth = totalWidth / 4; // lebar jadi satu potongan (depan atau belakang)
  const bandHeight = BAND_HEIGHT * 2; // dilipat dua

  return {
    status: "ok",
    type: "pleated",
    waist, hip, length, count,
    perPiece: count / 2,
    totalWidth, visible, spacing, hidden,
    depth: hidden / 2,
    pieceWidth,
    seam: SEAM_ALLOWANCE,
    pieceCut: pieceWidth + 2 * SEAM_ALLOWANCE, // lebar potongan termasuk kampuh
    hem: HEM_ALLOWANCE,
    hipDepth: Math.min(HIP_DEPTH, length * 0.5), // lipit dijahit sampai garis pinggul
    bandLength: waistFinished + BAND_OVERLAP,
    bandHeight,
    // perkiraan panjang kain: 2 potongan disusun memanjang + ikat pinggang
    fabricLength: 2 * (length + HEM_ALLOWANCE) + bandHeight,
  };
}

function PleatedView({ p, extras = [], pocketSide = "none", fabricColor, uid, motif }) {
  const VIEW_W = 640;
  const LEFT = 56;
  const scale = Math.min(4, (VIEW_W - LEFT * 2) / p.pieceCut);
  const seamPx = p.seam * scale;
  const wFin = p.pieceWidth * scale; // lebar jadi satu potongan
  const wCut = wFin + seamPx * 2; // lebar potongan termasuk kampuh
  const unit = p.spacing * scale; // satu lipit di kain datar
  const visPx = p.visible * scale; // bagian yang terlihat di pinggang
  const bandW = p.bandLength * scale;
  const bandH = p.bandHeight * scale;
  const pieceH = (p.length + p.hem) * scale;
  const blockH = 64 + pieceH + 58; // ruang garis ukuran + potongan + keterangan
  const yBand = blockH * 2 + 24; // bagian bawah (ikat pinggang dst.) mulai setelah dua blok potongan
  const yOne = yBand + bandH + 72;
  const pocketSides = pocketSide === "both" ? ["left", "right"] : pocketSide === "none" ? [] : [pocketSide];
  const hasPocket = pocketSides.length > 0;
  const pocketDepth = pocketDepthFor(p.length);
  const yPocket = yOne + 72;
  const svgH = yOne + 44 + (hasPocket ? 40 + pocketBlockHeight(POCKET_INSET, pocketDepth, scale) : 0);
  const arrows = { markerStart: "url(#dim-arrow)", markerEnd: "url(#dim-arrow)" };
  const dim = { stroke: "currentColor", strokeOpacity: 0.7, strokeWidth: 1 };
  const ext = { stroke: "currentColor", strokeOpacity: 0.35, strokeWidth: 1 };
  /* ukuran ubin motif (px layar), sama dengan cara SkirtFinalPreview */
  const motifW = motif ? motif.size * scale : 0;
  const motifH = motif ? motifW * motif.ratio : 0;

  function renderPiece(name, y0) {
    const top = y0 + 64;
    const hipY = top + p.hipDepth * scale; // lipit dijahit sampai sini
    const hemY = top + p.length * scale; // garis hem (panjang jadi)
    const cutY = hemY + p.hem * scale; // tepi bawah potongan (termasuk kelim)
    const X0 = LEFT + seamPx; // garis jahit samping kiri
    const X1 = X0 + wFin; // garis jahit samping kanan
    const folds = Array.from({ length: p.perPiece - 1 }, (_, i) => X0 + (i + 1) * unit);

    return (
      <g key={name}>
         {/* Latar belakang warna kain untuk potongan utama */}
        <rect x={LEFT} y={top} width={wCut} height={cutY - top} fill={fabricColor || "currentColor"} fillOpacity={fabricColor ? "0.3" : "0.05"} />

        {/* Motif kain: ubin dimulai dari tepi atas ikat pinggang, seperti pada rok jadi */}
        {motif && (
          <>
            <defs>
              <pattern
                id={`${uid}-motif-${name}`} patternUnits="userSpaceOnUse"
                x={LEFT + wCut / 2 - motifW / 2} y={top - BAND_HEIGHT * scale}
                width={motifW} height={motifH}
              >
                <image href={motif.src} width={motifW} height={motifH} preserveAspectRatio="none" />
              </pattern>
            </defs>
            <rect
              x={LEFT} y={top} width={wCut} height={cutY - top}
              fill={`url(#${uid}-motif-${name})`} fillOpacity="0.3"
            />
          </>
        )}

        {/* Lipit, kampuh, dan kelim */}
        <rect x={X0} y={top} width={unit} height={hemY - top} fill="currentColor" fillOpacity="0.07" />
        <rect x={LEFT} y={top} width={seamPx} height={cutY - top} fill="currentColor" fillOpacity="0.14" />
        <rect x={X1} y={top} width={seamPx} height={cutY - top} fill="currentColor" fillOpacity="0.14" />
        <rect x={LEFT} y={hemY} width={wCut} height={cutY - hemY} fill="currentColor" fillOpacity="0.14" />
        <rect x={LEFT} y={top} width={wCut} height={cutY - top} fill="none" stroke="currentColor" strokeWidth="1.5" />

        {/* garis jahit samping */}
        <line x1={X0} x2={X0} y1={top} y2={cutY} stroke="currentColor" strokeOpacity="0.6" strokeDasharray="1 3" />
        <line x1={X1} x2={X1} y1={top} y2={cutY} stroke="currentColor" strokeOpacity="0.6" strokeDasharray="1 3" />

        {/* garis hem dan garis pinggul */}
        <line x1={LEFT} x2={LEFT + wCut} y1={hemY} y2={hemY} stroke="currentColor" strokeOpacity="0.7" strokeDasharray="2 3" />
        <line x1={LEFT} x2={LEFT + wCut} y1={hipY} y2={hipY} stroke="currentColor" strokeOpacity="0.4" strokeDasharray="4 3" />

        {/* garis lipatan: tegas = dijahit, putus-putus = disetrika */}
        {folds.map((x) => (
          <g key={x}>
            <line x1={x} x2={x} y1={top} y2={hipY} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
            <line x1={x} x2={x} y1={hipY} y2={cutY} stroke="currentColor" strokeOpacity="0.6" strokeDasharray="6 3" />
          </g>
        ))}

        {/* bukaan kantong pada potongan depan (perkiraan pada kain datar, di dekat kampuh samping) */}
        {name === "Depan" &&
          pocketSides.map((sd) => {
            const sg = sd === "left" ? 1 : -1; // arah masuk dari kampuh samping
            const edge = sd === "left" ? X0 : X1;
            const ins = POCKET_INSET * scale;
            const dep = pocketDepth * scale;
            const sx = edge + sg * ins;
            const anchor = sg === 1 ? "start" : "end";
            return (
              <g key={sd}>
                <path
                  d={`M ${sx} ${top} Q ${sx} ${top + dep * 0.62} ${edge} ${top + dep}`}
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3"
                />
                <circle cx={sx} cy={top} r="2" fill="currentColor" />
                <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1">
                  <line x1={edge} x2={sx} y1={top + 9} y2={top + 9} {...arrows} />
                  <line x1={edge + sg * 8} x2={edge + sg * 8} y1={top} y2={top + dep} {...arrows} />
                </g>
                <g fill="currentColor" fontSize="9">
                  <text x={(edge + sx) / 2} y={top + 21} textAnchor="middle">{fmt(POCKET_INSET)} cm</text>
                  <text x={edge + sg * 13} y={top + dep + 12} textAnchor={anchor}>
                    {fmt(Math.round(pocketDepth * 10) / 10)} cm
                  </text>
                  <text textAnchor={anchor}>
                    <tspan x={sx + 0.5625 * (edge - sx) + sg * 8} y={top + dep * 0.795 - 2}>bukaan</tspan>
                    <tspan x={sx + 0.5625 * (edge - sx) + sg * 8} y={top + dep * 0.795 + 8}>kantong</tspan>
                  </text>
                </g>
              </g>
            );
          })}

        {/* hiasan tambahan (perkiraan posisi pada kain datar) */}
        {extras
          .filter((e) => appliesTo(e, name === "Depan" ? "front" : "back"))
          .map((e) => {
            const rel1 = Math.max(0, e.top - BAND_HEIGHT);
            const rel2 = Math.min(p.length, e.bottom - BAND_HEIGHT);
            if (rel2 <= rel1) return null;
            const fullW = (p.hip + EASE) / 2;
            const f1 = e.full ? 0 : Math.min(1, Math.max(0, (e.x1 + fullW / 2) / fullW));
            const f2 = e.full ? 1 : Math.min(1, Math.max(0, (e.x2 + fullW / 2) / fullW));
            if (f2 <= f1) return null;
            const ex = X0 + f1 * wFin;
            const ew = (f2 - f1) * wFin;
            const ey = top + rel1 * scale;
            const eh = (rel2 - rel1) * scale;
            return (
              <g key={e.id}>
                <rect x={ex} y={ey} width={ew} height={eh} fill={e.color} fillOpacity="0.5" />
                <rect
                  x={ex} y={ey} width={ew} height={eh} fill="currentColor" fillOpacity="0.08"
                  stroke="currentColor" strokeOpacity="0.7" strokeDasharray="3 2"
                />
                <text x={ex + 3} y={ey + 10} fontSize="9" fill="currentColor">{e.label}</text>
              </g>
            );
          })}

        {/* garis bantu dan garis ukuran */}
        <g {...ext}>
          <line x1={X0} x2={X0} y1={top} y2={top - 44} />
          <line x1={X1} x2={X1} y1={top} y2={top - 44} />
          <line x1={X0 + unit} x2={X0 + unit} y1={top} y2={top - 16} />
        </g>
        <g {...dim}>
          <line x1={X0} x2={X1} y1={top - 40} y2={top - 40} {...arrows} />
          <line x1={X0} x2={X0 + unit} y1={top - 12} y2={top - 12} {...arrows} />
          <line x1={LEFT - 14} x2={LEFT - 14} y1={top} y2={hemY} {...arrows} />
        </g>

        <g fill="currentColor" fontSize="11">
          <text x={(X0 + X1) / 2} y={top - 46} textAnchor="middle">
            Lebar potongan {name.toLowerCase()} {fmt(p.pieceWidth)} cm
          </text>
          <text x={X0} y={top - 18} fontSize="10">jarak antar lipatan {fmt(p.spacing)} cm</text>
          <text x={LEFT - 22} y={(top + hemY) / 2 + 4} textAnchor="end">{fmt(p.length)} cm</text>
          <g fontSize="10" fillOpacity="0.8">
            <text x={LEFT + wCut + 6} y={hipY + 4}>pinggul</text>
            <text x={LEFT + wCut + 6} y={hemY + 4}>hem</text>
          </g>
          <g fontSize="10" textAnchor="middle">
            <text x={LEFT + wCut / 2} y={cutY + 14}>
              kelim {fmt(p.hem)} cm di bawah garis hem
            </text>
            <text x={LEFT + wCut / 2} y={cutY + 27}>
              kampuh samping {fmt(p.seam)} cm di kiri dan kanan
            </text>
          </g>
          <text x={LEFT} y={cutY + 46} fontSize="12" fontWeight="600">
            Potongan {name.toLowerCase()}, {p.perPiece} lipit (potong 1 kali)
          </text>
        </g>
      </g>
    );
  }

  return (
    <div className="pattern-preview">
      <p>
        Pola plisket dibuka datar dalam dua potongan berdampingan, depan di kiri
        dan belakang di kanan, skala layar {fmt(scale)} unit per cm. Garis
        lipatan yang tegas dijahit dari pinggang sampai garis pinggul, lalu di
        bawahnya putus-putus karena lipit hanya disetrika. Area abu-abu di sisi
        kiri dan kanan adalah kampuh samping, dan di bawah garis hem adalah
        kelim. Belum untuk dicetak sebagai pola ukuran sebenarnya.
      </p>

      {/* potongan depan (kiri) dan belakang (kanan) berdampingan */}
      <div style={sidesStyle}>
        {[["Depan", 0], ["Belakang", blockH]].map(([name, y0]) => (
          <svg
            key={name}
            viewBox={`0 ${y0} ${VIEW_W} ${blockH}`}
            role="img"
            aria-label={`Visualisasi pola plisket potongan ${name.toLowerCase()}`}
            style={svgStyle}
          >
            <ArrowMarker />
            {renderPiece(name, y0)}
          </svg>
        ))}
      </div>

      {/* ikat pinggang, satu lipit, dan pola kantong di bawahnya */}
      <svg
        viewBox={`0 ${blockH * 2} ${VIEW_W} ${svgH - blockH * 2}`}
        role="img"
        aria-label="Visualisasi ikat pinggang, satu lipit, dan pola kantong"
        style={wideSvgStyle}
      >
        <ArrowMarker />

        {/* ikat pinggang */}
        <g {...ext}>
          <line x1={LEFT} x2={LEFT} y1={yBand + bandH} y2={yBand + bandH + 18} />
          <line x1={LEFT + bandW} x2={LEFT + bandW} y1={yBand + bandH} y2={yBand + bandH + 18} />
        </g>
        <g {...dim}>
          <line x1={LEFT} x2={LEFT + bandW} y1={yBand + bandH + 14} y2={yBand + bandH + 14} {...arrows} />
          <line x1={LEFT - 14} x2={LEFT - 14} y1={yBand} y2={yBand + bandH} {...arrows} />
        </g>
        <rect x={LEFT} y={yBand} width={bandW} height={bandH} fill={fabricColor || "none"} fillOpacity={fabricColor ? "0.3" : "1"} stroke="currentColor" strokeWidth="1.5" />
        {/* motif kain pada ikat pinggang */}
        {motif && (
          <>
            <defs>
              <pattern
                id={`${uid}-motif-band`} patternUnits="userSpaceOnUse"
                x={LEFT + bandW / 2 - motifW / 2} y={yBand} width={motifW} height={motifH}
              >
                <image href={motif.src} width={motifW} height={motifH} preserveAspectRatio="none" />
              </pattern>
            </defs>
            <rect
              x={LEFT} y={yBand} width={bandW} height={bandH}
              fill={`url(#${uid}-motif-band)`} fillOpacity="0.3"
            />
          </>
        )}
        <line
          x1={LEFT} x2={LEFT + bandW} y1={yBand + bandH / 2} y2={yBand + bandH / 2}
          stroke="currentColor" strokeOpacity="0.6" strokeDasharray="6 3"
        />

        {/* satu lipit: bagian terlihat dan bagian terlipat */}
        <rect x={LEFT} y={yOne} width={visPx} height="24" fill={fabricColor || "currentColor"} fillOpacity={fabricColor ? "0.5" : "0.3"} stroke="currentColor" />
        <rect
          x={LEFT + visPx} y={yOne} width={unit - visPx} height="24"
          fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeDasharray="4 3"
        />

        <g fill="currentColor" fontSize="11">
          <text x={LEFT} y={yBand - 8} fontSize="12" fontWeight="600">
            Ikat pinggang (dilipat dua di garis putus-putus, potong 1 kali)
          </text>
          <text x={LEFT + bandW / 2} y={yBand + bandH + 30} textAnchor="middle">
            Panjang {fmt(p.bandLength)} cm
          </text>
          <text x={LEFT - 22} y={yBand + bandH / 2 + 4} textAnchor="end">{fmt(p.bandHeight)} cm</text>
          <text x={LEFT} y={yOne - 12} fontSize="12" fontWeight="600">Satu lipit</text>
          <text x={LEFT + unit + 12} y={yOne + 10}>
            Bagian tegas: terlihat di pinggang {fmt(p.visible)} cm
          </text>
          <text x={LEFT + unit + 12} y={yOne + 22}>
            Bagian pudar: terlipat ke dalam {fmt(p.hidden)} cm (total {fmt(p.spacing)} cm)
          </text>
        </g>
        {hasPocket && (
          <PocketBlock
            y0={yPocket} x0={LEFT} dx={POCKET_INSET} depth={pocketDepth}
            count={pocketSides.length * 2} sides={pocketSides} scale={scale}
            fabricColor={fabricColor} motif={motif} uid={uid}
          />
        )}
      </svg>

      <p>
        Plisket tidak memakai kupnat. Selisih lingkar pinggang dan pinggul
        diserap oleh lipit yang dijahit sampai garis pinggul ({fmt(p.hipDepth)} cm
        dari pinggang), lalu dilepas di bawahnya.
      </p>
      <p>Jumlah lipit: {p.count} ({p.perPiece} di depan dan {p.perPiece} di belakang)</p>
      <p>Lebar tiap lipit yang terlihat di pinggang: {fmt(p.visible)} cm</p>
      <p>
        Kain yang terlipat ke dalam per lipit: {fmt(p.hidden)} cm (kedalaman
        lipit sekitar {fmt(p.depth)} cm)
      </p>
      <p>
        Lebar tiap potongan: {fmt(p.pieceWidth)} cm jadi, {fmt(p.pieceCut)} cm
        dengan kampuh. Lebar kain minimal {fmt(p.pieceCut)} cm
        {p.pieceCut > 150 ? "; melebihi kain 150 cm, bagi menjadi 4 potongan" : p.pieceCut > 110 ? "; gunakan kain selebar 150 cm" : ""}
      </p>
      <p>Perkiraan panjang kain: {fmt(p.fabricLength)} cm (2 potongan disusun memanjang dan ikat pinggang, belum termasuk cadangan)</p>
      <p>Kelim: {fmt(p.hem)} cm di bawah garis hem</p>
      {pocketSides.map((sd) => (
        <p key={sd}>
          Kantong {sd === "left" ? "kiri" : "kanan"}: bukaan dimulai {fmt(POCKET_INSET)} cm dari kampuh
          samping di tepi atas dan berakhir {fmt(Math.round(pocketDepth * 10) / 10)} cm di bawah pinggang
          pada kampuh samping (posisi pada kain datar hanya perkiraan; pastikan lagi setelah lipit disetrika)
        </p>
      ))}
      {extras.map((e) => (
        <p key={e.id}>Tambahan, {describeExtra(e)}</p>
      ))}
      {extras.some((e) => e.top < BAND_HEIGHT) && (
        <p>Hiasan yang mengenai ikat pinggang tidak digambar pada potongan di atas.</p>
      )}
      <p>Lingkar pinggang: {fmt(p.waist)} cm</p>
      <p>Lingkar pinggul: {fmt(p.hip)} cm</p>
      <p>Panjang rok: {fmt(p.length)} cm</p>
    </div>
  );
}

function QuarterView({ pattern, extras, uid, pocketSide, fabricColor, motif }) {
  const panelWidth =
    Math.max(pattern.topWidth, pattern.hipWidth, pattern.hemWidth, pattern.hemCutWidth) * SCALE;
  const PAIR_GAP = 120; // ruang antara potongan kiri dan kanan untuk garis ukuran tegak
  const rowH = MARGIN + pattern.cutLength * SCALE + 74;

  const pocketSides = pocketSide === "both" ? ["left", "right"] : pocketSide === "none" ? [] : [pocketSide];
  const hasPocket = pocketSides.length > 0;
  const depth = pocketDepthFor(pattern.length);
  const insetCm = Math.min(POCKET_INSET, pattern.topWidth * 0.6);
  const openDx = sideWidthAt(pattern, depth) - (pattern.topWidth - insetCm);
  const pocketH = hasPocket ? pocketBlockHeight(openDx, depth, SCALE) + 30 : 0;

  const svgWidth = SIDE * 2 + panelWidth * 2 + PAIR_GAP;
  const rightOx = SIDE + panelWidth + PAIR_GAP;

  /* ukuran ubin motif (px layar), sama dengan cara SkirtFinalPreview */
  const motifW = motif ? motif.size * SCALE : 0;
  const motifH = motif ? motifW * motif.ratio : 0;

  const pieces = [
    { part: "front", side: "left", label: "Depan kiri (¼)", ox: SIDE, oy: 0 },
    { part: "front", side: "right", label: "Depan kanan (¼)", ox: rightOx, oy: 0 },
    { part: "back", side: "left", label: "Belakang kiri (¼)", ox: SIDE, oy: rowH },
    { part: "back", side: "right", label: "Belakang kanan (¼)", ox: rightOx, oy: rowH },
  ].map((s) => ({ ...s, ...buildPiece(pattern, s.part, s.side, s.ox, s.oy, panelWidth) }));

  const hasDart = pattern.dartTotal > 0.05;
  const arrows = { markerStart: "url(#dim-arrow)", markerEnd: "url(#dim-arrow)" };

  return (
    <section className="panel section-panel">
      <h2>4. Pola Potong</h2>
        <p className="muted">
          Pola potong dibuat otomatis dari ukuran pelanggan dan model rok yang dipilih,
          dalam potongan depan dan belakang lengkap.
        </p>
      <div className="pattern-preview">
        {/* <p>
          Pola dibagi menjadi 4 potongan seperempat badan: depan kiri, depan kanan,
          belakang kiri, dan belakang kanan (kiri dan kanan seperti pada gambar tampak
          depan), skala layar {SCALE} unit per cm. Garis putus-putus panjang di tepi
          yang saling berhadapan adalah garis tengah, dan tepi lainnya adalah kampuh
          samping. Angka pada garis mendatar adalah lebar pola dari garis tengah sampai
          kampuh samping, bukan jarak ke ujung kain. Angka pada garis tegak adalah
          tinggi dari pinggang ke bawah. Angka di bawah panah tepi atas adalah lebar
          kupnat, dan angka di samping kupnat adalah panjang kupnat. Area abu-abu di
          bawah garis hem adalah kain untuk kelim ({fmt(pattern.hem)} cm), yang dilipat
          ke dalam.
          {hasPocket && " Garis putus-putus pendek yang melengkung di potongan depan adalah bukaan kantong; polanya ada di bagian terpisah di bawah."}
          {" "}Belum untuk dicetak sebagai pola ukuran sebenarnya.
        </p> */}

        {/* potongan depan (kiri) dan belakang (kanan) berdampingan */}
        <div style={sidesStyle}>
          {["front", "back"].map((part) => (
            <svg
              key={part}
              viewBox={`0 ${part === "front" ? 0 : rowH} ${svgWidth} ${rowH}`}
              role="img"
              aria-label={`Visualisasi pola rok potongan ${part === "front" ? "depan" : "belakang"}`}
              style={svgStyle}
            >
              <ArrowMarker />

              {pieces.filter((s) => s.part === part).map((s) => {
                const sg = s.side === "right" ? 1 : -1;
                const { x, y } = s;
                const yTop = y(0) - 30; // garis ukuran tepi atas
                const yHemDim = y(pattern.cutLength) + 14; // garis ukuran bawah (di bawah tepi potong)
                const outAnchor = sg === 1 ? "start" : "end"; // teks ke arah luar (kampuh samping)
                const inAnchor = sg === 1 ? "end" : "start"; // teks ke arah garis tengah
                const txX = x(0) - sg * 22;
                const clipId = `${uid}-${s.part}-${s.side}`;
                const pocketHere = s.part === "front" && pocketSides.includes(s.side);

                return (
                  <g key={`${s.part}-${s.side}`}>
                    <defs>
                      <clipPath id={clipId}>
                        <path d={s.outline} />
                      </clipPath>
                      {/* ubin motif berpusat di garis tengah, seperti pada rok jadi */}
                      {motif && (
                        <pattern
                          id={`${clipId}-motif`} patternUnits="userSpaceOnUse"
                          x={x(0) - motifW / 2} y={y(0)} width={motifW} height={motifH}
                        >
                          <image href={motif.src} width={motifW} height={motifH} preserveAspectRatio="none" />
                        </pattern>
                      )}
                    </defs>

                    {/* Latar warna kain pada potongan pola */}
                    <path
                      d={s.outline}
                      fill={fabricColor || "currentColor"}
                      fillOpacity={fabricColor ? "0.35" : "0.04"}
                    />

                    {/* Motif kain pada potongan pola */}
                    {motif && <path d={s.outline} fill={`url(#${clipId}-motif)`} fillOpacity="0.35" />}

                    {/* Area kelim */}
                    <path d={s.allowance} fill="currentColor" fillOpacity="0.14" />
                    <path d={s.outline} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    {/* garis hem (panjang jadi) */}
                    <line
                      x1={x(0)} x2={x(pattern.hemWidth)} y1={y(pattern.length)} y2={y(pattern.length)}
                      stroke="currentColor" strokeOpacity="0.7" strokeDasharray="2 3"
                    />
                    <text
                      x={x(pattern.hemCutWidth) + sg * 6} y={y(pattern.length) + 4}
                      fontSize="10" fill="currentColor" fillOpacity="0.8" textAnchor={outAnchor}
                    >
                      hem
                    </text>

                    {/* hiasan tambahan: area penempatan renda, layer, pita */}
                    {extras
                      .filter((e) => appliesTo(e, s.part))
                      .map((e) => {
                        const span = sideSpan(e, s.side, panelWidth / SCALE);
                        if (!span) return null;
                        const a = x(span[0]);
                        const b = x(span[1]);
                        const ex = Math.min(a, b);
                        const ew = Math.abs(b - a);
                        const ey = y(e.top);
                        const eh = e.height * SCALE;
                        return (
                          <g key={e.id}>
                            <g clipPath={`url(#${clipId})`}>
                              <rect x={ex} y={ey} width={ew} height={eh} fill={e.color} fillOpacity="0.5" />
                              <rect
                                x={ex} y={ey} width={ew} height={eh} fill="currentColor" fillOpacity="0.08"
                                stroke="currentColor" strokeOpacity="0.7" strokeDasharray="3 2"
                              />
                            </g>
                            <text x={ex + 3} y={ey + 10} fontSize="9" fill="currentColor">{e.label}</text>
                          </g>
                        );
                      })}

                    {/* bukaan kantong (hanya potongan depan di sisi yang dipilih) */}
                    {pocketHere &&
                      (() => {
                        const u0 = pattern.topWidth - insetCm;
                        const u1 = sideWidthAt(pattern, depth);
                        const c = depth * 0.62;
                        const d = `M ${x(u0)} ${y(0)} Q ${x(u0)} ${y(c)} ${x(u1)} ${y(depth)}`;
                        const dimXo = x(u1) + sg * 14; // garis ukuran tegak di luar kampuh samping
                        return (
                          <g>
                            <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3" />
                            <circle cx={x(u0)} cy={y(0)} r="2" fill="currentColor" />
                            <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1">
                              <line x1={x(u0)} x2={x(pattern.topWidth)} y1={y(1.8)} y2={y(1.8)} {...arrows} />
                              <line x1={x(pattern.topWidth)} x2={dimXo} y1={y(0)} y2={y(0)} strokeOpacity="0.35" />
                              <line x1={x(u1)} x2={dimXo} y1={y(depth)} y2={y(depth)} strokeOpacity="0.35" />
                              <line x1={dimXo} x2={dimXo} y1={y(0)} y2={y(depth)} {...arrows} />
                            </g>
                            <g fill="currentColor" fontSize="9">
                              <text x={(x(u0) + x(pattern.topWidth)) / 2} y={y(1.8) + 11} textAnchor="middle">
                                {fmt(Math.round(insetCm * 10) / 10)} cm
                              </text>
                              <text x={dimXo + sg * 6} y={y(depth / 2) + 3} textAnchor={outAnchor}>
                                {fmt(Math.round(depth * 10) / 10)} cm
                              </text>
                              <text textAnchor={inAnchor}>
                                <tspan x={x(u0 + 0.5625 * (u1 - u0)) - sg * 8} y={y(depth * 0.795) - 2}>bukaan</tspan>
                                <tspan x={x(u0 + 0.5625 * (u1 - u0)) - sg * 8} y={y(depth * 0.795) + 8}>kantong</tspan>
                              </text>
                            </g>
                          </g>
                        );
                      })()}

                    {s.darts.map((d, i) => (
                      <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="1" />
                    ))}
                    {/* lebar kupnat: garis kecil + angka di bawah panah tepi atas */}
                    {s.dartMarks.map((m, i) => {
                      const half = s.dartWcm / 2;
                      return (
                        <g key={`w${i}`}>
                          <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1">
                            <line x1={x(m.u - half)} x2={x(m.u + half)} y1={y(0) - 8} y2={y(0) - 8} />
                            <line x1={x(m.u - half)} x2={x(m.u - half)} y1={y(0) - 12} y2={y(0) - 4} />
                            <line x1={x(m.u + half)} x2={x(m.u + half)} y1={y(0) - 12} y2={y(0) - 4} />
                          </g>
                          <text x={m.x} y={y(0) - 14} fontSize="9" textAnchor="middle" fill="currentColor">
                            {fmt(s.dartWcm)} cm
                          </text>
                        </g>
                      );
                    })}
                    {/* panjang kupnat: angka di samping kupnat (arah kampuh samping) */}
                    {s.dartMarks.map((m, i) => (
                      <text
                        key={`l${i}`}
                        x={m.x + (pocketHere ? -sg : sg) * (s.dartWcm * SCALE / 2 + 5)}
                        y={(y(0) + m.y) / 2 + 3}
                        fontSize="9" fill="currentColor" textAnchor={pocketHere ? inAnchor : outAnchor}
                      >
                        {fmt(s.dartLcm)} cm
                      </text>
                    ))}

                    {/* garis tengah */}
                    <line
                      x1={x(0)} x2={x(0)} y1={y(0)} y2={y(pattern.cutLength)}
                      stroke="currentColor" strokeOpacity="0.6" strokeDasharray="6 3" strokeWidth="1.5"
                    />

                    {/* garis bantu ke garis ukuran atas dan bawah */}
                    <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1">
                      <line x1={x(0)} x2={x(0)} y1={y(0)} y2={yTop - 4} />
                      <line x1={x(pattern.topWidth)} x2={x(pattern.topWidth)} y1={y(0)} y2={yTop - 4} />
                      <line x1={x(0)} x2={x(0)} y1={y(pattern.cutLength)} y2={yHemDim + 4} />
                      <line x1={x(pattern.hemWidth)} x2={x(pattern.hemWidth)} y1={y(pattern.length)} y2={yHemDim + 4} />
                    </g>

                    {/* garis ukuran mendatar: atas, pinggul, hem */}
                    <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1">
                      <line x1={x(0)} x2={x(pattern.topWidth)} y1={yTop} y2={yTop} {...arrows} />
                      <line x1={x(0)} x2={x(pattern.hipWidth)} y1={y(pattern.hipDepth)} y2={y(pattern.hipDepth)} {...arrows} />
                      <line x1={x(0)} x2={x(pattern.hemWidth)} y1={yHemDim} y2={yHemDim} {...arrows} />
                    </g>

                    {/* garis ukuran tegak di sisi garis tengah:
                        pinggang ke hem, lalu hem ke tepi potong (kelim) */}
                    <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1">
                      <line x1={x(0) - sg * 14} x2={x(0) - sg * 14} y1={y(0)} y2={y(pattern.length)} {...arrows} />
                      <line x1={x(0) - sg * 14} x2={x(0) - sg * 14} y1={y(pattern.length)} y2={y(pattern.cutLength)} {...arrows} />
                      <line x1={x(0) - sg * 19} x2={x(0) - sg * 9} y1={y(pattern.hipDepth)} y2={y(pattern.hipDepth)} />
                    </g>

                    <g fill="currentColor" fontSize="11" textAnchor="middle">
                      <text x={x(pattern.topWidth / 2)} y={yTop - (hasDart ? 18 : 6)}>
                        {hasDart ? "Tepi atas " : "Lebar pinggang "}{fmt(pattern.topWidth)} cm
                      </text>
                      {hasDart && (
                        <text x={x(pattern.topWidth / 2)} y={yTop - 6} fontSize="10" fillOpacity="0.75">
                          jadi {fmt(pattern.waistWidth)} cm setelah kupnat
                        </text>
                      )}
                      <text x={x(pattern.hipWidth / 2)} y={y(pattern.hipDepth) + 14}>
                        Lebar pinggul {fmt(pattern.hipWidth)} cm
                      </text>
                      <text x={x(pattern.hemWidth / 2)} y={yHemDim + 16}>
                        Lebar hem {fmt(pattern.hemWidth)} cm
                      </text>
                      <text x={x(pattern.hemWidth / 2)} y={yHemDim + 29} fontSize="10" fillOpacity="0.8">
                        kelim {fmt(pattern.hem)} cm
                      </text>
                      <text x={s.ox + panelWidth / 2} y={s.oy + rowH - 6} fontSize="12" fontWeight="600">{s.label}</text>
                    </g>

                    <g fill="currentColor" fontSize="11" textAnchor={inAnchor === "end" ? "end" : "start"}>
                      <text x={txX} y={(y(0) + y(pattern.hipDepth)) / 2 + 4}>
                        {fmt(pattern.hipDepth)} cm
                      </text>
                      <text x={txX} y={(y(pattern.hipDepth) + y(pattern.length)) / 2 + 4}>
                        {fmt(pattern.length - pattern.hipDepth)} cm
                      </text>
                      <text x={txX} y={(y(pattern.length) + y(pattern.cutLength)) / 2 + 4} fontSize="10">
                        {fmt(pattern.hem)} cm
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          ))}
        </div>

        {/* pola kantong di bawah potongan depan dan belakang */}
        {hasPocket && (
          <svg
            viewBox={`0 ${rowH * 2} ${svgWidth} ${pocketH}`}
            role="img"
            aria-label="Pola kantong"
            style={wideSvgStyle}
          >
            <ArrowMarker />
            <PocketBlock
              y0={rowH * 2 + 8} x0={SIDE + 20} dx={openDx} depth={depth}
              count={pocketSides.length * 2} sides={pocketSides} scale={SCALE}
              fabricColor={fabricColor} motif={motif} uid={uid}
            />
          </svg>
        )}

        {pattern.dartTotal > 0.05 &&
          ["front", "back"].map((k) => {
            const s = pieces.find((q) => q.part === k);
            return (
              <p key={k}>
                Kupnat {k === "front" ? "depan" : "belakang"}: {s.n} per potongan,
                lebar {fmt(s.dartWcm)} cm, panjang {fmt(s.dartLcm)} cm
              </p>
            );
          })}
        {pocketSides.map((sd) => (
          <p key={sd}>
            Kantong {sd === "left" ? "kiri" : "kanan"} (potongan depan {sd === "left" ? "kiri" : "kanan"}):
            bukaan dimulai {fmt(Math.round(insetCm * 10) / 10)} cm dari kampuh samping di tepi atas
            dan berakhir {fmt(Math.round(depth * 10) / 10)} cm di bawah pinggang pada kampuh samping,
            panjang bukaan ± {fmt(Math.round(curveLen(openDx, depth) * 10) / 10)} cm
          </p>
        ))}
        <p>Kelim: {fmt(pattern.hem)} cm di bawah garis hem</p>
        {extras.map((e) => (
          <p key={e.id}>Tambahan, {describeExtra(e)}</p>
        ))}
        <p>Panjang potong: {fmt(pattern.cutLength)} cm (panjang rok {fmt(pattern.length)} cm + kelim {fmt(pattern.hem)} cm)</p>
        <p>Lingkar pinggang: {fmt(pattern.waist)} cm</p>
        <p>Lingkar pinggul: {fmt(pattern.hip)} cm</p>
        <p>Panjang rok: {fmt(pattern.length)} cm</p>
      </div>
    </section>
  );
}

export default function SkirtPatternPreview({ design, measurements }) {
  const rawId = useId();
  const uid = `pp${String(rawId).replace(/[^a-zA-Z0-9]/g, "")}`;
  const config = resolveModel(design?.model);
  const pleatCount = Number(design?.pleatCount) || PLEAT_COUNT;
  const pattern = useMemo(
    () =>
      config.type === "pleated"
        ? computePleated(measurements, pleatCount)
        : computePattern(measurements, config.flare),
    [config, pleatCount, measurements?.waist, measurements?.hip, measurements?.skirtLength]
  );

  /* gambar motif hanya dipakai bila jenis motif bukan "warna" */
  const motifSrc = design?.motifType === "color" ? null : design?.motifImage || null;
  const motifRatio = useImageRatio(motifSrc);
  const motif = motifSrc
    ? { src: motifSrc, ratio: motifRatio, size: Number(design?.motifSize) || MOTIF_SIZE_CM }
    : null;
  /* motif menggantikan warna kain: warna lama (design.color) tidak ikut digambar */
  const fabricColor = motif ? undefined : design?.color;

  if (pattern.status === "empty") {
    return (
      <p>
        {/* Lengkapi lingkar pinggang, lingkar pinggul, dan panjang rok untuk
        menampilkan pola. */}
      </p>
    );
  }
  if (pattern.status === "error") {
    return null;
  }
  const extras = normalizeExtras(design, pattern.length);
  if (pattern.type === "pleated") {
    return (
      <PleatedView
        p={pattern} extras={extras} pocketSide={pocketSideOf(design)}
        fabricColor={fabricColor} uid={uid} motif={motif}
      />
    );
  }

  return (
    <QuarterView
      pattern={pattern} extras={extras} uid={uid} pocketSide={pocketSideOf(design)}
      fabricColor={fabricColor} motif={motif}
    />
  );
}