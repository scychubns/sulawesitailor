import { useState } from "react";

export default function CustomerForm({
  customer,
  listCustomer = [],
  onCustomerChange,
  onAddCustomer,
  disabled,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");

  async function handleAddCustomer() {
    const cleanName = newCustomer.trim();

    if (!cleanName) {
      alert("Masukkan nama pelanggan.");
      return;
    }

    // Cek nama yang sudah ada di daftar
    const existing = listCustomer.find(
      (name) =>
        name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      alert("Pelanggan sudah ada dalam daftar.");
      onCustomerChange(existing);
      setNewCustomer("");
      setIsAdding(false);
      return;
    }

    // Kirim nama ke App.jsx untuk disimpan ke Supabase
    await onAddCustomer(cleanName);

    setNewCustomer("");
    setIsAdding(false);
  }

  return (
    <section className="panel section-panel">
      <h2>1. Informasi Pelanggan</h2>

      <label htmlFor="customer">
        Nama Pelanggan
        <select
          id="customer"
          value={isAdding ? "__new__" : customer}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "__new__") {
              setIsAdding(true);
              setNewCustomer("");
            } else {
              setIsAdding(false);
              onCustomerChange(value);
            }
          }}
        >
          <option value="">Pilih pelanggan</option>
          {listCustomer.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}

          <option value="__new__">
            + Tambah Pelanggan Baru
          </option>
        </select>
      </label>

      {isAdding && (
        <div className="add-customer-form">
          <label htmlFor="newCustomer">
            Nama Pelanggan Baru

            <input
              id="newCustomer"
              type="text"
              value={newCustomer}
              disabled={disabled}
              onChange={(e) =>
                setNewCustomer(e.target.value)
              }
              placeholder="Masukkan nama pelanggan"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomer();
                }
              }}
            />
          </label>

          <div className="customer-actions button-row">
            <button
              type="button"
              className="secondary-button"
              disabled={disabled}
              onClick={() => {
                setIsAdding(false);
                setNewCustomer("");
              }}
            >
              Batal
            </button>

            <button
              type="button"
              className="primary-button"
            disabled={disabled}
              onClick={handleAddCustomer}
            >
              Tambah Pelanggan
            </button>
          </div>
        </div>
      )}
    </section>
  );
}