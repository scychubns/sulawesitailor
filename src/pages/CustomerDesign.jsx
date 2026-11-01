import { Link, useParams, useNavigate } from "react-router-dom";
import { formatDate } from "../utils/formatDate";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import SkirtPattern from "../components/SkirtPattern";

export default function CustomerDesign({ savedDesigns = [], onDesignDeleted }) {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  // id desain yang sudah dihapus, disembunyikan langsung tanpa menunggu data dimuat ulang
  const [deletedIds, setDeletedIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function loadCustomerName() {
      const { data, error } = await supabase
        .from("customers")
        .select("name")
        .eq("id", customerId)
        .single();

      if (error) {
        console.error("Gagal mengambil nama pelanggan:", error);
        return;
      }

      setCustomerName(data.name);
    }

    if (customerId) {
      loadCustomerName();
    }
  }, [customerId]);

  const handleEdit = (design) => {
    if (design.status !== "Draft") return;
    navigate(`/konfigurasi?edit=${design.id}`);
  };

  async function handleDeleteDesign(item) {
    const title = item.title || `Desain ${item.id}`;
    const isFinal = item.status !== "Draft";
    const confirmed = window.confirm(
      isFinal
        ? `Hapus "${title}"? Desain ini sudah berstatus "${item.status}". Desain yang dihapus tidak bisa dikembalikan.`
        : `Hapus "${title}"? Desain yang dihapus tidak bisa dikembalikan.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(item.id);

      // select("id") agar tahu apakah ada baris yang benar-benar terhapus
      const { data, error } = await supabase
        .from("saved_designs")
        .delete()
        .eq("id", item.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Tidak ada desain yang terhapus. Periksa izin (RLS) tabel saved_designs di Supabase."
        );
      }

      setDeletedIds((prev) => [...prev, item.id]);
      if (typeof onDesignDeleted === "function") onDesignDeleted(item.id);
    } catch (error) {
      console.error("Gagal menghapus desain:", error);
      alert(`Desain gagal dihapus: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicateDesign(item) {
    try {
      const duplicateCustomerId =
        item.customerId ?? item.customer_id ?? customerId;

      if (!duplicateCustomerId) {
        throw new Error("ID pelanggan tidak ditemukan.");
      }

      const customerNameVal =
        typeof item.customer === "object"
          ? item.customer?.name
          : item.customer;

      const now = new Date().toISOString();

      const duplicatedDesign = {
        ...item.design,
        createdAt: now,
        updatedAt: now,
        motifFile: null,
      };

      const { error } = await supabase
        .from("saved_designs")
        .insert({
          customer: customerNameVal,
          customer_id: duplicateCustomerId,
          title: `${item.title || `Desain ${item.id}`} (Duplikat)`,
          design: duplicatedDesign,
          measurements: item.measurements ?? {},
          status: "Draft",
          created_at: now,
        });

      if (error) throw error;

      alert("Desain berhasil diduplikasi.");

      window.location.href =
        `/pelanggan/${encodeURIComponent(duplicateCustomerId)}/desain`;

    } catch (error) {
      console.error("Gagal menduplikasi desain:", error);
      alert(`Desain gagal diduplikasi: ${error.message}`);
    }
  }

  const customerDesigns = savedDesigns.filter((record) => {
    return (
      String(record.customerId ?? record.customer_id) ===
        String(customerId) && !deletedIds.includes(record.id)
    );
  });

  return (
    <main className="container">
      <header className="customer-design-header">
        <div>
          <Link to="/pelanggan" className="back-link">
            ← Kembali
          </Link>

          <h1>{customerName || "Pelanggan"}</h1>
          <p>
            {customerDesigns.length} desain tersimpan
          </p>
        </div>
      </header>

      <section className="customer-design-content">
        {customerDesigns.length === 0 ? (
          <div className="customer-design-empty">
            <h2>Belum ada desain</h2>
            <p>
              Belum ditemukan desain yang tersimpan untuk
              pelanggan ini.
            </p>
          </div>
        ) : (
          <div className="customer-design-grid">
            {customerDesigns.map((item, index) => {
              const designConfig = item.design ?? item;
              const measurementsData = item.measurements ?? designConfig.measurements ?? {};

              const mergedDesign = {
                ...designConfig,
                ornaments: designConfig.ornaments ?? item.ornaments ?? [],
                extras: designConfig.extras ?? item.extras ?? [],
              };

              const deleting = deletingId === item.id;

              return (
                <article
                  className="customer-design-card"
                  key={item.id ?? `${customerId}-${index}`}
                >
                  <div className="customer-design-preview">
                    {item.design || item.model ? (
                      <SkirtPattern 
                        design={mergedDesign} 
                        measurements={measurementsData} 
                        readOnly={true}
                      />
                    ) : (
                      <div className="no-preview">
                        Preview tidak tersedia
                      </div>
                    )}
                  </div>
                  <div className="design-detail-text">
                    <div className="top-text-edit">
                      <h3>{item.title ? item.title : `Desain ${item.id}`}</h3>
                      <div className="div-detail-text">
                        {item.status === "Draft" ? (
                          <button className="button-edit" type="button" onClick={() => handleEdit(item)}>
                            Ubah
                          </button>
                        ) : (
                          <>
                            <button
                              className="button-edit"
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/konfigurasi?view=${encodeURIComponent(item.id)}`
                                )
                              }
                            >
                              Lihat
                            </button>
                            <button className="button-edit" type="button" onClick={() => handleDuplicateDesign(item)}>
                              Duplikasi
                            </button>
                          </>
                        )}
                        <button
                          className="button-edit button-delete"
                          type="button"
                          style={{ color: "#b42318" }}
                          disabled={deleting}
                          onClick={() => handleDeleteDesign(item)}
                        >
                          {deleting ? "Menghapus..." : "Hapus"}
                        </button>
                      </div>
                    </div>
                    <p>
                      Model:{" "}
                      {item.model ?? item.design?.model ?? "-"}
                    </p>
                    <p>
                      Dibuat pada:{" "}
                      {formatDate(item.design?.createdAt ?? item.created_at)}
                    </p>
                    <p>
                      Terakhir diperbarui pada:{" "}
                      {formatDate(item.design?.updatedAt ?? item.updated_at)}
                    </p>
                    <p>
                      Status: {" "}
                      {item.status}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}