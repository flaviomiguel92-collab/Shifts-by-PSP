import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { formatMonth, resolveShiftColor } from './helpers';

interface Shift {
  date: string;
  shift_type: string;
  start_time?: string;
  end_time?: string;
  note?: string;
}

interface ShiftType {
  name: string;
  color?: string;
}

interface GratifiedEntry {
  date: string;
  name: string;
  value: number;
  start_time?: string;
  end_time?: string;
  note?: string;
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

export function exportShiftsToCSV(shifts: Shift[], month: string): string {
  const rows = [
    ['Data', 'Tipo de Turno', 'Início', 'Fim', 'Nota'],
    ...shifts
      .filter((s) => s.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => [
        s.date,
        s.shift_type,
        s.start_time || '',
        s.end_time || '',
        s.note || '',
      ]),
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function exportGratifiedToCSV(entries: GratifiedEntry[], month: string): string {
  const rows = [
    ['Data', 'Nome', 'Início', 'Fim', 'Valor (€)'],
    ...entries
      .filter((e) => e.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [
        e.date,
        e.name,
        e.start_time || '',
        e.end_time || '',
        Number(e.value || 0).toFixed(2),
      ]),
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCSVWeb(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareCSV(csv: string, filename: string) {
  if (Platform.OS === 'web') {
    downloadCSVWeb(csv, filename);
    return;
  }
  const FileSystem = await import('expo-file-system/legacy');
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: filename });
  }
}

// ─── Excel (XLSX) Export ────────────────────────────────────────────────────

export async function exportGratifiedToXLSX(entries: GratifiedEntry[], year: string): Promise<void> {
  const filtered = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date));

  const rows: (string | number)[][] = [
    ['Data', 'Nome', 'Início', 'Fim', 'Valor (€)', 'Nota'],
    ...filtered.map((e) => [
      e.date,
      e.name,
      e.start_time || '',
      e.end_time || '',
      Number(e.value || 0),
      e.note || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 }, { wch: 32 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Gratificados ${year}`);

  const filename = `gratificados-${year}.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (Platform.OS === 'web') {
    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const b64: string = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const FileSystem = await import('expo-file-system/legacy');
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: 'base64' as any });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType, dialogTitle: filename });
  }
}

// ─── PDF Export ─────────────────────────────────────────────────────────────

function buildCalendarHTML(shifts: Shift[], month: string, shiftTypes: ShiftType[], year: string): string {
  const monthShifts = new Map<string, Shift>();
  shifts.filter((s) => s.date.startsWith(month)).forEach((s) => monthShifts.set(s.date, s));

  // Build all days of the month
  const firstDay = new Date(month + '-01T12:00:00');
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const days: { date: string; dayNum: number; weekday: string; shift?: Shift }[] = [];
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dt = new Date(dateStr + 'T12:00:00');
    days.push({ date: dateStr, dayNum: d, weekday: weekdayNames[dt.getDay()], shift: monthShifts.get(dateStr) });
  }

  const shiftTypeMap = new Map<string, ShiftType>();
  shiftTypes.forEach((st) => shiftTypeMap.set(st.name, st));

  const dayRows = days.map((d) => {
    const isWeekend = d.weekday === 'Sáb' || d.weekday === 'Dom';
    const color = d.shift ? resolveShiftColor(d.shift.shift_type, shiftTypeMap.get(d.shift.shift_type)?.color) : 'transparent';
    const bg = d.shift ? `${color}22` : (isWeekend ? '#f8f8f8' : 'white');
    const border = d.shift ? `2px solid ${color}` : '1px solid #e5e7eb';
    return `
      <tr style="background:${bg}; border-left: ${border};">
        <td style="padding:8px 12px; font-weight:600; color:#374151;">${d.dayNum}</td>
        <td style="padding:8px 12px; color:#6b7280;">${d.weekday}</td>
        <td style="padding:8px 12px;">
          ${d.shift ? `<span style="color:${color}; font-weight:700;">${d.shift.shift_type}</span>` : '<span style="color:#d1d5db;">—</span>'}
        </td>
        <td style="padding:8px 12px; color:#374151; font-size:13px;">
          ${d.shift?.start_time && d.shift?.end_time ? `${d.shift.start_time} – ${d.shift.end_time}` : ''}
        </td>
        <td style="padding:8px 12px; color:#6b7280; font-size:12px;">${d.shift?.note || ''}</td>
      </tr>`;
  }).join('');

  const total = days.filter((d) => d.shift).length;
  const offDays = days.filter((d) => d.shift && /folga|off|descanso/i.test(d.shift.shift_type)).length;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #111; }
    h1 { color: #1d4ed8; margin: 0 0 4px; font-size: 22px; }
    p.sub { color: #6b7280; font-size: 13px; margin: 0 0 20px; }
    .kpi { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 12px 18px; flex: 1; }
    .kpi-val { font-size: 26px; font-weight: 800; color: #0369a1; }
    .kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>Escala Mensal — ${formatMonth(month)}</h1>
  <p class="sub">Gerado em ${new Date().toLocaleString('pt-PT')} · Ano ${year}</p>
  <div class="kpi">
    <div class="kpi-card"><div class="kpi-val">${total}</div><div class="kpi-label">Turnos</div></div>
    <div class="kpi-card"><div class="kpi-val">${daysInMonth - total}</div><div class="kpi-label">Sem turno</div></div>
    <div class="kpi-card"><div class="kpi-val">${offDays}</div><div class="kpi-label">Folgas</div></div>
  </div>
  <table>
    <thead><tr><th>Dia</th><th>Semana</th><th>Turno</th><th>Horário</th><th>Nota</th></tr></thead>
    <tbody>${dayRows}</tbody>
  </table>
  <footer>Turnos PSP · Aplicação de gestão de turnos</footer>
</body>
</html>`;
}

export async function exportMonthlyPDF(
  shifts: Shift[],
  month: string,
  shiftTypes: ShiftType[],
  year: string,
): Promise<void> {
  const html = buildCalendarHTML(shifts, month, shiftTypes, year);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Escala ${month}` });
  }
}
