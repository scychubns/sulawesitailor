import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SkirtPreview from "../components/Preview";

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function DesignDetailPage() {
  const navigate = useNavigate();
  const { customerId, designId } = useParams();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


useEffect(() => {
  async function fetchDesign() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("saved_designs")
      .select("*")
      .eq("id", designId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (error) {
      console.error("Gagal mengambil desain:", error);
      setError("Gagal memuat desain.");
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Desain tidak ditemukan untuk pelanggan ini.");
      setLoading(false);
      return;
    }

    setRecord(data);
    setLoading(false);
  }
  if (!customerId || !designId) {
    console.error("ID pelanggan atau ID desain tidak tersedia.");
    return;
  }
  if (customerId && designId) {
    fetchDesign();
  }
}, [customerId, designId]);

  if (loading) {
    return <main className="design-detail">Memuat detail desain...</main>;
  }

  if (error || !record) {
    return (
      <main className="design-detail">
        <p>{error || "Desain tidak ditemukan."}</p>
        <button onClick={() => navigate(-1)}>Kembali</button>
      </main>
    );
  }

  // Diasumsikan kolom design dan measurements menyimpan objek JSON.
  const design =
    typeof record.design === "string"
      ? JSON.parse(record.design)
      : record.design || {};

  const measurements =
    typeof record.measurements === "string"
      ? JSON.parse(record.measurements)
      : record.measurements || {};

  const isFinished = record.status === "Selesai";

  function handleEdit() {
    navigate("/konfigurasi", {
      state: {
        designToEdit: {
          ...record,
          design,
          measurements,
        },
      },
    });
  }

  function handleRevision() {
    navigate("/konfigurasi", {
      state: {
        designToEdit: {
          ...record,
          design: { ...design },
          measurements: { ...measurements },
          status: "Draft",
          parent_design_id: record.id,
        },
        isRevision: true,
      },
    });
  }

  async function handleFinish() {
    const confirmed = window.confirm(
      "Selesaikan desain ini? Desain yang selesai tidak dapat diedit langsung."
    );

    if (!confirmed) return;

    const { data, error } = await supabase
      .from("saved_designs")
      .update({ status: "Selesai" })
      .eq("id", designId)
      .select()
      .single();

    if (error) {
      console.error(error);
      window.alert("Gagal menyelesaikan desain.");
      return;
    }

    setRecord(data);
  }

  return (
    <main className="design-detail">
      <button
        className="back-button"
        onClick={() =>
          navigate(`/pelanggan/${encodeURIComponent(customerId)}/desain`)
        }
      >
        ← Kembali ke Daftar Desain
      </button>

      <header className="detail-header">
        <div>
          <h1>Detail Desain Rok</h1>
          <p>Informasi desain yang tersimpan untuk pelanggan.</p>
        </div>

        <span
          className={`status-badge ${
            isFinished ? "status-finished" : "status-draft"
          }`}
        >
          {record.status}
        </span>
      </header>

      <section className="detail-grid">
        <article className="detail-card preview-card">
          <h2>Preview Desain</h2>

          <div className="detail-preview">
            <SkirtPreview design={design} />
          </div>

          <p className="color-information">
            <span
              className="color-swatch"
              style={{ backgroundColor: design.color || "#ffffff" }}
            />
            Warna: {design.color || "-"}
          </p>
        </article>

        <article className="detail-card">
          <h2>Ringkasan Desain</h2>

          <dl className="detail-list">
            <div>
              <dt>Model rok</dt>
              <dd>{design.model || "-"}</dd>
            </div>

            <div>
              <dt>Panjang rok</dt>
              <dd>{design.length || "-"}</dd>
            </div>

            <div>
              <dt>Kantong</dt>
              <dd>{design.pocket || "-"}</dd>
            </div>

            <div>
              <dt>Status</dt>
              <dd>{record.status || "Draft"}</dd>
            </div>

            <div>
              <dt>Dibuat pada</dt>
              <dd>{formatDate(record.created_at)}</dd>
            </div>

            <div>
              <dt>Terakhir diperbarui</dt>
              <dd>{formatDate(record.updated_at)}</dd>
            </div>
          </dl>

          <h2 className="measurements-title">Data Pengukuran</h2>

          <dl className="detail-list">
            <div>
              <dt>Lingkar pinggang</dt>
              <dd>{measurements.waist || "-"} cm</dd>
            </div>

            <div>
              <dt>Lingkar pinggul</dt>
              <dd>{measurements.hip || "-"} cm</dd>
            </div>

            <div>
              <dt>Panjang rok</dt>
              <dd>{measurements.skirtLength || "-"} cm</dd>
            </div>

            <div>
              <dt>Catatan</dt>
              <dd>{measurements.notes || "-"}</dd>
            </div>
          </dl>

          <div className="detail-actions">
            {!isFinished ? (
              <>
                <button className="secondary-button" onClick={handleEdit}>
                  Edit Draft
                </button>

                <button className="primary-button" onClick={handleFinish}>
                  Selesaikan Desain
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={handleRevision}>
                Buat Revisi
              </button>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}