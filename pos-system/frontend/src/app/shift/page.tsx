"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, RefreshCw, Calculator, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle, XCircle, CreditCard, Landmark } from "lucide-react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { API_BASE_URL } from "@/config";

export default function ShiftPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();

  const fetchShiftData = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/reports/shift`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { router.push('/login'); return; }
      const report = await res.json();
      setData(report);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShiftData(); }, []);

  const handleEndShift = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في إنهاء الشفت؟ سيتم تصفير المبالغ وتسجيل خروجك.")) return;

    setIsEnding(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/reports/shift/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        // مسح بيانات الشفت والجلسة
        localStorage.removeItem('shiftStarted');
        localStorage.removeItem('shiftUser');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert("حدث خطأ أثناء محاولة إغلاق الشفت في السيرفر");
      }
    } catch (e) {
      alert("خطأ في الاتصال بالسيرفر");
    } finally {
      setIsEnding(false);
    }
  };

  const handlePrintAndClose = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !data) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تقرير تقفيل الشفت - ${data.cashierName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1e293b; font-size: 28px; }
            .header p { margin: 5px 0; color: #64748b; }
            .stats-container { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .stat-box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .stat-box.highlight { background: #f8fafc; border-left: 5px solid #3b82f6; }
            .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .stat-row:last-child { border-bottom: none; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 14px; }
            th { background: #f8fafc; color: #475569; font-weight: bold; text-align: right; padding: 12px; border: 1px solid #e2e8f0; }
            td { padding: 10px; border: 1px solid #e2e8f0; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; font-weight: bold; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #ddd; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1>مركز زعيم الكرة للترفية</h1>
            <h2>تقرير تسليم عهدة (تقفيل شفت)</h2>
            <p>تاريخ التقرير: ${format(new Date(), 'PPP p', { locale: ar })}</p>
          </div>

          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-row"><span>اسم الموظف:</span> <strong>${data.cashierName}</strong></div>
              <div class="stat-row"><span>عدد الفواتير:</span> <strong>${data.ordersCount}</strong></div>
              <div class="stat-row"><span>دخل الألعاب:</span> <strong>${data.timeTotal?.toFixed(2)} ريال</strong></div>
              <div class="stat-row"><span>دخل الكوفي شوب:</span> <strong>${data.itemsTotal?.toFixed(2)} ريال</strong></div>
            </div>
            <div class="stat-box highlight">
              <div class="stat-row"><span>إجمالي الإيرادات:</span> <strong>${data.totalRevenue?.toFixed(2)} ريال</strong></div>
              <div class="stat-row" style="color: #059669;"><span>العهدة الافتتاحية:</span> <strong>${data.floatAmount?.toFixed(2)} ريال</strong></div>
              <div class="stat-row" style="color: #059669;"><span>إجمالي الكاش (Cash):</span> <strong>${data.cashTotal?.toFixed(2)} ريال</strong></div>
              <div class="stat-row" style="color: #2563eb;"><span>إجمالي الشبكة (Network):</span> <strong>${data.netTotal?.toFixed(2)} ريال</strong></div>
              <div class="stat-row" style="color: #ef4444;"><span>إجمالي المصروفات:</span> <strong>${data.totalExpenses?.toFixed(2)} ريال</strong></div>
              <div class="stat-row" style="font-size: 1.2em; border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 10px;">
                <span>صافي المبلغ للتسليم:</span> <strong>${data.grandTotal?.toFixed(2)} ريال</strong>
              </div>
            </div>
          </div>

          <h3>تفصيل المصروفات:</h3>
          <table>
            <thead>
              <tr><th>الوصف</th><th>الفئة</th><th>المبلغ</th></tr>
            </thead>
            <tbody>
              ${data.expenses?.length > 0 ? data.expenses.map((e: any) => `
                <tr>
                  <td>${e.description}</td>
                  <td>${e.category}</td>
                  <td style="color: #ef4444;">${e.amount?.toFixed(2)} ريال</td>
                </tr>
              `).join('') : '<tr><td colspan="3" style="text-align:center;">لا توجد مصروفات</td></tr>'}
            </tbody>
          </table>

          <h3>كشف المبيعات التفصيلي:</h3>
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>الجهاز / الصنف</th>
                <th>طريقة الدفع</th>
                <th>الوقت</th>
                <th>ألعاب</th>
                <th>كوفي</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${data.invoices?.map((inv: any) => `
                <tr>
                  <td>#${inv.id}</td>
                  <td>${inv.resource}</td>
                  <td><span class="badge">${inv.paymentMethod === 'NET' ? 'شبكة 💳' : 'كاش 💵'}</span></td>
                  <td>${inv.date ? format(new Date(inv.date), 'hh:mm a', { locale: ar }) : '-'}</td>
                  <td>${inv.timeAmount?.toFixed(2)}</td>
                  <td>${inv.itemsAmount?.toFixed(2)}</td>
                  <td style="font-weight:bold;">${inv.amount?.toFixed(2)} ريال</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>توقيع الموظف: ............................</div>
            <div>توقيع المدير: ............................</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-2xl text-slate-400">جاري مراجعة الحسابات المالية...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">تقفيل الشفت والعهدة</h1>
          <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">Shift Closure & Fund Transfer</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={fetchShiftData} variant="outline" className="bg-white border-2 border-slate-200 font-bold h-12 px-6">
            <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </Button>
          <Button onClick={handleEndShift} disabled={isEnding} variant="destructive" className="font-black h-12 px-6 shadow-lg">
            <XCircle className="ml-2 h-5 w-5" /> {isEnding ? "جاري الإغلاق..." : "إنهاء الشفت"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-2xl border-none bg-slate-900 text-white overflow-hidden">
            <CardHeader className="border-b border-white/10 p-6 bg-slate-800/50">
              <CardTitle className="flex items-center gap-3 text-blue-400 text-xl">
                <Calculator className="h-6 w-6" /> ملخص العهدة النقدية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="text-emerald-400 h-5 w-5" />
                  <span className="text-slate-400 font-bold">العهدة الافتتاحية:</span>
                </div>
                <span className="text-xl font-black text-white">{data?.floatAmount?.toFixed(2)} ريال</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <Wallet className="text-emerald-400 h-5 w-5" />
                  <span className="text-slate-400 font-bold">إجمالي الكاش:</span>
                </div>
                <span className="text-xl font-black text-white">{data?.cashTotal?.toFixed(2)} ريال</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <Landmark className="text-blue-400 h-5 w-5" />
                  <span className="text-slate-400 font-bold">إجمالي الشبكة:</span>
                </div>
                <span className="text-xl font-black text-blue-400">{data?.netTotal?.toFixed(2)} ريال</span>
              </div>
              <div className="flex justify-between items-center bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="text-red-400 h-5 w-5" />
                  <span className="text-red-200 font-bold">المصروفات:</span>
                </div>
                <span className="text-xl font-black text-red-400">-{data?.totalExpenses?.toFixed(2)} ريال</span>
              </div>

              <div className="pt-6 border-t border-white/10 mt-4">
                <p className="text-center text-blue-300 text-sm font-black uppercase mb-3 tracking-widest">المبلغ الصافي للتسليم</p>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-inner border border-white/20">
                    <h2 className="text-5xl font-black text-center text-white tracking-tighter">
                        {data?.grandTotal?.toFixed(2)} <span className="text-xl">ريال</span>
                    </h2>
                </div>
              </div>
              <Button onClick={handlePrintAndClose} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-xl font-black mt-6 shadow-2xl shadow-blue-900/50 rounded-2xl">
                <Printer className="ml-2 h-7 w-7" /> طباعة تقرير التسليم
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 shadow-2xl border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Wallet className="h-8 w-8 text-blue-600" /> كشف مبيعات الشفت
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black text-slate-500">الفاتورة</TableHead>
                  <TableHead className="font-black text-slate-500">الجهاز / الصنف</TableHead>
                  <TableHead className="font-black text-slate-500">طريقة الدفع</TableHead>
                  <TableHead className="font-black text-slate-500">الوقت</TableHead>
                  <TableHead className="font-black text-slate-500 text-center">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.invoices?.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-blue-50/30 border-b border-slate-100">
                    <TableCell className="font-mono font-bold text-slate-400">#{inv.id}</TableCell>
                    <TableCell>
                      <div className="font-black text-slate-800">{inv.resource}</div>
                      {inv.itemsAmount > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold">كوفي: {inv.itemsAmount}</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${inv.paymentMethod === 'NET' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {inv.paymentMethod === 'NET' ? 'شبكة 💳' : 'كاش 💵'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-bold">
                        {inv.date ? format(new Date(inv.date), 'hh:mm a', { locale: ar }) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                        <span className="font-black text-emerald-600 text-lg bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                            {inv.amount?.toFixed(2)}
                        </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
