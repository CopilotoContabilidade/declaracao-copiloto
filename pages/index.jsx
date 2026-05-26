import { useState } from "react";
import { TIMBRADO } from "../lib/timbrado";

const G = "#472d54";
const GR = "#303030";
const GOLD = "#c17f3e";
const CNPJ_COPILOTO = "40.338.949/0001-10";
const RAZAO_COPILOTO = "COPILOTO CONTABILIDADE LTDA";
const A4_WIDTH = 720;
const A4_HEIGHT = Math.round(A4_WIDTH * (297 / 210));

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(v) || 0
  );

const hoje = () =>
  new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("upload");
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [months, setMonths] = useState([]);
  const [editingMonths, setEditingMonths] = useState(false);

  const toBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const generate = async () => {
    if (!pdfFile) { setError("Selecione o PDF do extrato."); return; }
    setLoading(true);
    setError("");
    try {
      const b64 = await toBase64(pdfFile);
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
              { type: "text", text: `Este é um extrato PGDAS-D do Simples Nacional. Extraia os dados de faturamento.

Retorne SOMENTE um JSON válido, sem texto antes ou depois, sem markdown:
{
  "clientName": "razão social completa do contribuinte",
  "cnpj": "CNPJ formatado XX.XXX.XXX/XXXX-XX",
  "months": [
    {"period": "Outubro/2024", "value": 32581.40}
  ]
}

Regras de extração dos 12 meses:
- O mês MAIS RECENTE é o Período de Apuração (PA) indicado no topo, com valor = "Receita Bruta do PA (RPA) - Competência" (Mercado Interno + Mercado Externo)
- Os 11 meses ANTERIORES vêm da seção "2.2) Receitas Brutas Anteriores", pegando os 11 meses imediatamente anteriores ao PA
- Ordene do mais antigo para o mais recente. O mês do PA é o ÚLTIMO da lista
- Períodos em português: "Janeiro/2024", "Outubro/2024" etc.
- Values como float, sem R$ ou pontuação de milhar (use ponto como decimal)
- Use o CNPJ completo do estabelecimento (com complemento) se disponível` }
            ]
          }]
        })
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message);
      const raw = d.content?.map((c) => c.text || "").join("") || "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setClientName(parsed.clientName || "");
      setCnpj(parsed.cnpj || "");
      setMonths(parsed.months || []);
      setStep("preview");
    } catch (e) {
      setError("Não foi possível processar o extrato. " + e.message);
    }
    setLoading(false);
  };

  const updateMonth = (i, val) => {
    const upd = [...months];
    upd[i] = { ...upd[i], value: parseFloat(val) || 0 };
    setMonths(upd);
  };

  const total = months.reduce((s, m) => s + (parseFloat(m.value) || 0), 0);
  const dataHoje = hoje();

  if (step === "upload") {
    return (
      <div style={{ fontFamily: "Montserrat,'Segoe UI',system-ui,sans-serif", background: "linear-gradient(150deg,#38204a 0%,#5c3a70 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } input[type=file]{display:none} .flabel:hover{border-color:#472d54!important;background:#f7f3fb!important} .gbtn:hover:not(:disabled){filter:brightness(1.12)}`}</style>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "Optima,Candara,serif", color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: ".06em" }}>Copiloto Contabilidade</div>
          <div style={{ height: 1.5, background: GOLD, width: 72, margin: "10px auto 10px", borderRadius: 2 }} />
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase" }}>Declaração de Faturamento</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <div style={{ height: 4, background: G }} />
          <div style={{ height: 1.5, background: GOLD }} />
          <div style={{ padding: "26px 28px 30px" }}>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.75, marginBottom: 22, marginTop: 0 }}>
              Suba o extrato do Simples Nacional (PGDAS-D) em PDF. O nome, CNPJ e os últimos 12 meses são extraídos automaticamente.
            </p>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: G, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 7 }}>Extrato do Simples Nacional (PDF)</div>
              <label className="flabel" style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", border: `1.5px dashed ${pdfFile ? GOLD : "#ccc"}`, borderRadius: 10, cursor: "pointer", background: pdfFile ? "#fffbf2" : "#fafafa", transition: "all .15s" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                <span style={{ fontSize: 13, color: pdfFile ? GOLD : "#aaa", fontWeight: pdfFile ? 600 : 400 }}>{pdfFile ? `${pdfFile.name} ✓` : "Selecionar arquivo PDF"}</span>
                <input type="file" accept=".pdf" onChange={(e) => { setPdfFile(e.target.files[0]); setError(""); }} />
              </label>
            </div>

            {error && <div style={{ background: "#fff0f2", border: "1px solid #f5c0c8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#a03040", marginBottom: 16, lineHeight: 1.6 }}>{error}</div>}

            <button className="gbtn" onClick={generate} disabled={loading || !pdfFile} style={{ width: "100%", padding: "14px", background: loading || !pdfFile ? "#c4b8d0" : G, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: loading || !pdfFile ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: ".05em", transition: "filter .15s" }}>
              {loading ? "⏳  Lendo o extrato com IA…" : "Gerar Declaração →"}
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "#ccc", marginTop: 12, marginBottom: 0 }}>O PDF é processado pela IA e não é armazenado.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Montserrat,'Segoe UI',system-ui,sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          .np { display: none !important; }
          html, body { margin: 0; padding: 0; background: white; }
          .doc-wrap { padding: 0 !important; background: white !important; }
          .doc {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        .ei { padding: 6px 9px; border: 1.5px solid #c8b4d8; border-radius: 6px; font-size: 12px; font-family: inherit; outline: none; color: #303030; width: 100%; background: #fff; }
        .ei:focus { border-color: #472d54; }
        .cb { padding: 8px 18px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; border: none; transition: filter .15s; }
        .cb:hover { filter: brightness(1.1); }
        tr.dr:nth-child(even) td { background: rgba(255,255,255,.55); }
        tr.dr:nth-child(odd) td { background: rgba(255,255,255,.25); }
      `}</style>

      <div className="np" style={{ background: G, padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: "Optima,Candara,serif", color: "#fff", fontSize: 14, fontWeight: 700 }}>Copiloto — Declaração de Faturamento</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="cb" onClick={() => setStep("upload")} style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>← Nova</button>
          <button className="cb" onClick={() => window.print()} style={{ background: GOLD, color: "#fff" }}>🖨 Imprimir / PDF</button>
        </div>
      </div>

      <div className="np" style={{ background: "#f3eef9", borderBottom: "1px solid #ddd0ea", padding: "14px 22px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: G, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Revisar dados extraídos</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ flex: "2 1 200px" }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Razão social</div>
              <input className="ei" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 170px" }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>CNPJ</div>
              <input className="ei" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
          </div>
          <button onClick={() => setEditingMonths(!editingMonths)} style={{ background: "transparent", border: "1px solid rgba(71,45,84,.4)", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: G, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            {editingMonths ? "▲ Fechar valores" : "▼ Editar valores mensais"}
          </button>
          {editingMonths && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {months.map((m, i) => (
                <div key={i} style={{ flex: "0 0 128px" }}>
                  <div style={{ fontSize: 9, color: "#888", marginBottom: 3 }}>{m.period}</div>
                  <input className="ei" type="number" step="0.01" value={m.value} onChange={(e) => updateMonth(i, e.target.value)} style={{ fontSize: 11 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="doc-wrap" style={{ background: "#ddd5e8", padding: "36px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          className="doc"
          style={{
            width: A4_WIDTH + "px",
            height: A4_HEIGHT + "px",
            maxWidth: "100%",
            backgroundImage: `url("data:image/jpeg;base64,${TIMBRADO}")`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
            borderRadius: 3,
            boxShadow: "0 12px 56px rgba(71,45,84,.3)",
            overflow: "hidden",
            paddingTop: Math.round(A4_HEIGHT * 0.195) + "px",
            paddingBottom: Math.round(A4_HEIGHT * 0.165) + "px",
            paddingLeft: Math.round(A4_WIDTH * 0.083) + "px",
            paddingRight: Math.round(A4_WIDTH * 0.083) + "px",
          }}
        >
          <p style={{ fontSize: 12.5, color: GR, lineHeight: 1.85, textAlign: "justify", fontFamily: "Montserrat,'Segoe UI',system-ui,sans-serif", margin: "0 0 16px" }}>
            Declaramos, para os devidos fins, que o faturamento da empresa{" "}
            <strong>{clientName || "[Razão Social]"}</strong>, inscrita no CNPJ{" "}
            <strong>{cnpj || "[CNPJ]"}</strong>, referente aos últimos 12 (doze) meses, foi o seguinte:
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12, fontFamily: "Montserrat,'Segoe UI',system-ui,sans-serif" }}>
            <thead>
              <tr>
                <th style={{ background: G, padding: "8px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase" }}>Competência</th>
                <th style={{ background: G, padding: "8px 16px", textAlign: "right", color: "#fff", fontWeight: 600, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase" }}>Receita Bruta do Período</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} className="dr">
                  <td style={{ padding: "5px 16px", color: GR, borderBottom: "1px solid rgba(71,45,84,.1)", fontSize: 12 }}>{m.period}</td>
                  <td style={{ padding: "5px 16px", textAlign: "right", color: GR, fontWeight: 500, borderBottom: "1px solid rgba(71,45,84,.1)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{fmt(m.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ padding: "8px 16px", fontWeight: 700, color: G, borderTop: "2px solid rgba(71,45,84,.2)", background: "rgba(71,45,84,.07)", fontSize: 12, fontFamily: "inherit" }}>Total</td>
                <td style={{ padding: "8px 16px", textAlign: "right", fontWeight: 700, color: G, borderTop: "2px solid rgba(71,45,84,.2)", background: "rgba(71,45,84,.07)", fontVariantNumeric: "tabular-nums", fontSize: 12, fontFamily: "inherit" }}>{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ textAlign: "center", fontFamily: "Montserrat,'Segoe UI',system-ui,sans-serif" }}>
            <p style={{ fontSize: 12, color: GR, marginBottom: 24 }}>Rio de Janeiro, {dataHoje}</p>
            <div style={{ display: "inline-block", minWidth: 300 }}>
              <div style={{ height: 40 }} />
              <div style={{ height: 1, background: GR + "65", marginBottom: 8 }} />
              <div style={{ fontSize: 11.5, fontWeight: 700, color: GR, letterSpacing: ".04em" }}>{RAZAO_COPILOTO}</div>
              <div style={{ fontSize: 10.5, color: "#777", marginTop: 3 }}>CNPJ: {CNPJ_COPILOTO}</div>
            </div>
          </div>
        </div>

        <p className="np" style={{ textAlign: "center", fontSize: 11, color: "#a090b0", marginTop: 20 }}>
          Clique em "Imprimir / PDF" → Salvar como PDF. Ative "Gráficos de fundo" nas configurações de impressão.
        </p>
      </div>
    </>
  );
}

