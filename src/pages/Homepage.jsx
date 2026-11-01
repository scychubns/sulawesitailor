import { useNavigate } from "react-router-dom";

export default function HomePage({ onNavigate, savedDesigns }) {
  const navigate = useNavigate();
  return (
    <main className="container">
      <header className="page-header">
      </header>

      <section className="dashboard-grid">
        <div className="panel dashboard-card"
          onClick={() => navigate("/konfigurasi")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              navigate("konfigurasi");
            }
          }}
        >
          <h3>Konfigurasi Desain</h3>
          <p className="muted">
            Buat desain baru dan catat ukuran pelanggan
          </p>
        </div>
        <div className="panel dashboard-card"
          onClick={() => navigate("/pelanggan")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              navigate("pelanggan");
            }
          }}>
          <h3>Daftar Pelanggan</h3>
          <p className="muted">
            Daftar pelanggan dalam sistem
          </p>
        </div>
      </section>
    </main>
  );
}
