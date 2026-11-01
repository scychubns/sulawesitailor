import { Link,useNavigate } from "react-router-dom";

export default function CustomersPage({ savedDesigns, onNavigate }) {
  // Mengelompokkan desain berdasarkan nama pelanggan
  const navigate = useNavigate();
  const customers = Object.values(
    savedDesigns
      .filter((record) => record.customer)
      .reduce((result, record) => {
        const customer = record.customer;

        // Mendukung customer berbentuk objek atau teks
        const customerName =
          typeof customer === "object"
            ? customer.name
            : customer;

        const customerId =
        record.customerId ??
        (typeof customer === "object" ? customer.id : null);

        if (!customerName) {
          return result;
        }
        const key = customerId ?? customerName;

       if (!result[key]) {
        result[key] = {
          id: key,
          name: customerName,
          customerId: customerId,
          totalDesain: 0,
        };
      }

      result[key].totalDesain += 1;
      return result;
      }, {})
  );
  return (
    <main className="container">
      <header className="page-header">
        <div>
          <h1>Daftar Pelanggan</h1>
          <p>Daftar pelanggan dalam sistem.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => onNavigate("konfigurasi")}
        >
          + Konfigurasi Baru
        </button>
      </header>

      <section className="panel">
        {customers.length === 0 ? (
          <div className="empty-state">
            <h2>Belum ada pelanggan</h2>
            <p className="muted">
              Simpan konfigurasi desain untuk menambahkan nama
              pelanggan ke daftar ini.
            </p>

            <button
              className="primary-button"
              onClick={() => onNavigate("konfigurasi")}
            >
              Tambah Pelanggan
            </button>
          </div>
        ) : (
          <section className="customer-list">
            {customers.map((customer) => (
              <div
                className="panel dashboard-card"
                key={customer.id}
                onClick={() =>
                  navigate(
                    `/pelanggan/${encodeURIComponent(customer.customerId)}/desain`
                  )
                }
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    navigate(
                      `/pelanggan/${encodeURIComponent(customer.customerId)}/desain`
                    );
                  }
                }}
              >
                <strong>{customer.name}</strong>
                  <p>
                    {customer.totalDesain} desain tersimpan
                  </p>
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}