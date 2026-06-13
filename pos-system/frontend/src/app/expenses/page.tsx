"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Receipt, RefreshCw, Landmark } from "lucide-react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { API_BASE_URL } from "@/config";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ description: '', amount: '', category: 'عام' });
  const router = useRouter();

  const fetchExpenses = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleAddExpense = async () => {
    if (!formData.description || !formData.amount) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchExpenses();
        setFormData({ description: '', amount: '', category: 'عام' });
      }
    } catch (e) { alert('خطأ في الإضافة'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchExpenses();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة المصروفات</h1>
            <p className="text-slate-500 font-bold text-sm">تسجيل المصاريف اليومية والتشغيلية للمركز</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 h-12 px-6 shadow-lg font-bold">
              <Plus className="ml-2 h-5 w-5" /> إضافة مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">تسجيل مصروف</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الوصف (مثال: إيجار، فاتورة كهرباء)</Label>
                <Input value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} placeholder="أدخل الوصف" />
              </div>
              <div className="space-y-2">
                <Label>المبلغ (ريال)</Label>
                <Input type="number" value={formData.amount} onChange={(e)=>setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={formData.category} onValueChange={(v)=>setFormData({...formData, category: v})}>
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="بضاعة">شراء بضاعة (بوفيه)</SelectItem>
                        <SelectItem value="فواتير">فواتير (كهرباء، ماء، إنترنت)</SelectItem>
                        <SelectItem value="رواتب">رواتب موظفين</SelectItem>
                        <SelectItem value="صيانة">صيانة وإصلاحات</SelectItem>
                        <SelectItem value="إيجار">إيجار المحل</SelectItem>
                        <SelectItem value="عام">أخرى / عام</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExpense} className="w-full h-12 bg-red-600 font-bold">حفظ المصروف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-xl border-none overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-700">التاريخ</TableHead>
                  <TableHead className="font-black text-slate-700">الوصف</TableHead>
                  <TableHead className="font-black text-slate-700">التصنيف</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">المبلغ</TableHead>
                  <TableHead className="font-black text-slate-700 text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse text-slate-400">جاري التحميل...</TableCell></TableRow>
                ) : expenses.map((exp: any) => (
                  <TableRow key={exp.id} className="hover:bg-red-50/30 transition-colors border-b">
                    <TableCell className="font-mono text-slate-500 text-xs">
                        {format(new Date(exp.date), 'yyyy/MM/dd', { locale: ar })}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{exp.description}</TableCell>
                    <TableCell>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                            {exp.category}
                        </span>
                    </TableCell>
                    <TableCell className="text-center font-black text-red-600 text-lg">-{exp.amount.toFixed(2)} ريال</TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && expenses.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-300 italic">لم يتم تسجيل أي مصروفات حتى الآن</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
