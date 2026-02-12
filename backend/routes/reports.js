// backend/routes/reports.js
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const response = require('../utils/responseHelper');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const router = express.Router();
router.use(authMiddleware);

// --- HELPER FUNCTIONS ---
const formatRp = (val) => 'Rp ' + Number(val).toLocaleString('id-ID');
const formatDateId = (dateStr) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateStr);
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};
const formatDateShort = (dateStr) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateStr);
  return d.getDate() + ' ' + months[d.getMonth()];
};
const formatPeriod = (start, end) => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const s = new Date(start);
  const e = new Date(end);
  return s.getDate() + ' ' + months[s.getMonth()] + ' - ' + e.getDate() + ' ' + months[e.getMonth()] + ' ' + e.getFullYear();
};
const formatDateFull = (dateStr) => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = new Date(dateStr);
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
};

router.get('/data', async (req, res, next) => {
  try {
    const { range = 'month', startDate: qStart, endDate: qEnd } = req.query;
    let startDate, endDate;
    const now = new Date();
    if (range === 'custom' && qStart && qEnd) { startDate = new Date(qStart); endDate = new Date(qEnd); }
    else if (range === 'day') { startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); }
    else if (range === 'week') { const dayOfWeek = now.getDay(); startDate = new Date(now); startDate.setDate(now.getDate() - dayOfWeek); startDate.setHours(0, 0, 0, 0); endDate = new Date(now); endDate.setHours(23, 59, 59, 999); }
    else if (range === 'year') { startDate = new Date(now.getFullYear(), 0, 1); endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); }
    else { startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const [summaryRows] = await pool.query(`SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ? AND DATE(transaction_date) >= ? AND DATE(transaction_date) <= ? GROUP BY type`, [req.userId, startStr, endStr]);
    const summary = { income: 0, expense: 0, balance: 0, savingsRate: 0 };
    summaryRows.forEach(row => { if (row.type === 'income') summary.income = parseFloat(row.total); if (row.type === 'expense') summary.expense = parseFloat(row.total); });
    summary.balance = summary.income - summary.expense;
    if (summary.income > 0) summary.savingsRate = Math.round((summary.balance / summary.income) * 100);

    const [breakdown] = await pool.query(`SELECT c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(t.id) as count, ROUND((SUM(t.amount) / ? * 100), 1) as percentage FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = 'expense' AND DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ? GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC`, [summary.expense || 1, req.userId, startStr, endStr]);

    const [trendData] = await pool.query(`SELECT DATE(transaction_date) as date, type, SUM(amount) as total FROM transactions WHERE user_id = ? AND DATE(transaction_date) >= ? AND DATE(transaction_date) <= ? GROUP BY DATE(transaction_date), type ORDER BY date`, [req.userId, startStr, endStr]);
    const trendMap = {};
    trendData.forEach(row => { 
      // With dateStrings: true, row.date is already a string like "2026-01-28" or "2026-01-28 00:00:00"
      const k = String(row.date).split('T')[0].split(' ')[0]; 
      if (!trendMap[k]) trendMap[k] = { date: k, income: 0, expense: 0 }; 
      if (row.type === 'income') trendMap[k].income = parseFloat(row.total); 
      if (row.type === 'expense') trendMap[k].expense = parseFloat(row.total); 
    });

    return response.success(res, { summary, breakdown, trend: Object.values(trendMap), range: { start: startStr, end: endStr } });
  } catch (error) { next(error); }
});

router.post('/download', async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'pdf' } = req.body;
    if (!startDate || !endDate) return response.badRequest(res, 'Start date are required');

    // Data Fetching
    const [transactions] = await pool.query(
      `SELECT t.id, t.amount, t.type, t.description,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as date,
        c.name as category_name, c.icon as category_icon
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
       ORDER BY t.transaction_date ASC`,
      [req.userId, startDate, endDate]
    );

    let totalIncome = 0, totalExpense = 0;
    const dailyData = {};
    const categoryTotals = {};

    transactions.forEach(t => {
      const amt = parseFloat(t.amount);
      if (t.type === 'income') totalIncome += amt;
      else {
        totalExpense += amt;
        const catName = t.category_name || 'Lainnya';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amt;
      }

      const d = t.date;
      if (!dailyData[d]) dailyData[d] = { date: d, income: 0, expense: 0 };
      if (t.type === 'income') dailyData[d].income += amt;
      else dailyData[d].expense += amt;
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

    // Sort categories max to min
    const topCategories = Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // --- PDF GENERATION ---
    if (format !== 'excel') {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Laporan_' + startDate + '_' + endDate + '.pdf');
        res.send(pdfBuffer);
      });

      // Colors
      const C_PRIMARY = '#2463eb';
      const C_DARK = '#0f172a';
      const C_GRAY = '#64748b';
      const C_LIGHT = '#f1f5f9';
      const C_GREEN = '#16a34a';
      const C_RED = '#ef4444';

      // 1. HEADER
      // Logo (Wallet Icon + Text)
      doc.save();
      doc.translate(50, 48); // Position
      doc.scale(0.8); // Scale
      // Icon Blue, Text Black Bold
      doc.path('M21 7.28V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.98 1-1.72V9c0-.74-.41-1.37-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z')
        .fillColor('#2463eb').fill(); // Blue icon
      doc.restore();

      // "CashTrace" Text - Bold Black
      doc.font('Helvetica-Bold').fontSize(24).fillColor('#000000').text('CashTrace', 85, 50);
      doc.font('Helvetica').fontSize(9).fillColor(C_GRAY).text('LAPORAN MANAJEMEN KEUANGAN', 50, 78);

      // Bottom Line of Header
      doc.moveTo(50, 100).lineTo(545, 100).strokeColor(C_PRIMARY).lineWidth(1.5).stroke();

      // Right Side: Title & Date - Black Title
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text('Laporan Keuangan', 300, 45, { align: 'right', width: 245 });

      const periodY = 70;
      doc.font('Helvetica').fontSize(10).fillColor(C_GRAY).text('Periode: ' + formatPeriod(startDate, endDate), 300, periodY, { align: 'right', width: 245 });
      doc.fontSize(8).text('Dibuat pada: ' + formatDateFull(new Date().toISOString()), 300, periodY + 15, { align: 'right', width: 245 });

      // 2. SUMMARY SECTION
      let y = 130;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C_DARK).text('RINGKASAN EKSEKUTIF', 60, y);
      doc.rect(50, y, 3, 12).fill(C_PRIMARY);

      y += 25;
      doc.rect(50, y, 495, 25).fill('#f8fafc');
      doc.moveTo(50, y + 25).lineTo(545, y + 25).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.fillColor(C_GRAY).fontSize(8).font('Helvetica-Bold');
      doc.text('METRIK', 60, y + 8);
      doc.text('NILAI (IDR)', 250, y + 8, { width: 100, align: 'right' });
      doc.text('ANALISIS', 380, y + 8);

      y += 30;
      doc.fillColor(C_DARK).font('Helvetica').fontSize(9).text('Total Pemasukan', 60, y);
      doc.font('Helvetica-Bold').text(formatRp(totalIncome), 250, y, { width: 100, align: 'right' });
      doc.fillColor(C_GREEN).fontSize(8).text(`+ ${transactions.filter(t => t.type === 'income').length} Transaksi`, 380, y);
      doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor('#f1f5f9').lineWidth(1).stroke();

      y += 20;
      doc.fillColor(C_DARK).font('Helvetica').text('Total Pengeluaran', 60, y);
      doc.font('Helvetica-Bold').text(formatRp(totalExpense), 250, y, { width: 100, align: 'right' });
      doc.fillColor(C_RED).fontSize(8).text(`- ${transactions.filter(t => t.type === 'expense').length} Transaksi`, 380, y);
      doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor('#f1f5f9').lineWidth(1).stroke();

      y += 20;
      doc.rect(50, y - 5, 495, 25).fill('#eff6ff');
      doc.fillColor(C_PRIMARY).font('Helvetica-Bold').text('Sisa Saldo', 60, y + 2);
      doc.text(formatRp(balance), 250, y + 2, { width: 100, align: 'right' });
      doc.text(`${savingsRate}% Margin Tabungan`, 380, y + 2);

      // 3. CHART SECTION
      y += 50;
      doc.fillColor(C_DARK).fontSize(10).font('Helvetica-Bold').text('ANALISIS ARUS UANG', 60, y); // UPDATED TEXT
      doc.rect(50, y, 3, 12).fill(C_PRIMARY);

      y += 30;
      const chartHeight = 120;
      const chartTop = y;
      const chartLeft = 90;
      
      // -- UPDATED CHART LOGIC (Dynamic Slicing/Scaling) --
      let chartDays = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Calculate available width
      const maxChartWidth = 545 - chartLeft; 
      const totalDays = chartDays.length;
      
      // Default / Min width settings
      const minBarW = 2; // Increased minimum visibility for many days
      const minGap = 1;
      
      // Ideally we want barW ~ 15, gap ~ 30.
      // If items * (15 + 30) > maxChartWidth, we scale down.
      
      let barW = 15;
      let gap = 20;
      
      if (totalDays > 0) {
        const requiredWidth = totalDays * (barW * 2 + gap);
        if (requiredWidth > maxChartWidth) {
          // Scale down
          const availablePerItem = maxChartWidth / totalDays;
          // each item needs 2 bars + gap. Let's say gap is same as barW.
          // 3 * barW = availablePerItem => barW = availablePerItem / 3
          barW = Math.max(minBarW, (availablePerItem * 0.6) / 2); // 60% for bars, 40% for gap?
          gap = Math.max(minGap, availablePerItem * 0.4);
        }
      }

      const maxVal = Math.max(...chartDays.map(d => Math.max(d.income, d.expense)), 100);

      doc.fontSize(7).fillColor(C_GRAY).font('Helvetica');
      doc.text(formatRp(maxVal), 50, chartTop, { width: 35, align: 'right' });
      doc.text(formatRp(maxVal / 2), 50, chartTop + chartHeight / 2, { width: 35, align: 'right' });
      doc.text('0', 50, chartTop + chartHeight, { width: 35, align: 'right' });

      let x = chartLeft;
      
      chartDays.forEach((d, index) => {
        const hInc = (d.income / maxVal) * chartHeight;
        const hExp = (d.expense / maxVal) * chartHeight;

        if (hInc > 0) doc.rect(x, chartTop + chartHeight - hInc, barW, hInc).fill(C_PRIMARY);
        else doc.rect(x, chartTop + chartHeight - 1, barW, 1).fill(C_PRIMARY);

        if (hExp > 0) doc.rect(x + barW + (gap * 0.1), chartTop + chartHeight - hExp, barW, hExp).fill('#cbd5e1');
        else doc.rect(x + barW + (gap * 0.1), chartTop + chartHeight - 1, barW, 1).fill('#cbd5e1');

        // Only show date label if there's enough space
        // simple heuristic: if barW > 10, show all. Else show every nth.
        const showLabel = barW > 10 || (index % Math.ceil(50 / (barW * 2 + gap))) === 0;
        
        if (showLabel) {
             doc.fillColor(C_GRAY).text(formatDateShort(d.date), x - 5, chartTop + chartHeight + 8, { width: barW * 2 + gap + 10, align: 'center' });
        }
       
        x += (barW * 2 + gap);
      });

      const legendY = chartTop + chartHeight + 25;
      doc.rect(chartLeft, legendY, 10, 10).fill(C_PRIMARY);
      doc.fillColor(C_DARK).text('Pemasukan', chartLeft + 15, legendY + 2);
      doc.rect(chartLeft + 80, legendY, 10, 10).fill('#cbd5e1');
      doc.text('Pengeluaran', chartLeft + 95, legendY + 2);

      // 4. TRANSACTIONS DETAIL (UPDATED TABLE STYLE)
      y = legendY + 40;
      doc.fillColor(C_DARK).fontSize(10).font('Helvetica-Bold').text('DETAIL TRANSAKSI', 60, y);
      doc.rect(50, y, 3, 12).fill(C_PRIMARY);

      // Header Background
      doc.rect(50, y, 495, 20).fill('#eff6ff'); // Light blue background to match theme
      
      // Header Text
      doc.fontSize(7).fillColor(C_DARK).font('Helvetica-Bold');
      doc.text('TANGGAL', 60, y + 6);
      doc.text('KATEGORI', 130, y + 6);
      doc.text('DESKRIPSI', 230, y + 6);
      doc.text('TIPE', 380, y + 6, { align: 'center', width: 60 });
      doc.text('JUMLAH', 450, y + 6, { align: 'right', width: 80 });

      // Header Grid Lines (Blue)
      doc.lineWidth(0.5).strokeColor(C_PRIMARY); 
      doc.rect(50, y, 495, 20).stroke(); // Outer border
      doc.moveTo(125, y).lineTo(125, y + 20).stroke(); // Vertical Separators
      doc.moveTo(225, y).lineTo(225, y + 20).stroke();
      doc.moveTo(375, y).lineTo(375, y + 20).stroke();
      doc.moveTo(445, y).lineTo(445, y + 20).stroke();

      y += 20;
      doc.font('Helvetica');

      transactions.forEach((t, index) => {
        if (y > 720) { doc.addPage(); y = 50; }
        
        // Simple list style with BLUE vertical column lines
        // No zebra striping

        doc.fillColor(C_DARK).text(formatDateId(t.date), 60, y + 5);
        doc.font('Helvetica-Bold').text(t.category_name || 'Lainnya', 130, y + 5);
        doc.font('Helvetica').fillColor(C_GRAY).text((t.description || '-').substring(0, 25), 230, y + 5);

        const isInc = t.type === 'income';
        doc.fillColor(isInc ? C_GREEN : C_RED).text(isInc ? 'Pemasukan' : 'Pengeluaran', 380, y + 5, { align: 'center', width: 60 });
        doc.font('Helvetica-Bold').text(formatRp(t.amount), 450, y + 5, { align: 'right', width: 80 });

        // Vertical lines for columns (BLUE)
        doc.lineWidth(0.5).strokeColor(C_PRIMARY); // Blue
        doc.moveTo(50, y).lineTo(50, y + 20).stroke(); // Left
        doc.moveTo(125, y).lineTo(125, y + 20).stroke();
        doc.moveTo(225, y).lineTo(225, y + 20).stroke();
        doc.moveTo(375, y).lineTo(375, y + 20).stroke();
        doc.moveTo(445, y).lineTo(445, y + 20).stroke();
        doc.moveTo(545, y).lineTo(545, y + 20).stroke(); // Right
        
        // Horizontal line bottom of row
        doc.moveTo(50, y + 20).lineTo(545, y + 20).stroke();
        
        y += 20;
      });

      // Total Section (Footer) -> Now integrated into the grid look
      y += 5; // spacing? Or attached? User said "biar ga pisah". Let's attach it.
      y -= 5; // Remove spacing to attach
      
      doc.rect(50, y, 495, 25).fill('#eff6ff'); // Light blue background
      
      // Footer Content
      doc.fontSize(9).fillColor(C_DARK).font('Helvetica-Bold').text('TOTAL', 60, y + 8);
      doc.fillColor(C_GREEN).text('+' + formatRp(totalIncome), 300, y + 8, { width: 100, align: 'right' });
      doc.fillColor(C_RED).text('-' + formatRp(totalExpense), 430, y + 8, { width: 100, align: 'right' });

      // Footer Grid Lines (Blue)
      doc.lineWidth(0.5).strokeColor(C_PRIMARY);
      doc.rect(50, y, 495, 25).stroke(); // Outer box
      // Vertical separators for total? Maybe typically total is one block, or matches columns.
      // Usually total spans across, but let's draw lines to match structure if desired. 
      // "Header dan footernya juga dong"
      // Let's just frame the footer nicely in blue.


      // 5. INSIGHTS
      y += 40;
      if (y > 700) { doc.addPage(); y = 50; }
      doc.fillColor(C_DARK).fontSize(10).font('Helvetica-Bold').text('CATATAN & WAWASAN KEUANGAN', 60, y);
      doc.rect(50, y, 3, 12).fill(C_PRIMARY);

      y += 25;
      doc.fontSize(8);
      const condition = savingsRate >= 20 ? 'Sangat Sehat' : (savingsRate > 0 ? 'Cukup Sehat' : 'Perlu Perhatian');
      const conditionDesc = savingsRate >= 20 ? 'Anda memiliki margin tabungan yang sangat baik di atas 20%.' : (savingsRate > 0 ? 'Keuangan Anda positif, namun pertimbangkan untuk meningkatkan tabungan.' : 'Pengeluaran melebihi pemasukan.');

      doc.fillColor(C_GRAY).text('01', 50, y);
      doc.fillColor(C_DARK).font('Helvetica-Bold').text('Status Kesehatan Keuangan: ' + condition, 75, y);
      doc.fillColor(C_GRAY).font('Helvetica').text(`Rasio tabungan: ${savingsRate}%. ${conditionDesc}`, 75, y + 12, { width: 450 });

      y += 40;
      const topCat = topCategories.length > 0 ? topCategories[0] : { name: 'Tidak ada', total: 0 };
      const topCatPct = totalExpense > 0 ? Math.round((topCat.total / totalExpense) * 100) : 0;

      doc.fillColor(C_GRAY).text('02', 50, y);
      doc.fillColor(C_DARK).font('Helvetica-Bold').text('Fokus Pengeluaran: ' + topCat.name, 75, y);
      doc.fillColor(C_GRAY).font('Helvetica').text(`Pengeluaran terbesar di ${topCat.name} sebesar ${formatRp(topCat.total)} (${topCatPct}%).`, 75, y + 12, { width: 450 });

      const bottomY = 780;
      doc.fontSize(7).fillColor(C_GRAY).text('CashTrace System © ' + new Date().getFullYear(), 50, bottomY);

      doc.end();
    } else {
      // Excel Logic
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CashTrace';
      workbook.created = new Date();
      const summarySheet = workbook.addWorksheet('Ringkasan');
      summarySheet.columns = [{ header: 'Metrik', key: 'm', width: 25 }, { header: 'Nilai', key: 'v', width: 25 }];
      summarySheet.addRows([{ m: 'Periode', v: formatPeriod(startDate, endDate) }, { m: 'Total Pemasukan', v: totalIncome }, { m: 'Total Pengeluaran', v: totalExpense }, { m: 'Margin Tabungan', v: savingsRate + '%' }]);
      const txSheet = workbook.addWorksheet('Transaksi');
      txSheet.columns = [{ header: 'Tanggal', key: 'date', width: 15 }, { header: 'Kategori', key: 'cat', width: 20 }, { header: 'Tipe', key: 'type', width: 12 }, { header: 'Jumlah', key: 'amount', width: 15 }, { header: 'Deskripsi', key: 'desc', width: 30 }];
      transactions.forEach(t => txSheet.addRow({ date: t.date, cat: t.category_name, type: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', amount: parseFloat(t.amount), desc: t.description }));
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Laporan.xlsx');
      return res.send(Buffer.from(buffer));
    }

  } catch (error) { next(error); }
});

module.exports = router;
