"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function SettingsPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('BILLIARD_TABLE');
  const router = useRouter();

  const fetchResources = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, []);

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز وكل سجلاته المالية نهائياً؟')) return;

    const token = localStorage.getItem('token');
    if (!token) {
        alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
        router.push('/login');
        return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert('تم الحذف بنجاح');
        fetchResources();
      } else {
        alert(`فشل الحذف: ${data.message || 'عذراً، لا تملك الصلاحية أو هناك جلسة نشطة'}`);
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال بالسيرفر');
    }
  };

  const handleAddResource = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newName,
        type: newType,
        prices: [{ durationMin: 60, price: 30 }, { durationMin: 0, price: 30 }]
      })
    });
    if (res.ok) {
        setIsAddOpen(false);
        setNewName('');
        fetchResources();
    } else {
        const data = await res.json();
        alert(data.message || 'خطأ في الإضافة');
    }
  };

  if (loading) return <div className="p-10 text-center font-bold">جاري تحميل الإعدادات...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800">إدارة الأجهزة</h1>
        <div className="flex gap-2">
          <Button onClick={fetchResources} variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button className="bg-blue-600 font-bold h-12 px-6 shadow-lg"><Plus className="ml-2 h-5 w-5" /> إضافة جهاز جديد</Button></DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle className="text-xl font-bold">إضافة جهاز أو طاولة</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>اسم الجهاز</Label>
                    <Input placeholder="مثال: طاولة بلياردو 1" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>التصنيف</Label>
                    <Input placeholder="مثال: PS5" value={newType} onChange={(e) => setNewType(e.target.value)} />
                </div>
              </div>
              <DialogFooter><Button onClick={handleAddResource} className="w-full h-12 bg-blue-600 font-bold">تأكيد الإضافة</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {resources.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold">لا يوجد أجهزة مضافة حالياً</div>
        ) : resources.map((resource: any) => (
          <Card key={resource.id} className="p-6 border-r-4 border-blue-600 shadow-sm hover:shadow-md transition-shadow bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black">
                    {resource.name.charAt(0)}
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">{resource.name}</h3>
                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">{resource.type}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-600 hover:bg-red-50 font-bold"
                onClick={() => handleDeleteResource(resource.id)}
              >
                <Trash2 className="ml-2 h-5 w-5" /> حذف الجهاز نهائياً
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
