
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

// Data contoh pelanggan
const customers = [
  {
    id: "PLG-001",
    name: "Siti Aminah",
    phone: "081234567890",
  },
  {
    id: "PLG-002",
    name: "Budi Santoso",
    phone: "081298765432",
  },
];

// Data contoh desain
// Nantinya ganti dengan data dari database
const designs = [
  {
    id: "DES-001",
    customerId: "PLG-001",
    name: "Rok A-Line Putih",
    model: "A-Line",
    length: "Panjang",
    color: "#ffffff",
    pocket: "Tanpa kantong",
    status: "Draft",
  },
  {
    id: "DES-002",
    customerId: "PLG-001",
    name: "Rok Pleated Biru",
    model: "Pleated",
    length: "Panjang",
    color: "#4267b2",
    pocket: "2 kantong",
    status: "Disetujui",
  },
  {
    id: "DES-003",
    customerId: "PLG-001",
    name: "Rok A-Line Hitam",
    model: "A-Line",
    length: "Pendek",
    color: "#292929",
    pocket: "Kiri",
    status: "Draft",
  },
  {
    id: "DES-004",
    customerId: "PLG-002",
    name: "Rok Pleated Merah",
    model: "Pleated",
    length: "Panjang",
    color: "#a83248",
    pocket: "Kanan",
    status: "Disetujui",
  },
];

function SkirtPreview({ design }) {
  const isLong = design.length === "Panjang";
  const isPleated = design.model === "Pleated";

  const bottom = isLong ? 245 : 155;
  const center = 150;
  const halfWidth = isPleated ? 43 : 63;

  const path = isPleated
    ? `M ${center - 35} 45
       L ${center + 35} 45
       L ${center + halfWidth} ${bottom}
       L ${center - halfWidth} ${bottom} Z`
    : `M ${center - 35} 45
       Q ${center} 55 ${center + 35} 45
       L ${center + halfWidth} ${bottom}
       Q ${center} ${bottom + 8} ${center - halfWidth} ${bottom} Z`;

  return (
    <svg
      viewBox="0 0 300 280"
      className="customer-design-svg"
      role="img"
      aria-label={design.name}
    >
      <path
        d={path}
        fill={design.color}
        stroke="#333"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {isPleated &&
        [-22, -11, 0, 11, 22].map((offset) => (
          <line
            key={offset}
            x1={center + offset}
            y1="50"
            x2={center + offset * 1.7}
            y2={bottom - 3}
            stroke="#333"
            strokeWidth="1"
            opacity="0.45"
          />
        ))}

      {(design.pocket === "Kiri" ||
        design.pocket === "2 kantong") && (
        <path
          d="M 122 85 l -17 5 l 5 25 l 17 -5 Z"
          fill="none"
          stroke="#333"
          strokeWidth="1.5"
        />
      )}

      {(design.pocket === "Kanan" ||
        design.pocket === "2 kantong") && (
        <path
          d="M 178 85 l 17 5 l -5 25 l -17 -5 Z"
          fill="none"
          stroke="#333"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

export default function CustomerDesignsPage({savedDesigns, ...props}) {
  const { customerId } = useParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [selectedDesign, setSelectedDesign] = useState(null);

  // Ambil pelanggan sesuai ID dari URL
  const customer = customers.find(
    (item) => item.id === customerId
  );

  // Hanya tampilkan desain milik pelanggan tersebut
  const customerDesigns = designs.filter(
    (design) => design.customerId === customerId
  );

  // Pencarian dan filter status
  const filteredDesigns = customerDesigns.filter((design) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      design.name.toLowerCase().includes(keyword) ||
      design.model.toLowerCase().includes(keyword);

    const matchesFilter =
      filter === "Semua" || design.status === filter;

    return matchesSearch && matchesFilter;
  });

  if (!customer) {
    return (
      <main className="customer-designs-page">
        <h2>Pelanggan tidak ditemukan</h2>
        <Link to="/pelanggan">Kembali ke daftar pelanggan</Link>
      </main>
    );
  }

  return (
    <main className="customer-designs-page">
      {/* Header */}
      <header className="customer-designs-header">
        <Link to="/pelanggan" className="customer-back-link">
          ← Kembali ke Daftar Pelanggan
        </Link>

        <h1>Daftar Desain Pelanggan</h1>
        <p>
          Semua desain pakaian yang dibuat oleh pelanggan.
        </p>
      </header>

      {/* Informasi pelanggan */}
      <section className="customer-profile">
        <div className="customer-profile-avatar">
          {customer.name.charAt(0)}
        </div>

        <div className="customer-profile-info">
          <span>INFORMASI PELANGGAN</span>
          <h2>{customer.name}</h2>
          <p>ID Pelanggan: {customer.id}</p>
          <p>Telepon: {customer.phone}</p>
        </div>

        <div className="customer-design-count">
          <strong>{customerDesigns.length}</strong>
          <span>Total Desain</span>
        </div>
      </section>

      {/* Judul dan tombol desain baru */}
      <section className="customer-designs-section">
        <div className="customer-designs-toolbar-header">
          <div>
            <h2>Semua Desain</h2>
            <p>
              Pilih desain untuk melihat rincian konfigurasinya.
            </p>
          </div>

          <Link
            to={`/konfigurasi?customerId=${customer.id}`}
            className="customer-primary-button"
          >
            + Buat Desain Baru
          </Link>
        </div>

        {/* Pencarian */}
        <div className="customer-designs-filters">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau model desain..."
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="Semua">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Disetujui">Disetujui</option>
          </select>
        </div>

        {/* Kartu desain */}
        {filteredDesigns.length > 0 ? (
          <div className="customer-designs-grid">
            {filteredDesigns.map((design) => (
              <article className="customer-design-card" key={design.id}>
                <div className="customer-design-image">
                  <SkirtPreview design={design} />

                  <span
                    className={`customer-design-status ${
                      design.status === "Disetujui"
                        ? "approved"
                        : "draft"
                    }`}
                  >
                    {design.status}
                  </span>
                </div>

                <div className="customer-design-card-body">
                  <h3>{design.name}</h3>
                  <p className="customer-design-id">{design.id}</p>

                  <div className="customer-design-attributes">
                    <div>
                      <span>Model</span>
                      <strong>{design.model}</strong>
                    </div>

                    <div>
                      <span>Panjang</span>
                      <strong>{design.length}</strong>
                    </div>

                    <div>
                      <span>Warna</span>
                      <strong className="customer-design-color">
                        <i
                          style={{
                            backgroundColor: design.color,
                          }}
                        />
                        {design.color}
                      </strong>
                    </div>

                    <div>
                      <span>Kantong</span>
                      <strong>{design.pocket}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="customer-outline-button"
                    onClick={() => setSelectedDesign(design)}
                  >
                    Lihat Detail
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="customer-designs-empty">
            <h3>Belum ada desain yang sesuai</h3>
            <p>
              Coba ubah kata pencarian atau pilih status lainnya.
            </p>
            <button
              type="button"
              className="customer-outline-button"
              onClick={() => {
                setSearch("");
                setFilter("Semua");
              }}
            >
              Reset Filter
            </button>
          </div>
        )}
      </section>

      {/* Modal detail */}
      {selectedDesign && (
        <div
          className="customer-modal-overlay"
          onClick={() => setSelectedDesign(null)}
        >
          <section
            className="customer-design-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="customer-modal-close"
              onClick={() => setSelectedDesign(null)}
              aria-label="Tutup"
            >
              ×
            </button>

            <h2 id="customer-modal-title">
              {selectedDesign.name}
            </h2>

            <p>ID Desain: {selectedDesign.id}</p>

            <div className="customer-modal-preview">
              <SkirtPreview design={selectedDesign} />
            </div>

            <h3>Rincian Konfigurasi</h3>

            <div className="customer-modal-details">
              <p>Model: <strong>{selectedDesign.model}</strong></p>
              <p>Panjang: <strong>{selectedDesign.length}</strong></p>
              <p>Warna: <strong>{selectedDesign.color}</strong></p>
              <p>Kantong: <strong>{selectedDesign.pocket}</strong></p>
              <p>Status: <strong>{selectedDesign.status}</strong></p>
            </div>

            <button
              type="button"
              className="customer-primary-button customer-modal-button"
              onClick={() => setSelectedDesign(null)}
            >
              Tutup
            </button>
          </section>
        </div>
      )}
    </main>
  );
}