/* Hiasan tambahan bebas posisi untuk rok (renda, layer brokat, pita).
   Dipakai bersama oleh PatternPreview dan SkirtFinalPreview.

   Isi `design.extras` berupa array, contoh:

   design.extras = [
     { type: "lace", anchor: "hem", y: 0, h: 3.5, color: "#fff8ef" },
     { type: "overlay", image: brokatDataUrl, y: 0, h: 30, opacity: 0.7 },
     { type: "ribbon", y: 12, h: 1.5, color: "#c0392b", part: "front" },
     { type: "lace", y: 20, h: 6, x: -10, w: 12, part: "front", label: "Renda kiri" },
   ];

   Semua ukuran dalam cm, diukur pada rok jadi:
   - type    "lace" (renda skalop), "overlay" (layer brokat/tulle/gambar),
             "ribbon" (pita atau list polos). Bawaan: "overlay".
   - part    "front", "back", atau "both" (bawaan).
   - anchor  "waist" (bawaan): y = jarak dari pinggang ke tepi atas hiasan.
             "hem": y = jarak dari hem ke tepi bawah hiasan.
   - y, h    posisi dan tinggi hiasan. Overlay tanpa h menutup seluruh rok.
             Renda dengan anchor "hem" dan y = 0: pita renda tepat di atas hem,
             skalopnya menjuntai di bawah hem. Tepi bawah hiasan tidak pernah
             melewati panjang rok.
   - x, w    geser ke samping dari garis tengah (cm, minus = kiri) dan lebar.
             Tanpa w, hiasan selebar rok penuh pada ketinggian itu.
   - color   warna isi (atau warna dasar bila ada image).
   - image   data URL / URL gambar untuk motif brokat, renda foto, dll.
   - tileSize lebar satu pengulangan gambar (cm), bawaan 15.
   - opacity kepekatan layer, 0 sampai 1 (1 = penuh, makin kecil makin tembus).
   - blend   cara gambar menyatu dengan kain:
             "auto" (bawaan untuk overlay bergambar): dideteksi dari file,
             "normal"   PNG transparan (motif brokat tanpa latar),
             "multiply" gambar dengan latar PUTIH (putih dihilangkan),
             "screen"   gambar dengan latar HITAM (hitam dihilangkan).
   - scallop (lebar skalop renda, cm), label. */

export const EXTRA_TYPES = {
  lace: { label: "Renda", color: "#fff8ef", height: 3.5, opacity: 1 },
  overlay: { label: "Layer brokat", color: "#ffffff", height: 0, opacity: 0.8 },
  ribbon: { label: "Pita", color: "#c0392b", height: 1.5, opacity: 1 },
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* Rapikan isi design.extras jadi daftar siap pakai.
   `length` = panjang rok dari pinggang sampai hem (cm). */
export function normalizeExtras(design, length) {
  const list = Array.isArray(design?.extras) ? design.extras : [];
  const out = [];
  list.forEach((e, i) => {
    if (!e || e.hidden) return;
    const type = EXTRA_TYPES[e.type] ? e.type : "overlay";
    const spec = EXTRA_TYPES[type];
    const anchor = e.anchor === "hem" ? "hem" : "waist";
    const hIn = Number(e.h);
    const height = hIn > 0 ? hIn : spec.height || length;
    /* Semua hiasan dibatasi di dalam panjang rok: tepi bawahnya tidak melewati hem.
       Skalop renda tetap boleh menjuntai sedikit di bawah hem. */
    const off = Math.max(0, Number(e.y) || 0);
    const rawTop = anchor === "hem" ? length - off - height : off;
    const top = clamp(rawTop, 0, Math.max(0, length - 0.1));
    const bottom = Math.min(length, top + height);
    const wIn = Number(e.w);
    const full = !(wIn > 0);
    const x = Number(e.x) || 0;
    const image = e.image || null;
    if (bottom - top < 0.05) return;
    out.push({
      id: String(e.id ?? `extra-${i}`),
      _length: length,
      anchor,
      index: i,
      type,
      label: e.label || spec.label,
      part: e.part === "front" || e.part === "back" ? e.part : "both",
      top,
      bottom,
      height: bottom - top,
      full,
      x,
      w: full ? 0 : wIn,
      x1: full ? -Infinity : x - wIn / 2,
      x2: full ? Infinity : x + wIn / 2,
      color: e.color || spec.color,
      image,
      opacity: Number.isFinite(Number(e.opacity)) ? clamp(Number(e.opacity), 0, 1) : spec.opacity,
      blend: e.blend || (type === "overlay" && image ? "auto" : "normal"),
      z: zOf(e, i),
      tile: Number(e.tileSize) > 0 ? Number(e.tileSize) : 15,
      scallop: Number(e.scallop) > 0 ? Number(e.scallop) : 4,
    });
  });
  /* urutan gambar = urutan lapisan (z kecil di bawah, z besar di atas) */
  out.sort((a, b) => a.z - b.z || a.index - b.index);
  return out;
}

/* Nilai lapisan (z) sebuah hiasan; bila belum ada, memakai urutannya di daftar */
function zOf(e, i) {
  return e && e.z !== "" && e.z != null && Number.isFinite(Number(e.z)) ? Number(e.z) : i;
}

/* Kedalaman skalop renda yang menjuntai di bawah pita rendanya (cm) */
export const laceDepth = (extra) => Math.min(extra.height * 0.6, extra.scallop * 0.55);

/* Seberapa jauh hiasan menjuntai di bawah hem (cm), 0 bila tidak ada */
export function extrasOverhang(list, length) {
  let max = 0;
  (list || []).forEach((e) => {
    const bottom = e.bottom + (e.type === "lace" ? laceDepth(e) : 0);
    max = Math.max(max, bottom - length);
  });
  return Math.max(0, max);
}

export const appliesTo = (extra, part) => extra.part === "both" || extra.part === part;

/* Rentang x (cm dari garis tengah) pada pola SEPEREMPAT badan.
   Pola hanya memuat satu sisi, jadi sisi kiri dan kanan dilipat ke satu rentang. */
export function quarterSpan(extra, maxCm) {
  if (extra.full) return [0, maxCm];
  const a = extra.x1;
  const b = extra.x2;
  if (a < 0 && b > 0) return [0, Math.min(maxCm, Math.max(-a, b))];
  const lo = Math.min(Math.abs(a), Math.abs(b));
  const hi = Math.max(Math.abs(a), Math.abs(b));
  return [Math.min(lo, maxCm), Math.min(hi, maxCm)];
}

/* Keterangan teks satu hiasan untuk daftar di bawah pola */
export function describeExtra(extra) {
  const part = extra.part === "front" ? "depan" : extra.part === "back" ? "belakang" : "depan dan belakang";
  const size = extra.full
    ? `lebar penuh mengikuti keliling rok, tinggi ${fmt(extra.height)} cm`
    : `${fmt(extra.w)} × ${fmt(extra.height)} cm, geser ${fmt(extra.x)} cm dari tengah`;
  const hang = extra.type === "lace" ? Math.max(0, extra.bottom + laceDepth(extra) - extra._length) : 0;
  const hangText = hang > 0.05 ? `, skalop menjuntai ${fmt(hang)} cm di bawah hem` : "";
  return `${extra.label} (${part}): ${size}, dari ${fmt(extra.top)} sampai ${fmt(extra.bottom)} cm di bawah pinggang${hangText}`;
}

/* ---------- Penyuntingan (seret, ubah ukuran, duplikat, hapus) ---------- */

const round1 = (n) => Math.round(n * 10) / 10;

/* Pastikan tiap hiasan punya id tetap. Id bawaan sama dengan yang dipakai
   normalizeExtras, jadi pilihan tidak hilang setelah disimpan. */
export const withIds = (list) =>
  (Array.isArray(list) ? list : []).map((e, i) => (e && e.id != null ? e : { ...e, id: `extra-${i}` }));

export const newExtraId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ex-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

/* Hasil seret: ubah posisi x (geser samping) dan y (jarak dari pinggang/hem).
   `start` = hiasan ternormalisasi saat seret dimulai, dx/dy dalam cm. */
export function dragPatch(start, dx, dy, length) {
  /* tepi bawah hiasan tidak boleh melewati panjang rok */
  const maxTop = Math.max(0, length - start.height);
  const top = clamp(start.top + dy, 0, maxTop);
  const patch = {
    y: round1(start.anchor === "hem" ? length - (top + start.height) : top),
  };
  if (!start.full) patch.x = round1(start.x + dx);
  return patch;
}

/* Hasil ubah ukuran dari sudut kanan bawah: tinggi (dan lebar bila tidak penuh) */
export function resizePatch(start, dx, dy, length) {
  const maxH = Math.max(0.5, length - start.top);
  const h = clamp(start.height + dy, 0.5, maxH);
  const patch = {
    h: round1(h),
    y: round1(start.anchor === "hem" ? length - (start.top + h) : start.top),
  };
  if (!start.full) {
    const w = Math.max(1, start.w + dx);
    patch.w = round1(w);
    patch.x = round1(start.x + (w - start.w) / 2);
  }
  return patch;
}

/* Kotak sentuh/seleksi hiasan dalam cm (renda termasuk skalop yang menjuntai) */
export function extraBox(extra, halfAt) {
  const bottom = extra.bottom + (extra.type === "lace" ? laceDepth(extra) : 0);
  const half = Math.max(halfAt(extra.top), halfAt(extra.bottom));
  return {
    x1: extra.full ? -half : extra.x1,
    x2: extra.full ? half : extra.x2,
    top: extra.top,
    bottom,
  };
}

/* Duplikat satu hiasan: salinan diletakkan tepat di atasnya dengan sedikit
   bergeser (2 cm ke bawah) supaya kelihatan. Mengembalikan daftar baru dan id salinan. */
export function duplicateExtra(list, index) {
  const src = list[index];
  if (!src) return { list, newId: null };
  const id = newExtraId();
  const dy = 2;
  const y = Number(src.y) || 0;
  const copy = {
    ...src,
    id,
    label: `${src.label || EXTRA_TYPES[src.type]?.label || "Hiasan"} (salinan)`,
    z: nextZ(list),
    y: round1(src.anchor === "hem" ? y - dy : y + dy),
  };
  if (Number(src.w) > 0) copy.x = round1((Number(src.x) || 0) + 2);
  const next = [...list];
  next.splice(index + 1, 0, copy);
  return { list: next, newId: id };
}

export const removeExtraAt = (list, index) => list.filter((_, i) => i !== index);

/* Pindah urutan lapisan: dir = +1 ke atas (digambar belakangan), -1 ke bawah */
export function moveLayer(list, index, dir) {
  const to = index + dir;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/* ---------- Lapisan (z) ----------
   Urutan lapisan disimpan di properti z tiap hiasan, bukan di urutan daftar.
   Jadi kartu di form tidak berpindah tempat saat lapisan dinaikkan/diturunkan. */

/* z untuk hiasan baru: paling atas */
export const nextZ = (list) => list.reduce((m, e, i) => Math.max(m, zOf(e, i)), -1) + 1;

const layerOrder = (list) =>
  list.map((e, i) => i).sort((a, b) => zOf(list[a], a) - zOf(list[b], b) || a - b);

/* Posisi lapisan hiasan ke-index: { pos: 1..total, total } (total = paling atas) */
export function layerInfo(list, index) {
  return { pos: layerOrder(list).indexOf(index) + 1, total: list.length };
}

/* Naik/turunkan satu lapisan (dir = +1 ke atas, -1 ke bawah). Hanya z yang berubah. */
export function shiftLayer(list, index, dir) {
  const order = layerOrder(list);
  const pos = order.indexOf(index);
  const to = pos + dir;
  if (pos < 0 || to < 0 || to >= order.length) return list;
  [order[pos], order[to]] = [order[to], order[pos]];
  return list.map((e, i) => ({ ...e, z: order.indexOf(i) }));
}