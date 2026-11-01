import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  resolveModel,
  computePattern,
  computePleated,
  PLEAT_COUNT,
  EASE,
  BAND_HEIGHT,
  DART_LENGTH,
  DARTS_PER_QUARTER,
  POCKET_INSET,
  pocketDepthFor,
  pocketSideOf,
} from "./PatternPreview";
import {
  appliesTo,
  dragPatch,
  duplicateExtra,
  extraBox,
  extrasOverhang,
  laceDepth,
  layerInfo,
  normalizeExtras,
  removeExtraAt,
  resizePatch,
  shiftLayer,
  withIds,
} from "./ornaments";

/* Visualisasi akhir rok (tampak depan dan belakang) setelah semua pola
   dijahit dan disatukan: satu siluet utuh, bayangan lipatan kain, kupnat
   yang sudah terjahit, kelim dengan jahitan tindas, ritsleting/kancing,
   kantong, overlay brokat, motif, dan renda kelim. */

const PLEATED_HEM_FLARE = 4; // tambahan lebar hem tampak depan pada plisket (cm)
const DEFAULT_FABRIC = "#9fb8e8";

const MOTIF_SIZE_CM = 20; // lebar satu pengulangan motif di kain (cm)
const BROKAT_SIZE_CM = 15; // lebar satu pengulangan brokat di kain (cm)

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* Rasio tinggi/lebar asli gambar, supaya ubin motif tidak terpotong
   maupun melar (semua rasio gambar didukung). */
/* Analisis gambar sekali per file: rasio, ada transparansi atau tidak, dan
   cara menyatukannya dengan kain. Gambar PNG transparan dipakai apa adanya;
   gambar berlatar putih memakai "multiply", berlatar hitam memakai "screen". */
const imageInfoCache = new Map();

function analyzeImage(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const info = { ratio: img.naturalHeight / img.naturalWidth || 1, blend: "normal", hasAlpha: false };
      try {
        const N = 48;
        const canvas = document.createElement("canvas");
        canvas.width = N;
        canvas.height = N;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);
        let clear = 0;
        let ring = 0;
        let ringLum = 0;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const i = (y * N + x) * 4;
            if (data[i + 3] < 250) clear++;
            if (x < 3 || y < 3 || x >= N - 3 || y >= N - 3) {
              ring++;
              ringLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
          }
        }
        // Jika ada pixel transparan (PNG transparan), gunakan mode NORMAL agar brokat menyatu alami
        if (clear / (N * N) > 0.01) {
          info.hasAlpha = true;
          info.blend = "normal";
        } else {
          info.blend = ringLum / ring >= 128 ? "multiply" : "screen";
        }
      } catch {
        info.blend = "normal";
      }
      resolve(info);
    };
    img.onerror = () => resolve({ ratio: 1, blend: "normal", hasAlpha: false });
    img.src = src;
  });
}

function useImageInfo(src) {
  const [info, setInfo] = useState(() => (src && imageInfoCache.get(src)) || { ratio: 1, blend: "normal", hasAlpha: false });
  useEffect(() => {
    if (!src) return undefined;
    const cached = imageInfoCache.get(src);
    if (cached) {
      setInfo(cached);
      return undefined;
    }
    let alive = true;
    analyzeImage(src).then((r) => {
      imageInfoCache.set(src, r);
      if (alive) setInfo(r);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return info;
}

/* Rasio tinggi/lebar asli gambar, supaya ubin tidak terpotong maupun melar */
function useImageRatio(src) {
  return useImageInfo(src).ratio;
}

/* Ukuran tampak depan/belakang (lebar penuh satu sisi = setengah keliling) */
function buildGeometry(p) {
  if (p.type === "pleated") {
    const hipW = (p.hip + EASE) / 2;
    return {
      kind: "pleated",
      waistW: (p.waist + EASE) / 2,
      hipW,
      hemW: hipW + PLEATED_HEM_FLARE,
      hipDepth: p.hipDepth,
      length: p.length,
      bandH: BAND_HEIGHT,
      pleats: p.perPiece,
    };
  }
  return {
    kind: "quarter",
    waistW: p.waistWidth * 2,
    hipW: p.hipWidth * 2,
    hemW: p.hemWidth * 2,
    hipDepth: p.hipDepth,
    length: p.length,
    bandH: 0,
    quarterWaist: p.waistWidth,
  };
}

/* Posisi kupnat (cm dari tengah) untuk model seperempat */
function dartsFor(geo, hipDepth, part) {
  const n = DARTS_PER_QUARTER[part];
  const len = Math.min(DART_LENGTH[part], hipDepth - 2);
  const out = [];
  [-1, 1].forEach((side) => {
    for (let i = 0; i < n; i++) {
      out.push({ x: side * geo.quarterWaist * ((i + 1) / (n + 1)), len });
    }
  });
  return out;
}

const laceSpec = (design) => ({
  on: !!design?.useLace,
  h: Number(design?.laceHeight) || 3.5, // tinggi skalop (cm)
  w: Number(design?.laceWidth) || 4, // lebar per skalop (cm)
  color: design?.laceColor || "#ffffff",
  rows: design?.laceDouble ? 2 : 1,
});

/* Satu baris renda: pita dasar + skalop + titik + kelopak kecil */
function LaceRow({ geo, spec, yBase, X, Y, scale }) {
  const { hipDepth, length } = geo;
  const hh = geo.hipW / 2;
  const hm = geo.hemW / 2;
  const halfAt = (y) => {
    const t = Math.min(1, Math.max(0, (y - hipDepth) / (length - hipDepth)));
    return hh + (hm - hh) * t;
  };

  const half = halfAt(yBase);
  const yTop = yBase - spec.h * 0.45;
  const halfTop = halfAt(yTop);
  const n = Math.max(4, Math.round((half * 2) / spec.w));
  const step = (half * 2) / n;
  const dotR = Math.max(1.2, 0.22 * scale);

  return (
    <g>
      <polygon
        points={`${X(-halfTop)},${Y(yTop)} ${X(halfTop)},${Y(yTop)} ${X(half)},${Y(yBase)} ${X(-half)},${Y(yBase)}`}
        fill={spec.color}
        fillOpacity="0.55"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="0.8"
      />
      {Array.from({ length: n }).map((_, i) => {
        const x0 = -half + i * step;
        const x1 = x0 + step;
        const xm = (x0 + x1) / 2;
        return (
          <g key={i}>
            <path
              d={`M ${X(x0)} ${Y(yBase)} Q ${X(xm)} ${Y(yBase + spec.h * 1.1)} ${X(x1)} ${Y(yBase)} Z`}
              fill={spec.color}
              fillOpacity="0.95"
              stroke="currentColor"
              strokeOpacity="0.6"
              strokeWidth="0.8"
            />
            <path
              d={`M ${X(xm)} ${Y(yBase + spec.h * 0.12)} Q ${X(xm - step * 0.22)} ${Y(yBase + spec.h * 0.4)} ${X(xm)} ${Y(yBase + spec.h * 0.68)} Q ${X(xm + step * 0.22)} ${Y(yBase + spec.h * 0.4)} ${X(xm)} ${Y(yBase + spec.h * 0.12)}`}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="0.8"
            />
            <circle cx={X(xm)} cy={Y(yBase - spec.h * 0.22)} r={dotR} fill="currentColor" fillOpacity="0.45" />
          </g>
        );
      })}
    </g>
  );
}

/* Ubin gambar untuk hiasan: ukuran nyata (cm), rasio asli gambar */
function ImagePattern({ id, src, sizeCm, scale, x, y }) {
  const ratio = useImageRatio(src);
  const w = sizeCm * scale;
  const h = w * ratio;
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
      <image href={src} width={w} height={h} preserveAspectRatio="none" />
    </pattern>
  );
}

/* Satu hiasan tambahan: renda skalop, layer (brokat/tulle), atau pita */
function ExtraShape({ e, patId, clipId, X, Y, scale, halfMax, halfAt }) {
  const info = useImageInfo(e.image);
  const x1 = e.full ? -halfMax : e.x1;
  const x2 = e.full ? halfMax : e.x2;
  const px = X(x1);
  const pw = (x2 - x1) * scale;
  const py = Y(e.top);
  const ph = (e.bottom - e.top) * scale;
  const fill = e.image ? `url(#${patId})` : e.color;
  const base = e.image ? e.color : null;
  /* "auto" mengikuti hasil analisis file; clip-path dipasang di elemen yang sama
     dengan mix-blend-mode agar tetap menyatu dengan kain di bawahnya */
  const mode = e.blend === "auto" ? info.blend : e.blend;
  const style = { mixBlendMode: mode };

  if (e.type === "ribbon") {
    return (
      <g opacity={e.opacity} clipPath={`url(#${clipId})`}>
        <rect x={px} y={py} width={pw} height={ph} fill={fill} />
        <rect x={px} y={py} width={pw} height={ph} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" />
      </g>
    );
  }

  if (e.type === "lace") {
    /* pita renda mengikuti sisi miring rok; skalop menjuntai di bawahnya
       dan boleh keluar dari siluet (di bawah hem) */
    const hTop = halfAt(e.top);
    const hBot = halfAt(e.bottom);
    const cl = (v, h) => Math.min(h, Math.max(-h, v));
    const a = e.full ? -hBot : cl(e.x1, hBot);
    const b = e.full ? hBot : cl(e.x2, hBot);
    const at = e.full ? -hTop : cl(e.x1, hTop);
    const bt = e.full ? hTop : cl(e.x2, hTop);
    if (b - a < 0.5) return null;
    const n = Math.max(2, Math.round((b - a) / e.scallop));
    const step = (X(b) - X(a)) / n;
    const depth = laceDepth(e) * scale;
    const yb = Y(e.bottom);
    let d = `M ${X(at)} ${py} L ${X(bt)} ${py} L ${X(b)} ${yb}`;
    for (let i = n - 1; i >= 0; i--) {
      const xa = X(a) + i * step;
      d += ` Q ${xa + step / 2} ${yb + depth * 2} ${xa} ${yb}`;
    }
    d += " Z";
    return (
      <g opacity={e.opacity} style={style}>
        {base && <path d={d} fill={base} />}
        <path d={d} fill={fill} fillOpacity={base ? 0.9 : 0.95} stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.8" />
        {Array.from({ length: n }).map((_, i) => (
          <circle
            key={i} cx={X(a) + i * step + step / 2} cy={py + (yb - py) * 0.5}
            r={Math.max(1, 0.2 * scale)} fill="currentColor" fillOpacity="0.4"
          />
        ))}
      </g>
    );
  }

  /* overlay */
  return (
    <g opacity={e.opacity} style={style} clipPath={`url(#${clipId})`}>
      <rect x={px} y={py} width={pw} height={ph} fill={fill} />
    </g>
  );
}

function Panel({ geo, part, label, ox, scale, top, fabric, design, uid, showDimensions, motifRatio, brokatRatio, extras, editable, selectedId, onExtraDown }) {
  const id = (s) => `${uid}-${part}-${s}`;
  const brokatInfo = useImageInfo(design?.brokatImage);
  const cx = ox + 60 + (geo.maxW * scale) / 2;
  const X = (cm) => cx + cm * scale;
  const Y = (cm) => top + cm * scale;

  const hw = geo.waistW / 2;
  const hh = geo.hipW / 2;
  const hm = geo.hemW / 2;
  const yS = geo.bandH; // awal badan rok
  const isPleated = geo.kind === "pleated";

  /* Siluet tunggal rok yang sudah disatukan */
  let outlinePath;
  if (isPleated) {
    outlinePath = `M ${X(-hw)} ${Y(yS)} L ${X(hw)} ${Y(yS)} L ${X(hh)} ${Y(geo.hipDepth)} L ${X(hm)} ${Y(geo.length)} L ${X(-hm)} ${Y(geo.length)} L ${X(-hh)} ${Y(geo.hipDepth)} Z`;
  } else {
    const cOut = hw + (hh - hw) * 0.85;
    const cy = Y(geo.hipDepth * 0.35);
    outlinePath = `M ${X(-hw)} ${Y(0)} L ${X(hw)} ${Y(0)} Q ${X(cOut)} ${cy} ${X(hh)} ${Y(geo.hipDepth)} L ${X(hm)} ${Y(geo.length)} L ${X(-hm)} ${Y(geo.length)} L ${X(-hh)} ${Y(geo.hipDepth)} Q ${X(-cOut)} ${cy} ${X(-hw)} ${Y(0)} Z`;
  }

  /* Garis lipit plisket (tiap lipatan jadi dua sisi: terang dan gelap) */
  const pleatX = (i, half) => -half + (i * 2 * half) / geo.pleats;
  const strips = isPleated
    ? Array.from({ length: geo.pleats }, (_, i) => {
        const pts = [
          [pleatX(i, hw), yS], [pleatX(i, hh), geo.hipDepth], [pleatX(i, hm), geo.length],
          [pleatX(i + 1, hm), geo.length], [pleatX(i + 1, hh), geo.hipDepth], [pleatX(i + 1, hw), yS],
        ];
        return pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
      })
    : [];

  /* Lipatan jatuh lembut pada rok model seperempat (A-line / lingkar) */
  const flared = !isPleated && hm > hh * 1.04;
  const folds = flared
    ? [-0.7, -0.35, 0, 0.35, 0.7].map((f) => {
        const w = 0.14;
        const pts = [
          [(f - w * 0.4) * hw, 0], [(f + w * 0.4) * hw, 0],
          [(f + w * 0.6) * hh, geo.hipDepth], [(f + w) * hm, geo.length],
          [(f - w) * hm, geo.length], [(f - w * 0.6) * hh, geo.hipDepth],
        ];
        return pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
      })
    : [];

  const darts = !isPleated ? dartsFor(geo, geo.hipDepth, part) : [];

  /* Kantong (hanya tampak depan) */
  const pocketSide = pocketSideOf(design);
  const hasLeftPocket = part === "front" && (pocketSide === "left" || pocketSide === "both");
  const hasRightPocket = part === "front" && (pocketSide === "right" || pocketSide === "both");
  /* Kantong serong: mulut dimulai di pinggang dekat tengah, lalu melengkung
     turun dan berakhir di kampuh samping. s = -1 sisi kiri, 1 sisi kanan. */
  const pocketDepth = pocketDepthFor(geo.length - yS); // sama dengan pola potong
  const pocketGeom = (s, off = 0) => {
    const yEnd = yS + pocketDepth;
    return {
      ax: X(s * (hw - POCKET_INSET - off)), ay: Y(yS + 0.4 + off),
      cx: X(s * (hw - POCKET_INSET - off)), cy: Y(yS + pocketDepth * 0.62 + off),
      bx: X(s * (halfAt(yEnd) - off)), by: Y(yEnd + off * 0.4),
    };
  };
  const pocketPath = (s, off = 0) => {
    const g = pocketGeom(s, off);
    return `M ${g.ax} ${g.ay} Q ${g.cx} ${g.cy} ${g.bx} ${g.by}`;
  };

  const lace = laceSpec(design);
  /* setengah lebar rok pada kedalaman y (cm dari pinggang), mengikuti sisi miring */
  const halfAt = (y) => {
    if (y <= yS) return hw;
    if (y <= geo.hipDepth) return hw + (hh - hw) * ((y - yS) / Math.max(0.1, geo.hipDepth - yS));
    return hh + (hm - hh) * ((y - geo.hipDepth) / Math.max(0.1, geo.length - geo.hipDepth));
  };
  const bodyW = geo.maxW * scale;
  const bodyX = cx - bodyW / 2;
  /* Ubin motif/brokat berukuran nyata (cm), dimulai dari tengah rok
     sehingga motif simetris dan tidak terpotong di tengah. */
  const motifW = (Number(design?.motifSize) || MOTIF_SIZE_CM) * scale;
  const motifH = motifW * motifRatio;
  const brokatW = (Number(design?.brokatSize) || BROKAT_SIZE_CM) * scale;
  const brokatH = brokatW * brokatRatio;
  /* gambar motif hanya dipakai bila jenis motif bukan "warna" */
  const motifSrc = design?.motifType === "color" ? null : design?.motifImage || null;
  const myExtras = (extras || []).filter((e) => appliesTo(e, part));
  const laceDrop = Math.max(
    lace.on ? lace.h * 1.1 * scale : 0,
    extrasOverhang(myExtras, geo.length) * scale
  );
  const baseY = Y(geo.length) + laceDrop;

  // Gunakan mode normal jika brokat PNG transparan
  const activeBrokatBlend = design?.brokatBlendMode || (brokatInfo.hasAlpha ? "normal" : brokatInfo.blend);

  return (
    <g>
      <defs>
        {/* siluet utuh, termasuk ikat pinggang agar motif dan hiasan ikut menutupinya */}
        <clipPath id={id("clip")}>
          <path d={outlinePath} />
          {geo.bandH > 0 && (
            <rect x={X(-hw)} y={Y(0)} width={geo.waistW * scale} height={geo.bandH * scale} />
          )}
        </clipPath>

        {myExtras.map((e) =>
          e.image ? (
            <ImagePattern
              key={e.id} id={id(`ex-${e.id}`)} src={e.image} sizeCm={e.tile} scale={scale}
              x={cx - (e.tile * scale) / 2} y={Y(0)}
            />
          ) : null
        )}

        {design?.useBrokat && design?.brokatImage && (
          <pattern
            id={id("brokat")} patternUnits="userSpaceOnUse"
            x={cx - brokatW / 2} y={Y(0)} width={brokatW} height={brokatH}
          >
            <image href={design.brokatImage} width={brokatW} height={brokatH} preserveAspectRatio="none" />
          </pattern>
        )}
        {motifSrc && (
          <pattern
            id={id("motif")} patternUnits="userSpaceOnUse"
            x={cx - motifW / 2} y={Y(0)} width={motifW} height={motifH}
          >
            <image href={motifSrc} width={motifW} height={motifH} preserveAspectRatio="none" />
          </pattern>
        )}

        {/* Bayangan bentuk badan: sisi samping gelap, tengah menonjol terang */}
        <linearGradient id={id("body")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.26" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0.06" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        {/* Kain makin gelap ke arah hem karena jatuh ke dalam */}
        <linearGradient id={id("drop")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.1" />
          <stop offset="0.25" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
        {/* Sisi lipatan: gelap ke terang, dan sebaliknya */}
        <linearGradient id={id("foldA")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.24" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={id("foldB")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={id("soft")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.09" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter id={id("blur")} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Bayangan lantai di bawah rok */}
      <ellipse
        cx={cx} cy={Y(geo.length) + laceDrop + 3} rx={hm * scale * 0.95} ry="4"
        fill="#000" fillOpacity="0.16" filter={`url(#${id("blur")})`}
      />

      {/* --- LAYER 1: KAIN DASAR, MOTIF, BROKAT (satu lembar utuh) --- */}
      <g clipPath={`url(#${id("clip")})`}>
        <path d={outlinePath} fill={fabric} />
        {geo.bandH > 0 && (
          <rect x={X(-hw)} y={Y(0)} width={geo.waistW * scale} height={geo.bandH * scale} fill={fabric} />
        )}

        {motifSrc && (
          <rect x={bodyX} y={Y(0)} width={bodyW} height={geo.length * scale} fill={`url(#${id("motif")})`} />
        )}

        {design?.useBrokat && design?.brokatImage && (
          <rect
            x={bodyX} y={Y(0)} width={bodyW} height={geo.length * scale}
            fill={`url(#${id("brokat")})`}
            style={{
              mixBlendMode: activeBrokatBlend,
              opacity: design?.brokatOpacity ?? 0.85,
            }}
          />
        )}

        {/* --- LAYER 2: BAYANGAN & LIPATAN KAIN --- */}
        <path d={outlinePath} fill={`url(#${id("body")})`} />
        <path d={outlinePath} fill={`url(#${id("drop")})`} />

        {strips.map((pts, i) => (
          <polygon key={i} points={pts} fill={`url(#${id(i % 2 ? "foldB" : "foldA")})`} />
        ))}
        {folds.map((pts, i) => (
          <polygon key={i} points={pts} fill={`url(#${id("soft")})`} />
        ))}
      </g>

      {/* Garis lipatan plisket yang sudah disetrika */}
      {isPleated &&
        Array.from({ length: geo.pleats - 1 }, (_, k) => k + 1).map((i) => (
          <g key={i} stroke="currentColor" fill="none" strokeLinecap="round">
            <polyline
              points={`${X(pleatX(i, hw))},${Y(yS)} ${X(pleatX(i, hh))},${Y(geo.hipDepth)}`}
              strokeOpacity="0.35" strokeWidth="0.9"
            />
            <polyline
              points={`${X(pleatX(i, hh))},${Y(geo.hipDepth)} ${X(pleatX(i, hm))},${Y(geo.length)}`}
              strokeOpacity="0.22" strokeWidth="0.9"
            />
          </g>
        ))}

      {/* Kontur luar (tipis, bukan garis pola) */}
      <path d={outlinePath} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" strokeLinejoin="round" />

      {/* Kupnat yang sudah terjahit: lipatan kecil meruncing */}
      {darts.map((d, i) => (
        <g key={i}>
          <polygon
            points={`${X(d.x - 0.5)},${Y(0)} ${X(d.x + 0.5)},${Y(0)} ${X(d.x)},${Y(d.len)}`}
            fill="#000" fillOpacity="0.14"
          />
          <line
            x1={X(d.x)} x2={X(d.x)} y1={Y(0)} y2={Y(d.len)}
            stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.9" strokeLinecap="round"
          />
        </g>
      ))}

      {/* Ikat pinggang */}
      {geo.bandH > 0 && (
        <g>
          <rect
            x={X(-hw)} y={Y(0)} width={geo.waistW * scale} height={geo.bandH * scale}
            fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.1"
          />
          <rect x={X(-hw)} y={Y(0)} width={geo.waistW * scale} height={geo.bandH * scale} fill={`url(#${id("body")})`} />
          <rect x={X(-hw)} y={Y(0)} width={geo.waistW * scale} height={geo.bandH * scale} fill="#000" fillOpacity="0.05" />
          {part === "back" && (
            <circle cx={X(hw - 1.6)} cy={Y(geo.bandH / 2)} r={Math.max(2.2, 0.5 * scale)}
              fill="#fff" fillOpacity="0.85" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.8" />
          )}
        </g>
      )}

      {/* Ritsleting tersembunyi di tengah belakang */}
      {part === "back" && !isPleated && (
        <g stroke="currentColor" fill="none" strokeLinecap="round">
          <line x1={X(0)} x2={X(0)} y1={Y(0)} y2={Y(Math.min(18, geo.hipDepth))} strokeOpacity="0.55" strokeWidth="1.2" />
          <rect x={X(0) - 2} y={Y(0) + 1} width="4" height="7" rx="1.5"
            fill="#d9d9d9" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.6" />
        </g>
      )}

      {/* --- HIASAN TAMBAHAN (bebas posisi): urutan array = urutan lapisan --- */}
      {myExtras.map((e) => {
        const shape = (
          <ExtraShape
            e={e} patId={id(`ex-${e.id}`)} clipId={id("clip")}
            X={X} Y={Y} scale={scale} halfMax={geo.maxW / 2} halfAt={halfAt}
          />
        );
        const inner = editable && e.type === "lace" ? (
          <g onPointerDown={(ev) => onExtraDown(ev, e, "move")} style={{ cursor: "grab" }}>
            {shape}
          </g>
        ) : (
          shape
        );
        /* renda tidak dipotong siluet: skalopnya boleh menjuntai di bawah hem */
        return <g key={e.id}>{inner}</g>;
      })}

      {/* Kotak seleksi: seret untuk memindah, kotak kecil di sudut untuk ubah ukuran */}
      {editable &&
        myExtras
          .filter((e) => e.id === selectedId && e.type === "lace")
          .map((e) => {
            const bx = extraBox(e, halfAt);
            const x = X(bx.x1);
            const y = Y(bx.top);
            const w = (bx.x2 - bx.x1) * scale;
            const h = (bx.bottom - bx.top) * scale;
            return (
              <g key="selection">
                <rect
                  x={x} y={y} width={w} height={h}
                  fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth="1.5"
                  style={{ cursor: "move" }}
                  onPointerDown={(ev) => onExtraDown(ev, e, "move")}
                />
                <rect
                  x={x + w - 5} y={y + h - 5} width="10" height="10" rx="2"
                  fill="#fff" stroke="#2563eb" strokeWidth="1.5"
                  style={{ cursor: "nwse-resize" }}
                  onPointerDown={(ev) => onExtraDown(ev, e, "resize")}
                />
              </g>
            );
          })}

      {/* --- LAYER 3: KANTONG --- */}
      {[hasLeftPocket && -1, hasRightPocket && 1].filter(Boolean).map((s) => (
        <g key={s} fill="none" stroke="currentColor" strokeLinecap="round">
          <path d={pocketPath(s)} strokeOpacity="0.65" strokeWidth="1.3" />
          {/* pengunci kedua ujung mulut kantong */}
          <circle cx={pocketGeom(s).ax} cy={pocketGeom(s).ay} r="1.4" fill="currentColor" fillOpacity="0.5" stroke="none" />
          <circle cx={pocketGeom(s).bx} cy={pocketGeom(s).by} r="1.4" fill="currentColor" fillOpacity="0.5" stroke="none" />
        </g>
      ))}

      {/* --- LAYER 4: RENDA KELIM --- */}
      {lace.on &&
        Array.from({ length: lace.rows }).map((_, r) => (
          <LaceRow
            key={r}
            geo={geo}
            spec={lace}
            yBase={geo.length - r * lace.h * 1.0}
            X={X}
            Y={Y}
            scale={scale}
          />
        ))}

      {/* --- LAYER 5: LABEL (dimensi hanya bila diminta) --- */}
      {showDimensions && (
        <g>
          <g stroke="currentColor" strokeOpacity="0.7" strokeWidth="1">
            <line x1={X(-hw)} x2={X(hw)} y1={Y(0) - 12} y2={Y(0) - 12} markerStart="url(#fin-arrow)" markerEnd="url(#fin-arrow)" />
            <line x1={X(-hm)} x2={X(hm)} y1={Y(geo.length) + 14 + laceDrop} y2={Y(geo.length) + 14 + laceDrop} markerStart="url(#fin-arrow)" markerEnd="url(#fin-arrow)" />
            <line x1={ox + 46} x2={ox + 46} y1={Y(0)} y2={Y(geo.length)} markerStart="url(#fin-arrow)" markerEnd="url(#fin-arrow)" />
          </g>
          <g fill="currentColor" fontSize="11" textAnchor="middle">
            <text x={cx} y={Y(0) - 18}>Pinggang {fmt(geo.waistW)} cm</text>
            <text x={cx} y={Y(geo.length) + 28 + laceDrop}>Hem {fmt(geo.hemW)} cm</text>
            <text x={ox + 38} y={(Y(0) + Y(geo.length)) / 2 + 4} textAnchor="end">{fmt(geo.length)} cm</text>
          </g>
        </g>
      )}
      <text
        x={cx} y={baseY + (showDimensions ? 50 : 28)}
        textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}

export default function SkirtFinalPreview({
  design,
  measurements,
  showDimensions = false,
  readOnly = false, // true: tampilan saja, renda tidak bisa diseret atau diubah
  onExtrasChange, // (daftarBaru) => void; bila diisi, hiasan bisa diseret
  selectedExtraId, // opsional: pilihan dikendalikan dari luar
  onSelectExtra, // opsional: (id | null) => void
}) {
  const rawId = useId();
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [draft, setDraft] = useState(null); // { index, patch } selama menyeret
  const [innerSel, setInnerSel] = useState(null);
  /* Bila induk tidak memberi onExtrasChange, hasil seret disimpan lokal di sini
     (tampil di preview saja) sampai design.extras dari induk berubah. */
  const [localExtras, setLocalExtras] = useState(null);
  const localBase = useRef(null); // isi design.extras saat salinan lokal dibuat
  const rawRef = useRef([]); // daftar hiasan mentah terbaru (hindari data usang)
  useEffect(() => {
    /* Salinan lokal dibuang hanya bila isi design.extras dari induk benar-benar
       berubah. Induk yang membuat array baru berisi sama tidak lagi mengembalikan
       semua renda ke posisi awal (tengah). */
    const sig = JSON.stringify(design?.extras ?? []);
    if (localBase.current !== null && sig === localBase.current) return;
    localBase.current = null;
    setLocalExtras(null);
  }, [design?.extras]);
  const motifSrc = design?.motifType === "color" ? null : design?.motifImage || null;
  const motifRatio = useImageRatio(motifSrc);
  const brokatRatio = useImageRatio(design?.brokatImage);
  const uid = `sk${String(rawId).replace(/[^a-zA-Z0-9]/g, "")}`;

  const config = resolveModel(design?.model);
  const pleatCount = Number(design?.pleatCount) || PLEAT_COUNT;

  const safeMeasurements = useMemo(
    () => ({
      waist: Number(measurements?.waist) || 0,
      hip: Number(measurements?.hip) || 0,
      skirtLength: Number(measurements?.skirtLength) || 0,
      hipDepth: Number(measurements?.hipDepth) || 18,
    }),
    [measurements]
  );

  const pattern = useMemo(
    () =>
      config.type === "pleated"
        ? computePleated(safeMeasurements, pleatCount)
        : computePattern(safeMeasurements, config.flare),
    [config, pleatCount, safeMeasurements]
  );

  if (!safeMeasurements.waist || !safeMeasurements.hip || !safeMeasurements.skirtLength || pattern.status === "empty") {
    return (
      <p style={{ padding: "16px", color: "#666" }}>
        Lengkapi lingkar pinggang, lingkar pinggul, dan panjang rok.
      </p>
    );
  }

  if (pattern.status === "error") {
    return null;
  }

  const rawGeo = buildGeometry(pattern);
  const geo = {
    ...rawGeo,
    waistW: Number.isNaN(rawGeo.waistW) ? 0 : rawGeo.waistW,
    hipW: Number.isNaN(rawGeo.hipW) ? 0 : rawGeo.hipW,
    hemW: Number.isNaN(rawGeo.hemW) ? 0 : rawGeo.hemW,
    length: Number.isNaN(rawGeo.length) ? 0 : rawGeo.length,
    hipDepth: Number.isNaN(rawGeo.hipDepth) ? 18 : rawGeo.hipDepth,
  };

  const fabric = design?.color || DEFAULT_FABRIC;
  const VIEW_W = 640;
  const PANEL_W = VIEW_W / 2;
  const maxW = Math.max(geo.waistW, geo.hipW, geo.hemW) || 1;
  const scale = Math.min(5, (PANEL_W - 60 - 16) / maxW);
  const top = 44;
  const lace = laceSpec(design);
  const editable = !readOnly; // renda bisa diseret kecuali mode baca saja
  const rawExtras = localExtras ?? (Array.isArray(design?.extras) ? design.extras : []);
  rawRef.current = rawExtras;
  const effectiveRaw = draft
    ? rawExtras.map((e, i) => (i === draft.index ? { ...e, ...draft.patch } : e))
    : rawExtras;
  const extras = normalizeExtras({ extras: effectiveRaw }, geo.length);
  const selectedId = selectedExtraId !== undefined ? selectedExtraId : innerSel;
  const selected = extras.find((e) => e.id === selectedId && e.type === "lace") || null;
  const select = (id) => {
    setInnerSel(id);
    if (onSelectExtra) onSelectExtra(id);
  };
  const commit = (list) => {
    const next = withIds(list);
    rawRef.current = next;
    localBase.current = JSON.stringify(design?.extras ?? []);
    setLocalExtras(next); // tampil langsung, tanpa menunggu induk
    if (typeof onExtrasChange === "function") onExtrasChange(next);
  };
  const patchAt = (index, patch) => rawRef.current.map((e, i) => (i === index ? { ...e, ...patch } : e));

  /* Titik pointer pada koordinat SVG */
  const toSvg = (ev) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: ev.clientX, y: ev.clientY };
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };

  const startDrag = (ev, item, mode) => {
    if (!editable) return;
    ev.stopPropagation();
    ev.preventDefault();
    wrapRef.current?.focus();
    select(item.id);
    try {
      svgRef.current?.setPointerCapture(ev.pointerId);
    } catch {
      /* abaikan bila tidak didukung */
    }
    dragRef.current = { mode, index: item.index, start: item, from: toSvg(ev), patch: null };
  };

  const moveDrag = (ev) => {
    const d = dragRef.current;
    if (!d) return;
    /* tombol mouse sudah dilepas tapi pointerup tidak sampai: hentikan seret */
    if (ev.pointerType === "mouse" && ev.buttons === 0) {
      endDrag();
      return;
    }
    const p = toSvg(ev);
    const dx = (p.x - d.from.x) / scale;
    const dy = (p.y - d.from.y) / scale;
    const patch =
      d.mode === "resize"
        ? resizePatch(d.start, dx, dy, geo.length)
        : dragPatch(d.start, dx, dy, geo.length);
    d.patch = patch;
    setDraft({ index: d.index, patch });
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    setDraft(null);
    if (d.patch) commit(patchAt(d.index, d.patch));
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const { list, newId } = duplicateExtra(withIds(rawRef.current), selected.index);
    /* salinan digeser 2 cm ke posisi yang pasti terlihat dan tetap di dalam rok */
    const dir = selected.bottom + 2 <= geo.length ? 1 : -1;
    const patch = dragPatch(selected, 2, dir * 2, geo.length);
    list[selected.index + 1] = { ...list[selected.index + 1], ...patch };
    commit(list);
    if (newId) select(newId);
  };
  const removeSelected = () => {
    if (!selected) return;
    commit(removeExtraAt(withIds(rawRef.current), selected.index));
    select(null);
  };
  /* Naik/turunkan lapisan: hanya mengubah renda mana yang menutupi renda lain */
  const layerSelected = (dir) => {
    if (!selected) return;
    commit(shiftLayer(withIds(rawRef.current), selected.index, dir));
  };

  const onKeyDown = (ev) => {
    if (!editable || !selected) return;
    const step = ev.shiftKey ? 2 : 0.5;
    const arrows = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (arrows[ev.key]) {
      ev.preventDefault();
      const [dx, dy] = arrows[ev.key];
      commit(patchAt(selected.index, dragPatch(selected, dx, dy, geo.length)));
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      removeSelected();
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "d") {
      ev.preventDefault();
      duplicateSelected();
    } else if (ev.key === "Escape") {
      select(null);
    }
  };

  const svgH =
    top + geo.length * scale + (showDimensions ? 68 : 46) +
    Math.max(lace.on ? lace.h * 1.1 * scale : 0, extrasOverhang(extras, geo.length) * scale);
  const g = { ...geo, maxW };

  return (
    <div
      className="skirt-final-preview"
      ref={wrapRef}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={onKeyDown}
      style={{ outline: "none" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${svgH}`}
        role="img"
        aria-label="Tampilan akhir rok tampak depan dan belakang"
        style={{
          display: "block", width: "100%", height: "auto", color: "inherit",
          touchAction: editable && extras.some((e) => e.type === "lace") ? "none" : "auto",
          isolation: "isolate",
        }}
        onPointerDown={() => editable && select(null)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <defs>
          <marker
            id="fin-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        <Panel
          geo={g} part="front" label="Depan" ox={0} scale={scale} top={top}
          fabric={fabric} design={design} uid={uid} showDimensions={showDimensions}
          motifRatio={motifRatio} brokatRatio={brokatRatio} extras={extras}
          editable={editable} selectedId={selectedId} onExtraDown={startDrag}
        />
        <Panel
          geo={g} part="back" label="Belakang" ox={PANEL_W} scale={scale} top={top}
          fabric={fabric} design={design} uid={uid} showDimensions={showDimensions}
          motifRatio={motifRatio} brokatRatio={brokatRatio} extras={extras}
          editable={editable} selectedId={selectedId} onExtraDown={startDrag}
        />
      </svg>

      {/* {editable && extras.some((e) => e.type === "lace") && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          {selected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong>{selected.label}</strong>
              <span style={{ opacity: 0.7 }}>
                lapisan {layerInfo(rawRef.current, selected.index).pos} dari {rawRef.current.length}
              </span>
              <button type="button" onClick={duplicateSelected}>Duplikat</button>
              <button
                type="button" onClick={() => layerSelected(1)}
                disabled={layerInfo(rawRef.current, selected.index).pos >= rawRef.current.length}
                title="Renda ini menutupi renda lain yang bertumpuk dengannya"
              >
                Naikkan lapisan
              </button>
              <button
                type="button" onClick={() => layerSelected(-1)}
                disabled={layerInfo(rawRef.current, selected.index).pos <= 1}
                title="Renda ini tertutup renda lain yang bertumpuk dengannya"
              >
                Turunkan lapisan
              </button>
              <button type="button" onClick={removeSelected}>Hapus</button>
              <button type="button" onClick={() => select(null)}>Batal pilih</button>
            </div>
          ) : (
            <span style={{ opacity: 0.75 }}>Klik renda untuk memilihnya, lalu seret untuk memindahkannya.</span>
          )}
          <div style={{ marginTop: 4, opacity: 0.7 }}>
            Seret renda (atau kotak birunya) untuk memindah, tarik kotak kecil di sudut kanan bawah
            untuk mengubah ukuran. Tombol panah menggeser 0,5 cm (Shift: 2 cm), Delete menghapus,
            Ctrl+D menduplikat. Renda selebar rok penuh hanya bisa digeser naik dan turun.
          </div>
        </div>
      )} */}
    </div>
  );
}