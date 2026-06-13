"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Coffee, Plus, Trash2, Save, RefreshCw, Package } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', price: '', category: 'مشروبات', stock: '0' });
  const router = useRouter();

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAddProduct = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            ...formData,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock)
        })
      });
      if (res.ok) {
        fetchProducts();
        setFormData({ name: '', price: '', category: 'مشروبات', stock: '0' });
      }
    } catch (e) { alert('خطأ في الإضافة'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الصنف من المنيو؟')) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchProducts();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة المخزون والمنيو</h1>
            <p className="text-slate-500 font-bold text-sm">إضافة المنتجات ومتابعة الكميات المتوفرة في الكوفي</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 h-12 px-6 shadow-lg font-bold">
              <Plus className="ml-2 h-5 w-5" /> إضافة صنف جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">إضافة صنف للمنيو والمخزون</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اسم المنتج</Label>
                <Input value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} placeholder="مثال: بيبسي، كود رد، ماء" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>السعر (ريال)</Label>
                    <Input type="number" value={formData.price} onChange={(e)=>setFormData({...formData, price: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>الكمية المتوفرة</Label>
                    <Input type="number" value={formData.stock} onChange={(e)=>setFormData({...formData, stock: e.target.value})} placeholder="0" />
                  </div>
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Input value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} placeholder="مثال: مشروبات غازية" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddProduct} className="w-full h-12 bg-blue-600 font-bold text-lg">تأكيد الإضافة</Button>
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
                  <TableHead className="font-black text-slate-700">الصنف</TableHead>
                  <TableHead className="font-black text-slate-700">التصنيف</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">السعر</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">المخزون (الكمية)</TableHead>
                  <TableHead className="font-black text-slate-700 text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse text-slate-400 font-bold">جاري تحميل قائمة المنتجات...</TableCell></TableRow>
                ) : products.map((product: any) => (
                  <TableRow key={product.id} className="hover:bg-slate-50 transition-colors border-b">
                    <TableCell className="font-bold text-slate-800 py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Coffee className="h-5 w-5" /></div>
                            <span className="text-lg">{product.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-black text-blue-700 text-xl">{product.price.toFixed(2)} ريال</TableCell>
                    <TableCell className="text-center">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black border ${product.stock <= 5 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            <Package className="h-4 w-4" />
                            {product.stock}
                        </div>
                        {product.stock <= 5 && <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">كمية منخفضة!</p>}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-10 w-10">
                        <Trash2 className="h-5 w-5" />
                      </Button>
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
