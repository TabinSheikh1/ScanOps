import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  MdSecurity, MdReportProblem, MdInfoOutline, MdCheckCircle,
  MdSearch, MdLan, MdWarningAmber, MdHistory, MdDeleteOutline,
  MdFileDownload
} from "react-icons/md";
import { HiOutlineShieldCheck, HiOutlineShieldExclamation } from "react-icons/hi";

// Import PDF libraries
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Custom Logo Component ---
const Logo = ({ size = 50, animate = false }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L15 20V45C15 65 30 85 50 95C70 85 85 65 85 45V20L50 5Z" fill="#0F172A" stroke="cyan" strokeWidth="3" />
    <circle cx="50" cy="50" r="30" stroke="cyan" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
    <path d="M50 50L50 20C58.2843 20 65 26.7157 65 35" stroke="cyan" strokeWidth="2" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite" />
    </path>
    {animate && <circle cx="40" cy="40" r="3" fill="#ff4d4f"><animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" /></circle>}
  </svg>
);

// --- Disclaimer Modal Component ---
const DisclaimerModal = ({ onAccept }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(2, 6, 23, 0.98)", backdropFilter: "blur(12px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
      padding: "20px"
    }}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      style={{
        maxWidth: "500px", background: "#0f172a", padding: "40px", borderRadius: "16px",
        border: "1px solid #1e293b", boxShadow: "0 0 50px rgba(0, 255, 255, 0.15)", textAlign: "center"
      }}
    >
      <MdReportProblem size={60} color="#ff4d4f" style={{ marginBottom: "20px" }} />
      <h2 style={{ fontSize: "1.8rem", marginBottom: "15px", color: "white", fontWeight: "800" }}>LEGAL DISCLAIMER</h2>
      <p style={{ color: "#94a3b8", lineHeight: "1.6", fontSize: "0.95rem", marginBottom: "30px" }}>
        This tool, <strong style={{ color: 'cyan' }}>ScanOps</strong>, is designed for
        <strong> educational purposes and authorized security auditing only</strong>.
        Scanning networks without explicit permission is illegal in many jurisdictions.
        By clicking below, you agree that you are responsible for your own actions and
        the developer assumes no liability for misuse.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={onAccept}
          style={{
            background: "cyan", color: "#020617", padding: "14px", borderRadius: "8px",
            border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "1rem",
            textTransform: "uppercase", letterSpacing: "1px"
          }}
        >
          I Understand & Agree
        </button>
        <button
          onClick={() => window.location.href = "https://google.com"}
          style={{
            background: "transparent", color: "#64748b", padding: "10px",
            border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline"
          }}
        >
          Exit Application
        </button>
      </div>
    </motion.div>
  </motion.div>
);

function App() {
  const [target, setTarget] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    // Check if user already agreed in previous session
    const agreement = localStorage.getItem("scanops_agreement");
    if (agreement === "true") setHasAgreed(true);

    const savedHistory = JSON.parse(localStorage.getItem("scan_history") || "[]");
    setHistory(savedHistory);
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("scanops_agreement", "true");
    setHasAgreed(true);
  };

  // --- PDF Export Logic ---
  const exportToPDF = () => {
    if (results.length === 0) return;
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    doc.setFontSize(23);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("ScanOps Security Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Target: ${target}`, 14, 30);
    doc.text(`Generated: ${timestamp}`, 14, 35);

    const tableRows = results.map(item => [
      item.port,
      item.service,
      item.risk,
      item.state || 'open'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Port', 'Service', 'Risk Level', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      didParseCell: function (data) {
        if (data.column.index === 2 && data.cell.section === 'body') {
          const val = data.cell.raw;
          if (val === 'Critical') data.cell.styles.textColor = [255, 77, 79];
          if (val === 'High') data.cell.styles.textColor = [250, 140, 22];
        }
      }
    });

    doc.save(`ScanOps_Report_${target}.pdf`);
  };

  const handleScan = async () => {
    if (!target) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("http://127.0.0.1:5000/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      setResults(data);

      const newHistoryItem = {
        id: Date.now(),
        target: target,
        timestamp: new Date().toLocaleString(),
        count: data.length,
        data: data
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem("scan_history", JSON.stringify(updatedHistory));

    } catch (err) {
      console.error("Scan Failed:", err);
    }
    setLoading(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("scan_history");
  };

  const loadFromHistory = (item) => {
    setTarget(item.target);
    setResults(item.data);
  };

  const getColor = (risk) => {
    const colors = { Critical: "#ff4d4f", High: "#fa8c16", Medium: "#fadb14" };
    return colors[risk] || "#52c41a";
  };

  const summary = {
    total: results.length,
    critical: results.filter(r => r.risk === "Critical").length,
    high: results.filter(r => r.risk === "High").length,
    medium: results.filter(r => r.risk === "Medium").length,
    low: results.filter(r => r.risk === "Low").length
  };

  const chartData = [
    { name: "Critical", value: summary.critical },
    { name: "High", value: summary.high },
    { name: "Medium", value: summary.medium },
    { name: "Low", value: summary.low }
  ].filter(d => d.value > 0);

  return (
    <>
      <AnimatePresence>
        {!hasAgreed && <DisclaimerModal onAccept={handleAcceptDisclaimer} />}
      </AnimatePresence>

      <div style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "40px",
        fontFamily: "Segoe UI, sans-serif",
        display: hasAgreed ? "flex" : "none", // Hide main content if not agreed
        gap: "30px"
      }}>

        {/* LEFT SIDEBAR: HISTORY */}
        <div style={{ width: "300px", borderRight: "1px solid #1e293b", paddingRight: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}><MdHistory /> History</h3>
            <button onClick={clearHistory} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><MdDeleteOutline size={20} /></button>
          </div>
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => loadFromHistory(item)}
              style={{
                background: "#0f172a", padding: "12px", borderRadius: "8px", marginBottom: "10px",
                cursor: "pointer", border: "1px solid #1e293b", fontSize: "0.85rem", transition: "0.2s"
              }}
            >
              <div style={{ fontWeight: "bold", color: "cyan" }}>{item.target}</div>
              <div style={{ opacity: 0.5, fontSize: "0.75rem" }}>{item.timestamp}</div>
              <div style={{ marginTop: "5px", fontSize: "0.7rem" }}>{item.count} Ports Found</div>
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <Logo size={60} animate={loading} />
              <h1 style={{ fontSize: "2.8rem", margin: 0, fontWeight: "800", letterSpacing: "-1.5px" }}>
                Scan<span style={{ color: "cyan", fontWeight: "300" }}>Ops</span> 
              </h1>
            </div>

            {/* EXPORT BUTTON */}
            {results.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={exportToPDF}
                style={{
                  background: "transparent",
                  border: "1px solid cyan",
                  color: "cyan",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "bold"
                }}
              >
                <MdFileDownload size={20} /> EXPORT PDF
              </motion.button>
            )}
          </header>

          {/* SCAN INPUT */}
          <div style={{ background: "#0f172a", padding: "20px", borderRadius: "12px", display: "flex", gap: "10px", marginBottom: "30px", border: "1px solid #1e293b" }}>
            <MdLan size={24} color="cyan" />
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target IP / Domain"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white" }}
            />
            <button onClick={handleScan} disabled={loading} style={{ background: "cyan", color: "black", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
              {loading ? "..." : "SCAN"}
            </button>
          </div>

          {/* DASHBOARD GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "30px" }}>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", marginBottom: "30px" }}>
                <div style={{ background: "#0f172a", padding: "15px", borderRadius: "10px", textAlign: "center", border: "1px solid #1e293b" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{summary.total}</div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>TOTAL PORTS</div>
                </div>
                <div style={{ background: "#0f172a", padding: "15px", borderRadius: "10px", textAlign: "center", border: "1px solid #1e293b", borderBottom: "3px solid #ff4d4f" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#ff4d4f" }}>{summary.critical}</div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>CRITICAL</div>
                </div>
              </div>

              <h3 style={{ marginBottom: "15px" }}>Live Reports</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {results.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "#0f172a", padding: "15px", borderRadius: "8px", borderLeft: `4px solid ${getColor(item.risk)}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Port <strong>{item.port}</strong> — {item.service}</span>
                      <span style={{ color: getColor(item.risk), fontSize: "0.8rem", fontWeight: "bold" }}>{item.risk}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CHART */}
            <div style={{ background: "#0f172a", padding: "20px", borderRadius: "12px", border: "1px solid #1e293b", height: "fit-content" }}>
              <h4 style={{ textAlign: "center", marginBottom: "15px" }}>Risk Spread</h4>
              <div style={{ height: "250px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                      {chartData.map((entry, index) => <Cell key={index} fill={getColor(entry.name)} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#020617", border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;