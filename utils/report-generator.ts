import jsPDF from 'jspdf';
import { CompanyInfo, User, DailyClosure, Sale, PaymentMethod } from '../types';

interface ReportData {
    company: CompanyInfo;
    user: User;
    period: { start: Date; end: Date };
    sales: Sale[];
    expenses: any[];
    closures: DailyClosure[];
    aiSummary?: string;
}

export const generateFinancialReport = async (data: ReportData) => {
    const doc = new jsPDF();
    const { company, user, period, sales, expenses, closures, aiSummary } = data;

    // --- Helpers ---
    const formatCurrency = (val: number) => `MT ${val.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}`;
    const formatDate = (date: Date) => date.toLocaleDateString('pt-MZ');

    let yPos = 20;
    const leftMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (leftMargin * 2);

    const addLine = (y: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.line(leftMargin, y, pageWidth - leftMargin, y);
        return y + 10;
    };

    // --- 1. HEADER ---
    // Logo (if available, we'd add it here, but skipping complex image loading for now to ensure reliability)
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.setFont("helvetica", "bold");
    doc.text(company.name || "Nobreza ERP", leftMargin, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(company.address || "Endereço não registado", leftMargin, yPos);
    yPos += 5;
    doc.text(`Contactos: ${company.phone || '-'} | ${company.email || '-'}`, leftMargin, yPos);

    // Title & Context
    yPos += 15;
    yPos = addLine(yPos);

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Financeiro Detalhado", leftMargin, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Período de Análise: ${formatDate(period.start)} até ${formatDate(period.end)}`, leftMargin, yPos);
    doc.text(`Gerado por: ${user.name} em ${new Date().toLocaleString()}`, leftMargin, yPos + 5);

    yPos += 15;

    // --- 2. CALCULATIONS ---
    const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalDivergences = closures.reduce((acc, c) => acc + (c.difference || 0), 0);
    const netProfit = totalSales - totalExpenses; // Divergences are usually cash count diffs, arguably part of profit/loss, but kept separate for clarity unless negative.
    // If divergence is negative, it's a loss. taking it into account for 'Cash Flow' reality.
    const realCashFlow = netProfit + Math.min(0, totalDivergences);

    // --- 3. EXECUTIVE SUMMARY ---
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.rect(leftMargin, yPos, contentWidth, 40, 'F');

    const colWidth = contentWidth / 4;
    let currentX = leftMargin + 5;
    let textY = yPos + 15;

    // Gross Sales
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("VENDAS BRUTAS", currentX, textY);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(totalSales), currentX, textY + 7);

    // Expenses
    currentX += colWidth;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("DESPESAS TOTAIS", currentX, textY);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(totalExpenses), currentX, textY + 7);

    // Divergences
    currentX += colWidth;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("QUEBRAS DE CAIXA", currentX, textY);
    doc.setFontSize(12);
    doc.setTextColor(totalDivergences < 0 ? 220 : 0, totalDivergences < 0 ? 38 : 0, totalDivergences < 0 ? 38 : 0);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(totalDivergences), currentX, textY + 7);

    // Net Profit
    currentX += colWidth;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("LUCRO LÍQUIDO", currentX, textY);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(netProfit), currentX, textY + 7);

    // --- 3.5 AI ANALYSIS (Optional) ---
    if (aiSummary) {
        // Background for AI
        doc.setFillColor(240, 253, 244); // Green-50
        doc.rect(leftMargin, yPos, contentWidth, 35, 'F');

        doc.setFontSize(9);
        doc.setTextColor(22, 163, 74); // Green-600
        doc.setFont("helvetica", "bold");
        doc.text("ANÁLISE INTELIGENTE (IA)", leftMargin + 5, yPos + 7);

        doc.setFontSize(9);
        doc.setTextColor(50);
        doc.setFont("helvetica", "normal");

        const splitText = doc.splitTextToSize(aiSummary, contentWidth - 10);
        doc.text(splitText, leftMargin + 5, yPos + 14);

        yPos += Math.max(35, splitText.length * 4 + 16);
    }

    yPos += 10;

    // Safety check for next section
    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    // --- 4. BREAKDOWNS ---
    const drawTable = (title: string, data: string[][]) => {
        // Simple manual table implementation since we don't assume auto-table
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(title, leftMargin, yPos);
        yPos += 5;

        // Header Box
        doc.setFillColor(16, 185, 129);
        doc.rect(leftMargin, yPos, contentWidth, 8, 'F');

        doc.setFontSize(9);
        doc.setTextColor(255);
        doc.text("Categoria / Descrição", leftMargin + 5, yPos + 5.5);
        doc.text("Valor", pageWidth - leftMargin - 5, yPos + 5.5, { align: 'right' });

        yPos += 8;

        // Rows
        doc.setTextColor(50);
        doc.setFont("helvetica", "normal");

        data.forEach((row, i) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            const isEven = i % 2 === 0;
            if (isEven) {
                doc.setFillColor(245, 245, 245);
                doc.rect(leftMargin, yPos, contentWidth, 7, 'F');
            }
            doc.text(row[0], leftMargin + 5, yPos + 5);
            doc.text(row[1], pageWidth - leftMargin - 5, yPos + 5, { align: 'right' });
            yPos += 7;
        });
        yPos += 10;
    };

    // Payment Methods Data
    const methods: Record<string, number> = {};
    sales.forEach(s => {
        const m = s.paymentMethod?.toLowerCase() || 'outros';
        const key = m.includes('mpesa') ? 'M-Pesa' :
            m.includes('emola') ? 'E-Mola' :
                m.includes('cash') || m.includes('numerario') ? 'Numerário' :
                    m.includes('pos') || m.includes('card') ? 'POS / Banco' : 'Outros';
        methods[key] = (methods[key] || 0) + s.total;
    });

    const methodsTable = Object.entries(methods)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, formatCurrency(v)]);

    drawTable("Receita por Método de Pagamento", methodsTable);

    // Expenses Data
    const expensesByCategory: Record<string, number> = {};
    // Add logic to group salaries specifically if needed
    expenses.forEach(e => {
        let cat = e.type || 'Outros';
        if (cat === 'Salary' || e.description.toLowerCase().includes('salário')) {
            cat = 'Salários & Remunerações';
            // Append name if description contains it to make it unique? 
            // Ideally we group by category main, but user asked for detail. 
            // Let's do a grouped table where row 1 is Main Category, row 2..n is detail?
            // For simplicity in this v1 renderer: List all expenses or group by category?
            // User asked for "Claramente salaries". Let's group by category but distinct salaries.
        }
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (e.amount || 0);
    });

    const expenseTable = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, formatCurrency(v)]);

    // Specific Salary Breakdown (if any)
    const salaries = expenses.filter(e => e.type === 'Salary' || e.description.toLowerCase().includes('salário'));
    if (salaries.length > 0) {
        drawTable("Detalhamento de Salários (Processados)", salaries.map(s => [
            `${s.description} (${formatDate(new Date(s.date))})`,
            formatCurrency(s.amount)
        ]));
    } else {
        drawTable("Despesas Operacionais", expenseTable);
    }

    // If we printed salaries separately, we still might want other expenses
    const nonSalaries = expenses.filter(e => !(e.type === 'Salary' || e.description.toLowerCase().includes('salário')));
    if (nonSalaries.length > 0 && salaries.length > 0) {
        const otherTable = nonSalaries.map(e => [e.description, formatCurrency(e.amount)]);
        drawTable("Outras Despesas", otherTable);
    }


    // --- 5. FOOTER ---
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Nobreza ERP - Processado em ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, leftMargin, 290);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - leftMargin - 20, 290);
    }

    doc.save(`Relatorio_Financeiro_${formatDate(period.start).replace(/\//g, '-')}_${formatDate(period.end).replace(/\//g, '-')}.pdf`);
};
