function exportCsvLegacySimpleA() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const companyLines = companyDetailLines();
  const headers = ["Numero", "RUC", "Proveedor", "Fecha de emision", "Subtotal", "IGV", "Total", "Estado"];
  const rows = list.map((invoice) => [
    invoice.number,
    invoice.ruc,
    invoice.provider,
    invoice.date,
    invoice.subtotal,
    invoice.igv,
    invoice.total,
    invoice.status
  ]);

  const table = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; }
          .title { margin: 0 0 14px; font-size: 18px; font-weight: 700; color: #1f2937; }
          .company { margin: 0 0 6px; color: #1f2937; font-size: 14px; font-weight: 700; }
          .details { margin: 0 0 10px; color: #4b5563; font-size: 12px; }
          .meta { margin: 0 0 18px; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #243b67; color: #ffffff; font-weight: 700; text-align: left; }
          th, td { border: 1px solid #b8c2d4; padding: 9px; }
          tbody tr:nth-child(even) td { background: #f3f6fb; }
          tbody tr:last-child td { border-bottom: 2px solid #243b67; }
          .num { mso-number-format:"0.00"; text-align: right; }
        </style>
      </head>
      <body>
        <h1 class="title">Reporte de facturas</h1>
        <p class="company">${escapeHtml(company.name)}</p>
        <p class="details">${companyLines.map(escapeHtml).join(" | ")}</p>
        <p class="meta">Generado: ${new Date().toLocaleString("es-PE")} | Periodo: ${escapeHtml(reportRangeLabel())}</p>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${row.map((cell, index) => `<td class="${[4, 5, 6].includes(index) ? "num" : ""}">${escapeHtml(cell ?? "")}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_facturas_${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function exportCsvLegacySimple() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const generatedLabel = new Date().toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const rows = list.map((invoice) => `
    <tr class="detail-row">
      <td>${escapeHtml(formatDate(invoice.date || ""))}</td>
      <td>${escapeHtml(invoice.number || "")}</td>
      <td>${escapeHtml(invoice.provider || "")}</td>
      <td>${escapeHtml(invoice.ruc || "")}</td>
      <td class="status-ok">${escapeHtml(invoice.status || "Pendiente")}</td>
      <td>${escapeHtml(invoice.category || "Servicios")}</td>
      <td class="money">${money(invoice.subtotal)}</td>
      <td class="money blue">${money(invoice.igv)}</td>
      <td class="money purple">${money(invoice.total)}</td>
    </tr>
  `).join("");
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";
  const currency = settings.currency || "Soles (S/)";

  const table = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #111733; }
          table.report { border-collapse: collapse; width: 100%; }
          .report td, .report th { border: 1px solid #d9deeb; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
          .blank td { border: 0; height: 12px; padding: 0; }
          .logo { border: 0 !important; color: #0a174a; font-size: 34px; font-weight: 900; letter-spacing: 2px; text-align: left; }
          .logo-sub { border: 0 !important; color: #0a174a; font-size: 8px; font-weight: 900; text-align: left; text-transform: uppercase; }
          .title { border: 0 !important; border-bottom: 2px solid #6f21d8 !important; color: #111733; font-size: 22px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .subtitle { border: 0 !important; color: #6f21d8; font-size: 13px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-head { background: #050c1f; color: #ffffff; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-value { background: #f7f8fc; color: #111733; font-size: 11px; font-weight: 700; text-align: center; }
          .label { background: #062052; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .value { background: #ffffff; color: #111733; font-size: 10px; font-weight: 700; }
          .section { background: #050c1f; color: #ffffff; font-size: 11px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-head { background: #f3f6fb; color: #27304d; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-value { background: #ffffff; color: #6232d9; font-size: 16px; font-weight: 900; text-align: center; }
          .summary-value.green { color: #008f52; }
          .summary-value.blue { color: #006edb; }
          .detail-head th { background: #062052; color: #ffffff; font-size: 9px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .detail-row td { color: #111733; font-size: 10px; text-align: center; }
          .status-ok { color: #00a651; font-weight: 900; }
          .money { mso-number-format:"\\0022S/\\0022 #,##0.00"; text-align: right; white-space: nowrap; }
          .money.blue { color: #006edb; }
          .money.purple { color: #6232d9; font-weight: 900; }
          .totals-label { background: #eaf1fb; color: #111733; font-weight: 900; text-align: center; text-transform: uppercase; }
          .totals-money { background: #eaf1fb; font-weight: 900; }
          .no-border { border: 0 !important; }
        </style>
      </head>
      <body>
        <table class="report">
          <tbody>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr>
              <td colspan="3" class="logo">KOVRA</td>
              <td colspan="3" class="title">Reporte de facturas</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-head">Fecha de generacion</td>
            </tr>
            <tr>
              <td colspan="3" class="logo-sub">Control inteligente de facturas</td>
              <td colspan="3" class="subtitle">${escapeHtml(companyName)}</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-value">${escapeHtml(generatedLabel)}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td class="label">RUC:</td><td colspan="3" class="value">${escapeHtml(companyRuc)}</td><td class="label">Reporte:</td><td colspan="4" class="value">Reporte de facturas</td></tr>
            <tr><td class="label">Direccion:</td><td colspan="3" class="value">${escapeHtml(companyAddress)}</td><td class="label">Generado por:</td><td colspan="4" class="value">${escapeHtml(reporter)}</td></tr>
            <tr><td class="label">Correo:</td><td colspan="3" class="value">${escapeHtml(companyEmail)}</td><td class="label">Moneda:</td><td colspan="4" class="value">${escapeHtml(currency)}</td></tr>
            <tr><td class="label">Periodo:</td><td colspan="8" class="value">${escapeHtml(reportRangeLabel())}</td></tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Resumen del periodo</td></tr>
            <tr><td colspan="2" class="summary-head">Total de facturas</td><td colspan="2" class="summary-head">Subtotal acumulado</td><td colspan="2" class="summary-head">IGV acumulado</td><td colspan="3" class="summary-head">Monto total</td></tr>
            <tr><td colspan="2" class="summary-value">${list.length}</td><td colspan="2" class="summary-value green">${money(subtotal)}</td><td colspan="2" class="summary-value blue">${money(igv)}</td><td colspan="3" class="summary-value">${money(total)}</td></tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Detalle de facturas</td></tr>
            <tr class="detail-head"><th>Fecha</th><th>Numero de factura</th><th>Proveedor</th><th>RUC</th><th>Estado</th><th>Categoria</th><th>Subtotal</th><th>IGV</th><th>Total</th></tr>
            ${rows || `<tr class="detail-row"><td colspan="9">No hay facturas para este reporte.</td></tr>`}
            <tr><td colspan="9">&nbsp;</td></tr>
            <tr><td colspan="9">&nbsp;</td></tr>
            <tr><td colspan="6" class="totals-label">Totales</td><td class="money totals-money">${money(subtotal)}</td><td class="money blue totals-money">${money(igv)}</td><td class="money purple totals-money">${money(total)}</td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_facturas_${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function reportRangeLabel() {
  const from = appliedReportFilters.from;
  const to = appliedReportFilters.to;
  if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
  if (from) return `Desde ${formatDate(from)}`;
  if (to) return `Hasta ${formatDate(to)}`;
  return "Todos los periodos";
}

function buildPrintableReport() {
  const list = reportInvoices();
  const company = companyProfile();
  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const rows = list.map((invoice) => `
    <tr>
      <td>${escapeHtml(formatDate(invoice.date || ""))}</td>
      <td>${escapeHtml(invoice.number || "")}</td>
      <td>${escapeHtml(invoice.provider || "")}</td>
      <td>${escapeHtml(invoice.ruc || "")}</td>
      <td><span class="status-pill">${escapeHtml(invoice.status || "Pendiente")}</span></td>
      <td class="num">${money(invoice.subtotal)}</td>
      <td class="num">${money(invoice.igv)}</td>
      <td class="num total-cell">${money(invoice.total)}</td>
    </tr>
  `).join("");
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Reporte de facturas</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #ffffff; color: #10183f; font-family: Arial, Helvetica, sans-serif; }
          .report-sheet { width: 940px; min-height: 1200px; margin: 0 auto; padding: 0 28px 26px; border: 1px solid #e7e9f2; }
          .topbar { display: grid; grid-template-columns: 310px 1fr; align-items: stretch; margin: 0 -28px 24px; min-height: 158px; }
          .brand-block { background: #050c1f; clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%); display: flex; flex-direction: column; justify-content: center; padding: 28px 72px 28px 32px; position: relative; }
          .brand-block::after { background: #7a35e8; bottom: 0; content: ""; position: absolute; right: 30px; top: 0; transform: skewX(-17deg); width: 12px; }
          .brand-logo img { display: block; height: 42px; max-width: 220px; object-fit: contain; object-position: left center; }
          .brand-subtitle { color: #ffffff; font-size: 8px; font-weight: 800; letter-spacing: .55px; margin-top: 8px; text-transform: uppercase; }
          .title-block { border-bottom: 2px solid #cfc6f9; padding: 46px 0 0 18px; }
          h1 { margin: 0; color: #111733; font-size: 30px; line-height: 1; text-transform: uppercase; }
          .company-name { margin-top: 10px; color: #7a35e8; font-size: 17px; font-weight: 900; text-transform: uppercase; }
          .info-card { border: 1px solid #e3e6ef; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 22px; padding: 18px 26px; }
          .info-column + .info-column { border-left: 1px solid #d9deeb; padding-left: 36px; }
          .info-row { display: grid; grid-template-columns: 112px 18px 1fr; align-items: baseline; min-height: 30px; }
          .info-label { color: #1c2444; display: block; font-size: 10px; font-weight: 900; }
          .info-separator { color: #1c2444; display: block; font-size: 10px; font-weight: 900; text-align: center; }
          .info-value { color: #1c2444; display: block; font-size: 10px; font-weight: 700; }
          .section-title { background: #050c1f; color: #ffffff; font-size: 11px; font-weight: 900; margin: 20px 0 0; padding: 9px 12px; text-transform: uppercase; }
          .summary { border: 1px solid #dfe3ef; border-top: 0; display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 18px; }
          .summary-card { background: #ffffff; border-right: 1px solid #dfe3ef; min-height: 156px; padding: 24px 12px 18px; text-align: center; }
          .summary-card:last-child { border-right: 0; }
          .summary-card .icon { display: none; }
          .summary-card strong { display: block; font-size: 23px; line-height: 1.1; margin: 13px 0 13px; }
          .summary-card span { color: #111733; display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .summary-card small { color: #373d5c; display: block; font-size: 10px; font-weight: 700; margin: 0 auto; max-width: 120px; min-height: 25px; }
          .summary-card small::after { background: #7a35e8; content: ""; display: block; height: 2px; margin: 12px auto 0; width: 48px; }
          .summary-card.count, .summary-card.amount, .summary-card.subtotal, .summary-card.tax { color: #6232d9; }
          .total-bar { align-items: center; border: 2px solid #d7c9ff; border-radius: 4px; color: #111733; display: flex; font-size: 14px; font-weight: 900; gap: 30px; justify-content: center; margin: 0 0 22px; padding: 14px 18px; text-align: center; text-transform: uppercase; }
          .total-bar strong { color: #6232d9; font-size: 25px; }
          .table-frame { border: 1px solid #dfe3ef; border-top: 0; min-height: 220px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #6f21d8; color: #ffffff; font-size: 9px; font-weight: 900; padding: 8px 9px; text-align: center; text-transform: uppercase; }
          td { border-bottom: 1px solid #eef0f7; border-right: 1px solid #eef0f7; color: #202957; font-weight: 700; padding: 10px 9px; text-align: center; vertical-align: top; }
          .num { text-align: right; white-space: nowrap; }
          .total-cell { color: #6650e8; font-weight: 900; }
          .status-pill { background: #2fd06f; border-radius: 999px; color: #ffffff; display: inline-block; font-size: 8px; font-weight: 900; padding: 4px 8px; text-transform: uppercase; }
          .empty-row td { color: #687098; padding: 34px 12px; text-align: center; }
          .totals-panel { border: 1px solid #dfe3ef; border-top: 0; margin-top: 0; padding: 0; }
          .totals-title { background: #050c1f; color: #ffffff; font-size: 11px; font-weight: 900; margin: 24px 0 0; padding: 9px 12px; text-transform: uppercase; }
          .totals-grid { border: 1px solid #dfe3ef; border-top: 0; display: grid; grid-template-columns: repeat(3, 1fr); }
          .total-item { min-height: 112px; padding: 23px 18px 16px; text-align: center; }
          .total-item + .total-item { border-left: 1px solid #dfe3ef; }
          .total-item .mini-icon { display: none; }
          .total-item span { color: #111733; display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .total-item strong { color: #111733; display: block; font-size: 15px; margin-top: 10px; }
          .total-item strong::after { background: #7a35e8; content: ""; display: block; height: 2px; margin: 13px auto 0; width: 44px; }
          footer { align-items: center; background: #fafafa; color: #202957; display: grid; grid-template-columns: 170px 1fr 220px; gap: 20px; font-size: 9px; font-weight: 800; margin-top: 24px; padding: 24px 16px; }
          .footer-logo { border-right: 2px solid #7a35e8; padding-right: 20px; }
          .footer-logo img { display: block; filter: brightness(0) saturate(100%) invert(8%) sepia(31%) saturate(1758%) hue-rotate(197deg) brightness(89%) contrast(99%); height: 28px; max-width: 128px; object-fit: contain; object-position: left center; }
          .footer-system { color: #6232d9; font-weight: 900; text-transform: uppercase; }
          .footer-date { border-left: 2px solid #7a35e8; padding-left: 24px; text-align: left; }
          footer small { color: #687098; display: block; font-weight: 700; margin-top: 5px; }
          @page { margin: 10mm; size: A4; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report-sheet { width: auto; min-height: auto; padding: 0; }
            .summary-card { break-inside: avoid; }
            .table-frame { min-height: 270px; }
          }
        </style>
      </head>
      <body>
        <main class="report-sheet">
          <header class="topbar">
            <section class="brand-block">
              <div class="brand-logo"><img src="assets/img/logo_sistema_letra_menu.png" alt="KOVRA" /></div>
              <div class="brand-subtitle">Sistema inteligente de facturas</div>
            </section>
            <section class="title-block">
              <h1>Reporte de facturas</h1>
              <div class="company-name">${escapeHtml(companyName)}</div>
            </section>
          </header>

          <section class="info-card">
            <div class="info-column">
              <div class="info-row"><span class="info-label">RUC</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(companyRuc)}</span></div>
              <div class="info-row"><span class="info-label">Direccion</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(companyAddress)}</span></div>
              <div class="info-row"><span class="info-label">Correo</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(companyEmail)}</span></div>
              <div class="info-row"><span class="info-label">Periodo</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(reportRangeLabel())}</span></div>
            </div>
            <div class="info-column">
              <div class="info-row"><span class="info-label">Generado</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(generatedLabel)}</span></div>
              <div class="info-row"><span class="info-label">Reporte</span><span class="info-separator">:</span><span class="info-value">Reporte de facturas</span></div>
              <div class="info-row"><span class="info-label">Generado por</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(reporter)}</span></div>
              <div class="info-row"><span class="info-label">Moneda</span><span class="info-separator">:</span><span class="info-value">${escapeHtml(settings.currency || "Soles (S/)")}</span></div>
            </div>
          </section>

          <div class="section-title">01. Resumen del periodo</div>
          <section class="summary">
            <article class="summary-card count"><div class="icon"><img src="assets/img/Facturas.svg" alt="" /></div><strong>${list.length}</strong><span>${list.length === 1 ? "Factura" : "Facturas"}</span><small>registrada${list.length === 1 ? "" : "s"}</small></article>
            <article class="summary-card amount"><div class="icon"><img src="assets/img/monto_total.png" alt="" /></div><strong>${money(total)}</strong><span>Monto total</span></article>
            <article class="summary-card subtotal"><div class="icon"><img src="assets/img/total_factura.png" alt="" /></div><strong>${money(subtotal)}</strong><span>Subtotal</span></article>
            <article class="summary-card tax"><div class="icon"><img src="assets/img/igv_total.png" alt="" /></div><strong>${money(igv)}</strong><span>IGV</span></article>
          </section>
          <div class="total-bar"><span>Total general</span><strong>${money(total)}</strong></div>

          <div class="section-title">02. Detalle de facturas</div>
          <section class="table-frame">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Numero</th>
                  <th>Proveedor</th>
                  <th>RUC</th>
                  <th>Estado</th>
                  <th class="num">Subtotal</th>
                  <th class="num">IGV</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr class="empty-row"><td colspan="8">No hay facturas para este reporte.</td></tr>`}</tbody>
            </table>
          </section>

          <div class="totals-title">03. Totales del reporte</div>
          <section class="totals-panel">
            <div class="totals-grid">
              <div class="total-item"><span class="mini-icon"><img src="assets/img/Facturas.svg" alt="" /></span><div><span>N. de facturas</span><strong>${list.length}</strong></div></div>
              <div class="total-item"><span class="mini-icon"><img src="assets/img/monto_total.png" alt="" /></span><div><span>Monto total</span><strong>${money(total)}</strong></div></div>
              <div class="total-item"><span class="mini-icon"><img src="assets/img/este_mes.png" alt="" /></span><div><span>Periodo</span><strong>${escapeHtml(reportRangeLabel())}</strong></div></div>
            </div>
          </section>

          <footer>
            <div class="footer-logo"><img src="assets/img/logo_sistema_letra_menu.png" alt="KOVRA" /></div>
            <div><span class="footer-system">Sistema KOVRA</span><small>Control Inteligente de Facturas<br />Reporte generado automaticamente por el sistema.</small></div>
            <div class="footer-date"><span class="footer-system">Fecha de generacion</span><small>${escapeHtml(generatedLabel)}</small></div>
          </footer>
        </main>
      </body>
    </html>
  `;
}

function printReport() {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildPrintableReport());
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function pdfEscape(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfText(value, maxLength) {
  const words = String(value || "").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function buildPdfDocument() {
  const list = reportInvoices();
  const company = companyProfile();
  const companyLines = companyDetailLines();
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const pages = [];
  let commands = [];
  let y = 800;

  const addText = (x, text, size = 9) => {
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`);
  };
  const addTextAt = (x, text, atY, size = 9) => {
    commands.push(`BT /F1 ${size} Tf ${x} ${atY} Td (${pdfEscape(text)}) Tj ET`);
  };
  const addLine = (x1, y1, x2, y2) => {
    commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const newPage = () => {
    pages.push(commands.join("\n"));
    commands = [];
    y = 800;
  };
  const header = () => {
    addText(40, `${company.name} - Reporte de facturas`, 15);
    y -= 18;
    companyLines.slice(0, 3).forEach((line) => {
      addText(40, line, 9);
      y -= 12;
    });
    addText(40, `Periodo: ${reportRangeLabel()}`, 10);
    y -= 14;
    addText(40, `Generado: ${new Date().toLocaleString("es-PE")}`, 9);
    y -= 18;
    addText(40, `Facturas: ${list.length}   Subtotal: ${money(subtotal)}   IGV: ${money(igv)}   Total: ${money(total)}`, 9);
    y -= 18;
    addLine(40, y, 555, y);
    y -= 16;
    const headerTop = y + 10;
    const headerTextY = y;
    const headerBottom = y - 10;
    addLine(40, headerTop, 555, headerTop);
    addTextAt(40, "Fecha", headerTextY, 8);
    addTextAt(95, "Numero", headerTextY, 8);
    addTextAt(165, "Proveedor", headerTextY, 8);
    addTextAt(320, "RUC", headerTextY, 8);
    addTextAt(385, "Estado", headerTextY, 8);
    addTextAt(455, "Total", headerTextY, 8);
    addLine(40, headerBottom, 555, headerBottom);
    y = headerBottom - 16;
  };

  header();
  const rows = list.length ? list : [{ date: "", number: "", provider: "No hay facturas para este reporte.", ruc: "", status: "", total: 0 }];
  rows.forEach((invoice) => {
    if (y < 70) {
      newPage();
      header();
    }
    const providerLines = wrapPdfText(invoice.provider || "", 28);
    const visibleProviderLines = providerLines.slice(0, 3);
    const rowHeight = Math.max(24, 14 + (visibleProviderLines.length * 11));
    const rowTop = y + 8;
    const firstTextY = y;
    const rowBottom = rowTop - rowHeight;
    addLine(40, rowTop, 555, rowTop);
    addTextAt(40, formatDate(invoice.date || ""), firstTextY, 8);
    addTextAt(95, invoice.number || "", firstTextY, 8);
    addTextAt(320, invoice.ruc || "", firstTextY, 8);
    addTextAt(385, invoice.status || "", firstTextY, 8);
    addTextAt(455, money(invoice.total || 0), firstTextY, 8);
    visibleProviderLines.forEach((line, index) => {
      addTextAt(165, line, firstTextY - (index * 11), 8);
    });
    addLine(40, rowBottom, 555, rowBottom);
    y = rowBottom - 12;
  });
  pages.push(commands.join("\n"));

  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  pages.forEach((content, index) => {
    const contentObject = 5 + index * 2;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function exportPrintablePdf() {
  printReport();
}

function exportCsvLegacySimpleFirst() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";
  const currency = settings.currency || "Soles (S/)";
  const detailRows = list.map((invoice) => `
    <tr class="detail-row">
      <td>${escapeHtml(formatDate(invoice.date || ""))}</td>
      <td>${escapeHtml(invoice.number || "")}</td>
      <td>${escapeHtml(invoice.provider || "")}</td>
      <td>${escapeHtml(invoice.ruc || "")}</td>
      <td class="status-ok">${escapeHtml(invoice.status || "Pendiente")}</td>
      <td>${escapeHtml(invoice.category || "Servicios")}</td>
      <td class="money">${money(invoice.subtotal)}</td>
      <td class="money">${money(invoice.igv)}</td>
      <td class="money total-money">${money(invoice.total)}</td>
    </tr>
  `).join("");

  const table = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Resumen</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #111733; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #d9deeb; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
          .blank td { border: 0; height: 12px; padding: 0; }
          .logo { border: 0; color: #0a174a; font-size: 34px; font-weight: 900; letter-spacing: 2px; text-align: left; }
          .logo-sub { border: 0; color: #0a174a; font-size: 8px; font-weight: 900; text-align: left; text-transform: uppercase; }
          .title { border: 0; border-bottom: 2px solid #6f21d8; color: #111733; font-size: 22px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .subtitle { border: 0; color: #6f21d8; font-size: 13px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-head { background: #050c1f; color: #ffffff; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-value { background: #f7f8fc; color: #111733; font-size: 11px; font-weight: 700; text-align: center; }
          .label { background: #062052; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .value { background: #ffffff; color: #111733; font-size: 10px; font-weight: 700; }
          .section { background: #050c1f; color: #ffffff; font-size: 11px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-head { background: #f3f6fb; color: #27304d; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-value { background: #ffffff; color: #6232d9; font-size: 16px; font-weight: 900; text-align: center; }
          .summary-value.green { color: #008f52; }
          .summary-value.blue { color: #006edb; }
          .detail-head th { background: #062052; color: #ffffff; font-size: 9px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .detail-row td { color: #111733; font-size: 10px; text-align: center; }
          .status-ok { color: #00a651; font-weight: 900; }
          .money { mso-number-format:"\\0022S/\\0022 #,##0.00"; text-align: right; white-space: nowrap; }
          .total-money { color: #6232d9; font-weight: 900; }
          .totals-label { background: #eaf1fb; color: #111733; font-weight: 900; text-align: center; text-transform: uppercase; }
          .totals-money { background: #eaf1fb; font-weight: 900; }
          .no-border { border: 0; }
        </style>
      </head>
      <body>
        <table>
          <tbody>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr>
              <td colspan="3" class="logo">KOVRA</td>
              <td colspan="3" class="title">Reporte de facturas</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-head">Fecha de generacion</td>
            </tr>
            <tr>
              <td colspan="3" class="logo-sub">Control inteligente de facturas</td>
              <td colspan="3" class="subtitle">${escapeHtml(companyName)}</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-value">${escapeHtml(generatedLabel)}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr>
              <td class="label">RUC:</td>
              <td colspan="3" class="value">${escapeHtml(companyRuc)}</td>
              <td class="label">Reporte:</td>
              <td colspan="4" class="value">Reporte de facturas</td>
            </tr>
            <tr>
              <td class="label">Direccion:</td>
              <td colspan="3" class="value">${escapeHtml(companyAddress)}</td>
              <td class="label">Generado por:</td>
              <td colspan="4" class="value">${escapeHtml(reporter)}</td>
            </tr>
            <tr>
              <td class="label">Correo:</td>
              <td colspan="3" class="value">${escapeHtml(companyEmail)}</td>
              <td class="label">Moneda:</td>
              <td colspan="4" class="value">${escapeHtml(currency)}</td>
            </tr>
            <tr>
              <td class="label">Periodo:</td>
              <td colspan="8" class="value">${escapeHtml(reportRangeLabel())}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Resumen del periodo</td></tr>
            <tr>
              <td colspan="2" class="summary-head">Total de facturas</td>
              <td colspan="2" class="summary-head">Subtotal acumulado</td>
              <td colspan="2" class="summary-head">IGV acumulado</td>
              <td colspan="3" class="summary-head">Monto total</td>
            </tr>
            <tr>
              <td colspan="2" class="summary-value">${list.length}</td>
              <td colspan="2" class="summary-value green">${money(subtotal)}</td>
              <td colspan="2" class="summary-value blue">${money(igv)}</td>
              <td colspan="3" class="summary-value">${money(total)}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Detalle de facturas</td></tr>
            <tr class="detail-head">
              <th>Fecha</th>
              <th>Numero de factura</th>
              <th>Proveedor</th>
              <th>RUC</th>
              <th>Estado</th>
              <th>Categoria</th>
              <th>Subtotal</th>
              <th>IGV</th>
              <th>Total</th>
            </tr>
            ${detailRows || `<tr class="detail-row"><td colspan="9">No hay facturas para este reporte.</td></tr>`}
            <tr>
              <td colspan="6" class="totals-label">Totales</td>
              <td class="money totals-money">${money(subtotal)}</td>
              <td class="money totals-money">${money(igv)}</td>
              <td class="money totals-money total-money">${money(total)}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_facturas_${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function exportCsvLegacyDesignedB() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";
  const currency = settings.currency || "Soles (S/)";
  const rows = list.map((invoice) => `
    <tr class="detail-row">
      <td>${escapeHtml(formatDate(invoice.date || ""))}</td>
      <td>${escapeHtml(invoice.number || "")}</td>
      <td>${escapeHtml(invoice.provider || "")}</td>
      <td>${escapeHtml(invoice.ruc || "")}</td>
      <td class="status-ok">${escapeHtml(invoice.status || "Pendiente")}</td>
      <td>${escapeHtml(invoice.category || "Servicios")}</td>
      <td class="money">${money(invoice.subtotal)}</td>
      <td class="money blue">${money(invoice.igv)}</td>
      <td class="money purple">${money(invoice.total)}</td>
    </tr>
  `).join("");

  const table = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #111733; }
          table.report { border-collapse: collapse; width: 100%; }
          .report td, .report th { border: 1px solid #d9deeb; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
          .blank td { border: 0; height: 12px; padding: 0; }
          .logo { border: 0 !important; color: #0a174a; font-size: 34px; font-weight: 900; letter-spacing: 2px; text-align: left; }
          .logo-sub { border: 0 !important; color: #0a174a; font-size: 8px; font-weight: 900; text-align: left; text-transform: uppercase; }
          .title { border: 0 !important; border-bottom: 2px solid #6f21d8 !important; color: #111733; font-size: 22px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .subtitle { border: 0 !important; color: #6f21d8; font-size: 13px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-head { background: #050c1f; color: #ffffff; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-value { background: #f7f8fc; color: #111733; font-size: 11px; font-weight: 700; text-align: center; }
          .label { background: #062052; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .value { background: #ffffff; color: #111733; font-size: 10px; font-weight: 700; }
          .section { background: #050c1f; color: #ffffff; font-size: 11px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-head { background: #f3f6fb; color: #27304d; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-value { background: #ffffff; color: #6232d9; font-size: 16px; font-weight: 900; text-align: center; }
          .summary-value.green { color: #008f52; }
          .summary-value.blue { color: #006edb; }
          .detail-head th { background: #062052; color: #ffffff; font-size: 9px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .detail-row td { color: #111733; font-size: 10px; text-align: center; }
          .status-ok { color: #00a651; font-weight: 900; }
          .money { mso-number-format:"\\0022S/\\0022 #,##0.00"; text-align: right; white-space: nowrap; }
          .money.blue { color: #006edb; }
          .money.purple { color: #6232d9; font-weight: 900; }
          .totals-label { background: #eaf1fb; color: #111733; font-weight: 900; text-align: center; text-transform: uppercase; }
          .totals-money { background: #eaf1fb; font-weight: 900; }
          .no-border { border: 0 !important; }
        </style>
      </head>
      <body>
        <table class="report">
          <tbody>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr>
              <td colspan="3" class="logo">KOVRA</td>
              <td colspan="3" class="title">Reporte de facturas</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-head">Fecha de generacion</td>
            </tr>
            <tr>
              <td colspan="3" class="logo-sub">Control inteligente de facturas</td>
              <td colspan="3" class="subtitle">${escapeHtml(companyName)}</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-value">${escapeHtml(generatedLabel)}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr>
              <td class="label">RUC:</td>
              <td colspan="3" class="value">${escapeHtml(companyRuc)}</td>
              <td class="label">Reporte:</td>
              <td colspan="4" class="value">Reporte de facturas</td>
            </tr>
            <tr>
              <td class="label">Direccion:</td>
              <td colspan="3" class="value">${escapeHtml(companyAddress)}</td>
              <td class="label">Generado por:</td>
              <td colspan="4" class="value">${escapeHtml(reporter)}</td>
            </tr>
            <tr>
              <td class="label">Correo:</td>
              <td colspan="3" class="value">${escapeHtml(companyEmail)}</td>
              <td class="label">Moneda:</td>
              <td colspan="4" class="value">${escapeHtml(currency)}</td>
            </tr>
            <tr>
              <td class="label">Periodo:</td>
              <td colspan="8" class="value">${escapeHtml(reportRangeLabel())}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Resumen del periodo</td></tr>
            <tr>
              <td colspan="2" class="summary-head">Total de facturas</td>
              <td colspan="2" class="summary-head">Subtotal acumulado</td>
              <td colspan="2" class="summary-head">IGV acumulado</td>
              <td colspan="3" class="summary-head">Monto total</td>
            </tr>
            <tr>
              <td colspan="2" class="summary-value">${list.length}</td>
              <td colspan="2" class="summary-value green">${money(subtotal)}</td>
              <td colspan="2" class="summary-value blue">${money(igv)}</td>
              <td colspan="3" class="summary-value">${money(total)}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Detalle de facturas</td></tr>
            <tr class="detail-head">
              <th>Fecha</th>
              <th>Numero de factura</th>
              <th>Proveedor</th>
              <th>RUC</th>
              <th>Estado</th>
              <th>Categoria</th>
              <th>Subtotal</th>
              <th>IGV</th>
              <th>Total</th>
            </tr>
            ${rows || `<tr class="detail-row"><td colspan="9">No hay facturas para este reporte.</td></tr>`}
            <tr><td colspan="9">&nbsp;</td></tr>
            <tr><td colspan="9">&nbsp;</td></tr>
            <tr>
              <td colspan="6" class="totals-label">Totales</td>
              <td class="money totals-money">${money(subtotal)}</td>
              <td class="money blue totals-money">${money(igv)}</td>
              <td class="money purple totals-money">${money(total)}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_facturas_${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function exportCsv() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const rows = list.length ? list : [{
    date: "",
    number: "",
    provider: "No hay facturas para este reporte.",
    ruc: "",
    status: "",
    category: "",
    subtotal: 0,
    igv: 0,
    total: 0
  }];
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";
  const currency = settings.currency || "Soles (S/)";

  const detailRows = rows.map((invoice) => [
    { value: formatDate(invoice.date || ""), style: 16 },
    { value: invoice.number || "", style: 16 },
    { value: invoice.provider || "", style: 16 },
    { value: invoice.ruc || "", style: 16 },
    { value: invoice.status || "Pendiente", style: 17 },
    { value: invoice.category || "Servicios", style: 16 },
    { value: Number(invoice.subtotal) || 0, type: "n", style: 18 },
    { value: Number(invoice.igv) || 0, type: "n", style: 19 },
    { value: Number(invoice.total) || 0, type: "n", style: 20 }
  ]);

  const resumenRows = [
    { height: 8, cells: [] },
    {
      height: 34,
      cells: [
        { col: 1, value: "KOVRA", style: 1, merge: 2 },
        { col: 4, value: "REPORTE DE FACTURAS", style: 3, merge: 2 },
        { col: 8, value: "FECHA DE GENERACION", style: 5, merge: 1 }
      ]
    },
    {
      height: 22,
      cells: [
        { col: 1, value: "CONTROL INTELIGENTE DE FACTURAS", style: 2, merge: 2 },
        { col: 4, value: companyName, style: 4, merge: 2 },
        { col: 8, value: generatedLabel, style: 6, merge: 1 }
      ]
    },
    { height: 8, cells: [] },
    {
      cells: [
        { value: "RUC:", style: 7 },
        { value: companyRuc, style: 8, merge: 2 },
        { col: 5, value: "REPORTE:", style: 7 },
        { value: "Reporte de facturas", style: 8, merge: 4 }
      ]
    },
    {
      cells: [
        { value: "DIRECCION:", style: 7 },
        { value: companyAddress, style: 8, merge: 2 },
        { col: 5, value: "GENERADO POR:", style: 7 },
        { value: reporter, style: 8, merge: 4 }
      ]
    },
    {
      cells: [
        { value: "CORREO:", style: 7 },
        { value: companyEmail, style: 8, merge: 2 },
        { col: 5, value: "MONEDA:", style: 7 },
        { value: currency, style: 8, merge: 4 }
      ]
    },
    {
      cells: [
        { value: "PERIODO:", style: 7 },
        { value: reportRangeLabel(), style: 8, merge: 7 }
      ]
    },
    { height: 8, cells: [] },
    { cells: [{ value: "RESUMEN DEL PERIODO", style: 9, merge: 8 }] },
    {
      cells: [
        { value: "TOTAL DE FACTURAS", style: 10, merge: 1 },
        { col: 3, value: "SUBTOTAL ACUMULADO", style: 10, merge: 1 },
        { col: 5, value: "IGV ACUMULADO", style: 10, merge: 1 },
        { col: 7, value: "MONTO TOTAL", style: 10, merge: 2 }
      ]
    },
    {
      height: 30,
      cells: [
        { value: list.length, type: "n", style: 11, merge: 1 },
        { col: 3, value: subtotal, type: "n", style: 12, merge: 1 },
        { col: 5, value: igv, type: "n", style: 13, merge: 1 },
        { col: 7, value: total, type: "n", style: 14, merge: 2 }
      ]
    },
    { height: 8, cells: [] },
    { cells: [{ value: "DETALLE DE FACTURAS", style: 9, merge: 8 }] },
    {
      cells: ["FECHA", "NUMERO DE FACTURA", "PROVEEDOR", "RUC", "ESTADO", "CATEGORIA", "SUBTOTAL", "IGV", "TOTAL"]
        .map((value) => ({ value, style: 15 }))
    },
    ...detailRows.map((cells) => ({ height: 20, cells })),
    { height: 20, cells: [{ value: "", style: 25, merge: 8 }] },
    { height: 20, cells: [{ value: "", style: 25, merge: 8 }] },
    {
      height: 24,
      cells: [
        { value: "TOTALES", style: 21, merge: 5 },
        { col: 7, value: subtotal, type: "n", style: 22 },
        { value: igv, type: "n", style: 23 },
        { value: total, type: "n", style: 24 }
      ]
    }
  ];

  const detalleRows = [
    {
      cells: ["FECHA", "NUMERO DE FACTURA", "PROVEEDOR", "RUC", "ESTADO", "CATEGORIA", "SUBTOTAL", "IGV", "TOTAL"]
        .map((value) => ({ value, style: 15 }))
    },
    ...detailRows.map((cells) => ({ height: 20, cells }))
  ];

  const files = {
    "[Content_Types].xml": xlsxContentTypes(),
    "_rels/.rels": xlsxRootRels(),
    "xl/workbook.xml": xlsxWorkbook(),
    "xl/_rels/workbook.xml.rels": xlsxWorkbookRels(),
    "xl/styles.xml": xlsxStyles(),
    "xl/worksheets/sheet1.xml": xlsxWorksheet({
      rows: resumenRows,
      columns: [80, 120, 120, 115, 98, 105, 90, 90, 90],
      merges: true,
      autoFilter: "A15:I15"
    }),
    "xl/worksheets/sheet2.xml": xlsxWorksheet({
      rows: detalleRows,
      columns: [85, 130, 160, 110, 90, 110, 90, 90, 90],
      merges: false,
      autoFilter: "A1:I1"
    })
  };

  const blob = new Blob([xlsxZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Reporte_Facturas_${today()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function xlsxXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function xlsxColumnName(index) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - mod) / 26);
  }
  return name;
}

function xlsxCellRef(column, row) {
  return `${xlsxColumnName(column)}${row}`;
}

function xlsxWorksheet({ rows, columns, autoFilter }) {
  const mergeCells = [];
  const body = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    let currentColumn = 1;
    const cells = (row.cells || []).map((cell) => {
      const column = cell.col || currentColumn;
      const ref = xlsxCellRef(column, rowNumber);
      const merge = Number(cell.merge) || 0;
      currentColumn = column + merge + 1;
      if (merge > 0) {
        mergeCells.push(`${ref}:${xlsxCellRef(column + merge, rowNumber)}`);
      }
      const style = Number.isInteger(cell.style) ? ` s="${cell.style}"` : "";
      if (cell.type === "n") {
        return `<c r="${ref}"${style}><v>${Number(cell.value) || 0}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr"${style}><is><t>${xlsxXml(cell.value)}</t></is></c>`;
    }).join("");
    const height = row.height ? ` ht="${row.height}" customHeight="1"` : "";
    return `<row r="${rowNumber}"${height}>${cells}</row>`;
  }).join("");
  const cols = columns.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width / 7}" customWidth="1"/>`).join("");
  const merges = mergeCells.length
    ? `<mergeCells count="${mergeCells.length}">${mergeCells.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${body}</sheetData>
  ${autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ""}
  ${merges}
</worksheet>`;
}

function xlsxContentTypes() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function xlsxRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function xlsxWorkbook() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Resumen" sheetId="1" r:id="rId1"/>
    <sheet name="Detalle de Facturas" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;
}

function xlsxWorkbookRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function xlsxStyles() {
  const fills = ["FFFFFF", "001B44", "002B66", "F9FAFD", "F2F5FA", "E9EFF7"];
  const fonts = [
    ["Calibri", 11, "0C1638", false],
    ["Arial", 28, "001B44", true],
    ["Arial", 7, "001B44", true],
    ["Calibri", 20, "001B44", true],
    ["Calibri", 12, "1B2E63", true],
    ["Calibri", 9, "FFFFFF", true],
    ["Calibri", 9, "0C1638", false],
    ["Calibri", 15, "5426C9", true],
    ["Calibri", 15, "008545", true],
    ["Calibri", 15, "0066C9", true],
    ["Calibri", 8, "FFFFFF", true],
    ["Calibri", 9, "008545", true],
    ["Calibri", 9, "5426C9", true]
  ];
  const fontXml = fonts.map(([name, size, color, bold]) => `<font>${bold ? "<b/>" : ""}<sz val="${size}"/><color rgb="FF${color}"/><name val="${name}"/></font>`).join("");
  const fillXml = [
    "<fill><patternFill patternType=\"none\"/></fill>",
    "<fill><patternFill patternType=\"gray125\"/></fill>",
    ...fills.map((color) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`)
  ].join("");
  const border = "<border><left style=\"thin\"><color rgb=\"FFD2DAE8\"/></left><right style=\"thin\"><color rgb=\"FFD2DAE8\"/></right><top style=\"thin\"><color rgb=\"FFD2DAE8\"/></top><bottom style=\"thin\"><color rgb=\"FFD2DAE8\"/></bottom></border>";
  const xf = (font, fill, borderId = 1, align = "center", numFmt = 0) =>
    `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill === 0 ? 0 : fill + 2}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${numFmt ? " applyNumberFormat=\"1\"" : ""}><alignment horizontal="${align}" vertical="center"/></xf>`;
  const cellXfs = [
    xf(0, 0, 0, "left"), xf(1, 0, 0, "left"), xf(2, 0, 0, "left"), xf(3, 0, 0), xf(4, 0, 0),
    xf(5, 1), xf(6, 3), xf(5, 2, 1, "left"), xf(6, 0, 1, "left"), xf(5, 1),
    xf(6, 4), xf(7, 0), xf(8, 0, 1, "center", 164), xf(9, 0, 1, "center", 164), xf(7, 0, 1, "center", 164),
    xf(10, 2), xf(6, 0), xf(11, 0), xf(6, 0, 1, "right", 164), xf(9, 0, 1, "right", 164), xf(12, 0, 1, "right", 164),
    xf(6, 5), xf(8, 5, 1, "right", 164), xf(9, 5, 1, "right", 164), xf(12, 5, 1, "right", 164), xf(6, 0)
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;S/&quot; #,##0.00"/></numFmts>
  <fonts count="${fonts.length}">${fontXml}</fonts>
  <fills count="${fills.length + 2}">${fillXml}</fills>
  <borders count="2"><border/><border>${border.replace(/^<border>|<\/border>$/g, "")}</border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="26">${cellXfs}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function xlsxCrcTable() {
  if (xlsxCrcTable.cache) return xlsxCrcTable.cache;
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  xlsxCrcTable.cache = table;
  return table;
}

function xlsxCrc32(bytes) {
  const table = xlsxCrcTable();
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function xlsxZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const push16 = (array, value) => { array.push(value & 255, (value >>> 8) & 255); };
  const push32 = (array, value) => { array.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255); };
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = xlsxCrc32(data);
    const local = [];
    push32(local, 0x04034b50); push16(local, 20); push16(local, 0); push16(local, 0); push16(local, 0); push16(local, 0);
    push32(local, crc); push32(local, data.length); push32(local, data.length); push16(local, nameBytes.length); push16(local, 0);
    chunks.push(new Uint8Array(local), nameBytes, data);
    const header = [];
    push32(header, 0x02014b50); push16(header, 20); push16(header, 20); push16(header, 0); push16(header, 0); push16(header, 0); push16(header, 0);
    push32(header, crc); push32(header, data.length); push32(header, data.length); push16(header, nameBytes.length); push16(header, 0); push16(header, 0);
    push16(header, 0); push16(header, 0); push32(header, 0); push32(header, offset);
    central.push(new Uint8Array(header), nameBytes);
    offset += local.length + nameBytes.length + data.length;
  });
  const centralOffset = offset;
  central.forEach((part) => { offset += part.length; });
  const end = [];
  push32(end, 0x06054b50); push16(end, 0); push16(end, 0); push16(end, Object.keys(files).length); push16(end, Object.keys(files).length);
  push32(end, offset - centralOffset); push32(end, centralOffset); push16(end, 0);
  return new Blob([...chunks, ...central, new Uint8Array(end)], { type: "application/zip" });
}

function exportCsvLegacyXml() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";
  const currency = settings.currency || "Soles (S/)";
  const rows = list.length ? list : [{
    date: "",
    number: "",
    provider: "No hay facturas para este reporte.",
    ruc: "",
    status: "",
    category: "",
    subtotal: 0,
    igv: 0,
    total: 0
  }];
  const x = (value) => escapeHtml(value ?? "");
  const data = (value, type = "String", style = "") =>
    `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${type}">${x(value)}</Data></Cell>`;
  const merge = (value, across, style = "Default", type = "String") =>
    `<Cell ss:MergeAcross="${across}" ss:StyleID="${style}"><Data ss:Type="${type}">${x(value)}</Data></Cell>`;
  const moneyCell = (value, style = "Money") =>
    `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${Number(value) || 0}</Data></Cell>`;
  const detailRows = rows.map((invoice) => `
    <Row ss:Height="20">
      ${data(formatDate(invoice.date || ""), "String", "Detail")}
      ${data(invoice.number || "", "String", "Detail")}
      ${data(invoice.provider || "", "String", "Detail")}
      ${data(invoice.ruc || "", "String", "Detail")}
      ${data(invoice.status || "Pendiente", "String", "Status")}
      ${data(invoice.category || "Servicios", "String", "Detail")}
      ${moneyCell(invoice.subtotal, "Money")}
      ${moneyCell(invoice.igv, "MoneyBlue")}
      ${moneyCell(invoice.total, "MoneyPurple")}
    </Row>
  `).join("");

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#111733"/></Style>
    <Style ss:ID="Logo"><Font ss:FontName="Arial" ss:Size="28" ss:Bold="1" ss:Color="#0A174A"/><Alignment ss:Vertical="Center"/></Style>
    <Style ss:ID="LogoSub"><Font ss:FontName="Arial" ss:Size="7" ss:Bold="1" ss:Color="#0A174A"/><Alignment ss:Vertical="Center"/></Style>
    <Style ss:ID="Title"><Font ss:FontName="Calibri" ss:Size="20" ss:Bold="1" ss:Color="#111733"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6F21D8"/></Borders></Style>
    <Style ss:ID="Subtitle"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#6F21D8"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="DateHead"><Interior ss:Color="#050C1F" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="DateValue"><Interior ss:Color="#F7F8FC" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#111733" ss:Size="10"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="Label"><Interior ss:Color="#062052" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="9"/><Alignment ss:Vertical="Center"/></Style>
    <Style ss:ID="Value"><Font ss:Color="#111733" ss:Size="9"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="Section"><Interior ss:Color="#050C1F" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="SummaryHead"><Interior ss:Color="#F3F6FB" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#27304D" ss:Size="9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="SummaryValue"><Font ss:Bold="1" ss:Color="#6232D9" ss:Size="15"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="SummaryGreen"><Font ss:Bold="1" ss:Color="#008F52" ss:Size="15"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="SummaryBlue"><Font ss:Bold="1" ss:Color="#006EDB" ss:Size="15"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="SummaryPurple"><Font ss:Bold="1" ss:Color="#6232D9" ss:Size="15"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="Header"><Interior ss:Color="#062052" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="8"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9DEEB"/></Borders></Style>
    <Style ss:ID="Detail"><Font ss:Color="#111733" ss:Size="9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/></Borders></Style>
    <Style ss:ID="Status"><Font ss:Bold="1" ss:Color="#00A651" ss:Size="9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/></Borders></Style>
    <Style ss:ID="Money"><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Font ss:Color="#111733" ss:Size="9"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/></Borders></Style>
    <Style ss:ID="MoneyBlue"><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Font ss:Color="#006EDB" ss:Size="9"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/></Borders></Style>
    <Style ss:ID="MoneyPurple"><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Font ss:Bold="1" ss:Color="#6232D9" ss:Size="9"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEF0F7"/></Borders></Style>
    <Style ss:ID="Totals"><Interior ss:Color="#EAF1FB" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#111733" ss:Size="9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/></Borders></Style>
    <Style ss:ID="TotalsGreen"><Interior ss:Color="#EAF1FB" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Font ss:Bold="1" ss:Color="#008F52" ss:Size="9"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/></Borders></Style>
    <Style ss:ID="TotalsBlue"><Interior ss:Color="#EAF1FB" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Font ss:Bold="1" ss:Color="#006EDB" ss:Size="9"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/></Borders></Style>
    <Style ss:ID="TotalsPurple"><Interior ss:Color="#EAF1FB" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;S/&quot; #,##0.00"/><Font ss:Bold="1" ss:Color="#6232D9" ss:Size="9"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8C7DC"/></Borders></Style>
  </Styles>
  <Worksheet ss:Name="Resumen">
    <Table ss:ExpandedColumnCount="9" x:FullColumns="1" x:FullRows="1">
      <Column ss:Width="80"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="115"/><Column ss:Width="98"/><Column ss:Width="105"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/>
      <Row ss:Height="8">${merge("", 8)}</Row>
      <Row ss:Height="34">${merge("KOVRA", 2, "Logo")}${merge("REPORTE DE FACTURAS", 2, "Title")}<Cell/><Cell/><Cell ss:MergeAcross="1" ss:StyleID="DateHead"><Data ss:Type="String">FECHA DE GENERACION</Data></Cell></Row>
      <Row ss:Height="22">${merge("CONTROL INTELIGENTE DE FACTURAS", 2, "LogoSub")}${merge(companyName, 2, "Subtitle")}<Cell/><Cell/><Cell ss:MergeAcross="1" ss:StyleID="DateValue"><Data ss:Type="String">${x(generatedLabel)}</Data></Cell></Row>
      <Row ss:Height="8">${merge("", 8)}</Row>
      <Row>${data("RUC:", "String", "Label")}${merge(companyRuc, 2, "Value")}${data("REPORTE:", "String", "Label")}${merge("Reporte de facturas", 4, "Value")}</Row>
      <Row>${data("DIRECCION:", "String", "Label")}${merge(companyAddress, 2, "Value")}${data("GENERADO POR:", "String", "Label")}${merge(reporter, 4, "Value")}</Row>
      <Row>${data("CORREO:", "String", "Label")}${merge(companyEmail, 2, "Value")}${data("MONEDA:", "String", "Label")}${merge(currency, 4, "Value")}</Row>
      <Row>${data("PERIODO:", "String", "Label")}${merge(reportRangeLabel(), 7, "Value")}</Row>
      <Row ss:Height="8">${merge("", 8)}</Row>
      <Row>${merge("RESUMEN DEL PERIODO", 8, "Section")}</Row>
      <Row>${merge("TOTAL DE FACTURAS", 1, "SummaryHead")}${merge("SUBTOTAL ACUMULADO", 1, "SummaryHead")}${merge("IGV ACUMULADO", 1, "SummaryHead")}${merge("MONTO TOTAL", 2, "SummaryHead")}</Row>
      <Row ss:Height="30">${merge(list.length, 1, "SummaryValue", "Number")}${merge(subtotal, 1, "SummaryGreen", "Number")}${merge(igv, 1, "SummaryBlue", "Number")}${merge(total, 2, "SummaryPurple", "Number")}</Row>
      <Row ss:Height="8">${merge("", 8)}</Row>
      <Row>${merge("DETALLE DE FACTURAS", 8, "Section")}</Row>
      <Row ss:AutoFitHeight="0">${data("FECHA", "String", "Header")}${data("NUMERO DE FACTURA", "String", "Header")}${data("PROVEEDOR", "String", "Header")}${data("RUC", "String", "Header")}${data("ESTADO", "String", "Header")}${data("CATEGORIA", "String", "Header")}${data("SUBTOTAL", "String", "Header")}${data("IGV", "String", "Header")}${data("TOTAL", "String", "Header")}</Row>
      ${detailRows}
      <Row ss:Height="20">${merge("", 8, "Detail")}</Row>
      <Row ss:Height="20">${merge("", 8, "Detail")}</Row>
      <Row ss:Height="24">${merge("TOTALES", 5, "Totals")}${moneyCell(subtotal, "TotalsGreen")}${moneyCell(igv, "TotalsBlue")}${moneyCell(total, "TotalsPurple")}</Row>
    </Table>
    <AutoFilter x:Range="R15C1:R15C9" xmlns="urn:schemas-microsoft-com:office:excel"/>
  </Worksheet>
  <Worksheet ss:Name="Detalle de Facturas">
    <Table ss:ExpandedColumnCount="9" x:FullColumns="1" x:FullRows="1">
      <Column ss:Width="85"/><Column ss:Width="130"/><Column ss:Width="160"/><Column ss:Width="110"/><Column ss:Width="90"/><Column ss:Width="110"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/>
      <Row>${data("FECHA", "String", "Header")}${data("NUMERO DE FACTURA", "String", "Header")}${data("PROVEEDOR", "String", "Header")}${data("RUC", "String", "Header")}${data("ESTADO", "String", "Header")}${data("CATEGORIA", "String", "Header")}${data("SUBTOTAL", "String", "Header")}${data("IGV", "String", "Header")}${data("TOTAL", "String", "Header")}</Row>
      ${detailRows}
    </Table>
    <AutoFilter x:Range="R1C1:R1C9" xmlns="urn:schemas-microsoft-com:office:excel"/>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([workbook], { type: "application/xml;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Reporte_Facturas_${today()}.xml`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function exportCsvLegacyHtml() {
  const list = document.getElementById("reports").classList.contains("active-view")
    ? reportInvoices()
    : currentFilteredInvoices();
  const company = companyProfile();
  const generatedLabel = new Date().toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const subtotal = list.reduce((sum, invoice) => sum + (Number(invoice.subtotal) || 0), 0);
  const igv = list.reduce((sum, invoice) => sum + (Number(invoice.igv) || 0), 0);
  const total = list.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
  const rows = list.map((invoice) => `
    <tr class="detail-row">
      <td>${escapeHtml(formatDate(invoice.date || ""))}</td>
      <td>${escapeHtml(invoice.number || "")}</td>
      <td>${escapeHtml(invoice.provider || "")}</td>
      <td>${escapeHtml(invoice.ruc || "")}</td>
      <td class="status-ok">${escapeHtml(invoice.status || "Pendiente")}</td>
      <td>${escapeHtml(invoice.category || "Servicios")}</td>
      <td class="money">${money(invoice.subtotal)}</td>
      <td class="money blue">${money(invoice.igv)}</td>
      <td class="money purple">${money(invoice.total)}</td>
    </tr>
  `).join("");
  const companyName = company.name || "PYME Lima 2026";
  const companyRuc = company.ruc || "-";
  const companyAddress = company.address || "Av. Los Emprendedores 123, Lima";
  const companyEmail = company.email || "bicsacs@gmail.com";
  const reporter = currentUser?.name || currentUser?.email || "Sistema KOVRA";
  const currency = settings.currency || "Soles (S/)";

  const table = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #111733; }
          table.report { border-collapse: collapse; width: 100%; }
          .report td, .report th { border: 1px solid #d9deeb; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
          .blank td { border: 0; height: 12px; padding: 0; }
          .logo { border: 0 !important; color: #0a174a; font-size: 34px; font-weight: 900; letter-spacing: 2px; text-align: left; }
          .logo-sub { border: 0 !important; color: #0a174a; font-size: 8px; font-weight: 900; text-align: left; text-transform: uppercase; }
          .title { border: 0 !important; border-bottom: 2px solid #6f21d8 !important; color: #111733; font-size: 22px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .subtitle { border: 0 !important; color: #6f21d8; font-size: 13px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-head { background: #050c1f; color: #ffffff; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .date-value { background: #f7f8fc; color: #111733; font-size: 11px; font-weight: 700; text-align: center; }
          .label { background: #062052; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .value { background: #ffffff; color: #111733; font-size: 10px; font-weight: 700; }
          .section { background: #050c1f; color: #ffffff; font-size: 11px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-head { background: #f3f6fb; color: #27304d; font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .summary-value { background: #ffffff; color: #6232d9; font-size: 16px; font-weight: 900; text-align: center; }
          .summary-value.green { color: #008f52; }
          .summary-value.blue { color: #006edb; }
          .detail-head th { background: #062052; color: #ffffff; font-size: 9px; font-weight: 900; text-align: center; text-transform: uppercase; }
          .detail-row td { color: #111733; font-size: 10px; text-align: center; }
          .status-ok { color: #00a651; font-weight: 900; }
          .money { mso-number-format:"\\0022S/\\0022 #,##0.00"; text-align: right; white-space: nowrap; }
          .money.blue { color: #006edb; }
          .money.purple { color: #6232d9; font-weight: 900; }
          .totals-label { background: #eaf1fb; color: #111733; font-weight: 900; text-align: center; text-transform: uppercase; }
          .totals-money { background: #eaf1fb; font-weight: 900; }
          .no-border { border: 0 !important; }
        </style>
      </head>
      <body>
        <table class="report">
          <tbody>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr>
              <td colspan="3" class="logo">KOVRA</td>
              <td colspan="3" class="title">Reporte de facturas</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-head">Fecha de generacion</td>
            </tr>
            <tr>
              <td colspan="3" class="logo-sub">Control inteligente de facturas</td>
              <td colspan="3" class="subtitle">${escapeHtml(companyName)}</td>
              <td class="no-border"></td>
              <td colspan="2" class="date-value">${escapeHtml(generatedLabel)}</td>
            </tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td class="label">RUC:</td><td colspan="3" class="value">${escapeHtml(companyRuc)}</td><td class="label">Reporte:</td><td colspan="4" class="value">Reporte de facturas</td></tr>
            <tr><td class="label">Direccion:</td><td colspan="3" class="value">${escapeHtml(companyAddress)}</td><td class="label">Generado por:</td><td colspan="4" class="value">${escapeHtml(reporter)}</td></tr>
            <tr><td class="label">Correo:</td><td colspan="3" class="value">${escapeHtml(companyEmail)}</td><td class="label">Moneda:</td><td colspan="4" class="value">${escapeHtml(currency)}</td></tr>
            <tr><td class="label">Periodo:</td><td colspan="8" class="value">${escapeHtml(reportRangeLabel())}</td></tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Resumen del periodo</td></tr>
            <tr><td colspan="2" class="summary-head">Total de facturas</td><td colspan="2" class="summary-head">Subtotal acumulado</td><td colspan="2" class="summary-head">IGV acumulado</td><td colspan="3" class="summary-head">Monto total</td></tr>
            <tr><td colspan="2" class="summary-value">${list.length}</td><td colspan="2" class="summary-value green">${money(subtotal)}</td><td colspan="2" class="summary-value blue">${money(igv)}</td><td colspan="3" class="summary-value">${money(total)}</td></tr>
            <tr class="blank"><td colspan="9"></td></tr>
            <tr><td colspan="9" class="section">Detalle de facturas</td></tr>
            <tr class="detail-head"><th>Fecha</th><th>Numero de factura</th><th>Proveedor</th><th>RUC</th><th>Estado</th><th>Categoria</th><th>Subtotal</th><th>IGV</th><th>Total</th></tr>
            ${rows || `<tr class="detail-row"><td colspan="9">No hay facturas para este reporte.</td></tr>`}
            <tr><td colspan="9">&nbsp;</td></tr>
            <tr><td colspan="9">&nbsp;</td></tr>
            <tr><td colspan="6" class="totals-label">Totales</td><td class="money totals-money">${money(subtotal)}</td><td class="money blue totals-money">${money(igv)}</td><td class="money purple totals-money">${money(total)}</td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_facturas_${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
