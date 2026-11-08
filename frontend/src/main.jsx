import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Database,
  DollarSign,
  Download,
  Edit3,
  Plus,
  RefreshCcw,
  Search,
  Server,
  Sparkles,
  Trash2,
  WalletCards
} from "lucide-react";
import "./styles.css";

const API_BASE = "/api";
const categories = ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Travel", "Other"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value || 0);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, byCategory: [], recent: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready to track expenses");
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ category: "All", search: "", from: "", to: "" });
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Food",
    spentAt: today(),
    note: ""
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const [expenseResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE}/expenses?${queryString}`),
        fetch(`${API_BASE}/expenses/summary?${queryString}`)
      ]);

      const expenseJson = await expenseResponse.json();
      const summaryJson = await summaryResponse.json();

      setExpenses(expenseJson.data || []);
      setSummary(summaryJson.data || { total: 0, count: 0, byCategory: [], recent: [] });
      setMessage("Synced with MongoDB through Express API");
    } catch (error) {
      setMessage("Could not connect to backend API. Check docker compose logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [queryString]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.amount) {
      setMessage("Please provide expense title and amount");
      return;
    }

    const payload = {
      ...form,
      amount: Number(form.amount)
    };

    const url = editingId ? `${API_BASE}/expenses/${editingId}` : `${API_BASE}/expenses`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Request failed");

      setForm({ title: "", amount: "", category: "Food", spentAt: today(), note: "" });
      setEditingId(null);
      setMessage(editingId ? "Expense updated" : "Expense added");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function editExpense(expense) {
    setEditingId(expense._id);
    setForm({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      spentAt: new Date(expense.spentAt).toISOString().slice(0, 10),
      note: expense.note || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id) {
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: "DELETE" });
      setMessage("Expense deleted");
      await loadData();
    } catch (error) {
      setMessage("Delete failed");
    }
  }

  async function seedDemoData() {
    try {
      const response = await fetch(`${API_BASE}/expenses/seed`, { method: "POST" });
      const json = await response.json();
      setMessage(json.message || "Demo data seeded");
      await loadData();
    } catch (error) {
      setMessage("Seed failed");
    }
  }

  function exportCSV() {
    const rows = [["Title", "Amount", "Category", "Date", "Note"]].concat(
      expenses.map((expense) => [
        expense.title,
        expense.amount,
        expense.category,
        formatDate(expense.spentAt),
        expense.note || ""
      ])
    );
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const maxCategoryTotal = Math.max(...summary.byCategory.map((item) => item.total), 1);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><BrainCircuit size={18} /> MERN + Docker Compose Lab</div>
          <h1>Monthly Expense Tracker</h1>
          <p>
            A classroom-ready MERN application using React, Express, MongoDB, and Docker Compose.
          </p>
          <div className="hero-actions">
            <button onClick={seedDemoData} className="btn primary"><Sparkles size={18} /> Seed Demo Data</button>
            <button onClick={loadData} className="btn ghost"><RefreshCcw size={18} /> Refresh</button>
          </div>
        </div>
        <div className="architecture-card">
          <div><Server /> React + NGINX</div>
          <span />
          <div><Activity /> Express API</div>
          <span />
          <div><Database /> MongoDB</div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <DollarSign />
          <div><span>Total Spend</span><strong>{formatCurrency(summary.total)}</strong></div>
        </div>
        <div className="stat-card">
          <WalletCards />
          <div><span>Transactions</span><strong>{summary.count}</strong></div>
        </div>
        <div className="stat-card">
          <CheckCircle2 />
          <div><span>Status</span><strong>{loading ? "Loading..." : "Running"}</strong></div>
        </div>
      </section>

      <section className="workspace">
        <form className="expense-form glass" onSubmit={handleSubmit}>
          <h2>{editingId ? "Update Expense" : "Add New Expense"}</h2>
          <label>Title<input name="title" value={form.title} onChange={updateForm} placeholder="e.g. EC2 lab cost" /></label>
          <label>Amount<input name="amount" value={form.amount} onChange={updateForm} type="number" min="0" step="0.01" placeholder="25" /></label>
          <label>Category
            <select name="category" value={form.category} onChange={updateForm}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select>
          </label>
          <label>Date<input name="spentAt" value={form.spentAt} onChange={updateForm} type="date" /></label>
          <label className="full">Note<textarea name="note" value={form.note} onChange={updateForm} placeholder="Optional note" /></label>
          <button className="btn primary full" type="submit"><Plus size={18} /> {editingId ? "Save Changes" : "Add Expense"}</button>
          {editingId && <button className="btn ghost full" type="button" onClick={() => setEditingId(null)}>Cancel Edit</button>}
        </form>

        <div className="list-panel glass">
          <div className="panel-header">
            <div>
              <h2>Expenses</h2>
              <p>{message}</p>
            </div>
            <button className="btn ghost" onClick={exportCSV}><Download size={18} /> CSV</button>
          </div>

          <div className="filters">
            <div className="search-box"><Search size={16} /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search title" /></div>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option>All</option>{categories.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>

          <div className="expense-list">
            {expenses.length === 0 && <div className="empty-state">No expenses found. Add one or seed demo data.</div>}
            {expenses.map((expense) => (
              <article className="expense-row" key={expense._id}>
                <div className="expense-main">
                  <span className="category-chip">{expense.category}</span>
                  <h3>{expense.title}</h3>
                  <p><CalendarDays size={14} /> {formatDate(expense.spentAt)} {expense.note ? `• ${expense.note}` : ""}</p>
                </div>
                <strong>{formatCurrency(expense.amount)}</strong>
                <div className="row-actions">
                  <button onClick={() => editExpense(expense)}><Edit3 size={16} /></button>
                  <button onClick={() => deleteExpense(expense._id)}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="category-panel glass">
        <h2>Category Breakdown</h2>
        <div className="bars">
          {summary.byCategory.length === 0 && <p>No category data yet.</p>}
          {summary.byCategory.map((item) => (
            <div className="bar-row" key={item._id}>
              <span>{item._id}</span>
              <div className="bar-track"><div style={{ width: `${(item.total / maxCategoryTotal) * 100}%` }} /></div>
              <strong>{formatCurrency(item.total)}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
