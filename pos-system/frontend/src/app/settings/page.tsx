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
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, RefreshCw, Gamepad2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function SettingsPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Resource State
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
      if (res.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleAddResource = async () => {
    if (!newName || !newType) {
        alert("يرجى إدخال الاسم ونوع اللعبة");
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) { alert('يجب تسجيل الدخول مجدداً'); router.push('/login'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          type: newType,
          prices: [
            { durationMin: 60, price: 30 },
            { durationMin: 0, price: 0 } // Default for open time
          ]
        })
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewName('');
        setNewType('BILLIARD_TABLE');
        fetchResources();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'خطأ في إضافة الجهاز');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالسيرفر');
    }
  };

  const handleUpdateResource = async (resourceId: string, updatedData: any) => {
    const token = localStorage.getItem('token');
    if (!token) { alert('يجب تسجيل الدخول'); router.push('/login'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        alert('تم حفظ التعديلات بنجاح');
        fetchResources();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'حدث خطأ أثناء الحفظ');
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال بالسيرفر');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز نهائياً؟ سيتم حذف كافة السجلات المالية المرتبطة به.')) return;

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

      if (res.ok) {
        alert('تم الحذف بنجاح');
        fetchResources();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`فشل الحذف: ${data.message || 'عذراً، لا تملك الصلاحية أو هناك جلسة نشطة'}`);
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال بالسيرفر أثناء الحذف');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('تحذير نهائي: هل أنت متأكد من حذف جميع الأجهزة وكافة السجلات المالية والتقارير المرتبطة بها؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    const token = localStorage.getItem('token');
    if (!token) {
        alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
        router.push('/login');
        return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/resources/all`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert('تم حذف جميع الأجهزة بنجاح');
        fetchResources();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`فشل الحذف الجماعي: ${data.message || 'عذراً، لا تملك الصلاحية أو هناك جلسات نشطة'}`);
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال بالسيرفر أثناء الحذف الجماعي');
    }
  };

  if (loading) return <div className="p-10 text-center font-bold">جاري تحميل الإعدادات...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800">إدارة الأجهزة والأنواع</h1>

        <div className="flex gap-2">
          <Button onClick={fetchResources} variant="outline" size="icon" className="h-12 w-12 shadow-sm">
            <RefreshCw className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleDeleteAll}
            variant="destructive"
            className="h-12 px-6 font-bold shadow-lg"
          >
            <Trash2 className="ml-2 h-5 w-5" /> حذف الكل
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 h-12 px-6 shadow-lg font-bold">
                <Plus className="ml-2 h-5 w-5" /> إضافة صنف جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">إضافة جهاز أو طاولة جديدة</DialogTitle>
                <DialogDescription className="text-slate-500">
                  قم بإدخال بيانات الجهاز الجديد لتتمكن من بدء الجلسات عليه.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>الاسم (مثال: طاولة 10، فرفيرة 2)</Label>
                  <Input
                    placeholder="أدخل الاسم هنا"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع اللعبة / التصنيف</Label>
                  <Input
                    placeholder="مثال: VR, PING_PONG"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddResource} className="w-full h-12 bg-blue-600 font-bold">تأكيد الإضافة</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {resources.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Gamepad2 className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-lg">لا يوجد أجهزة مضافة حالياً</p>
          </div>
        ) : (
          resources.map((resource: any) => (
            <ResourceSettingsCard
              key={resource.id}
              resource={resource}
              onSave={(data) => handleUpdateResource(resource.id, data)}
              onDelete={() => handleDeleteResource(resource.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ResourceSettingsCard({ resource, onSave, onDelete }: { resource: any, onSave: (data: any) => void, onDelete: () => void }) {
  const [name, setName] = useState(resource.name);
  const [type, setType] = useState(resource.type);
  const [tuyaId, setTuyaId] = useState(resource.tuyaDeviceId || '');
  const [prices, setPrices] = useState(resource.prices || []);

  const addPriceRow = () => {
    setPrices([...prices, { durationMin: 60, price: 30 }]);
  };

  const removePriceRow = (index: number) => {
    setPrices(prices.filter((_, i) => i !== index));
  };

  const updatePriceRow = (index: number, field: string, value: any) => {
    const newPrices = [...prices];
    newPrices[index][field] = Number(value);
    setPrices(newPrices);
  };

  return (
    <Card className="border-r-4 border-r-blue-600 shadow-sm bg-white overflow-hidden">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-xl font-bold text-blue-900">
          <div className="flex items-center gap-4 flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="font-bold text-lg bg-white w-64" />
            <Input value={type} onChange={(e) => setType(e.target.value)} className="bg-gray-50 text-sm w-40" />
          </div>
          <div className="flex gap-2 mr-4">
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:bg-red-50">
              <Trash2 className="ml-2 h-4 w-4" /> حذف
            </Button>
            <Button variant="outline" size="sm" onClick={addPriceRow} className="text-blue-600 border-blue-600">
              <Plus className="ml-2 h-4 w-4" /> إضافة وقت
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 font-bold text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <div>المدة (دقائق)</div>
            <div>السعر (ريال)</div>
            <div>حذف</div>
          </div>
          {prices.map((p: any, index: number) => (
            <div key={index} className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Input type="number" value={p.durationMin} onChange={(e) => updatePriceRow(index, 'durationMin', e.target.value)} />
                <span className="text-xs text-gray-400 w-20">{p.durationMin == 0 ? 'وقت مفتوح' : 'دقيقة'}</span>
              </div>

              {/* إخفاء حقل السعر إذا كانت المدة 0 كما في الطلب رقم 9 */}
              {p.durationMin != 0 ? (
                <Input type="number" value={p.price} onChange={(e) => updatePriceRow(index, 'price', e.target.value)} />
              ) : (
                <div className="bg-slate-100 h-10 px-3 rounded flex items-center text-slate-400 text-xs font-bold border border-dashed border-slate-300">
                  سيتم حساب السعر بناءً على وقت البدء والإغلاق
                </div>
              )}

              <Button variant="ghost" size="icon" onClick={() => removePriceRow(index)}>
                <Trash2 className="h-4 w-4 text-red-300" />
              </Button>
            </div>
          ))}
          <div className="pt-4 border-t flex justify-between items-end">
             <div className="space-y-2">
                <Label className="text-gray-500">Smart Life (Tuya Device ID)</Label>
                <Input value={tuyaId} onChange={(e) => setTuyaId(e.target.value)} className="w-80 bg-white" />
             </div>
             <Button className="bg-blue-600 hover:bg-blue-700 px-8 h-12 font-bold" onClick={() => onSave({ name, type, tuyaDeviceId: tuyaId, prices })}>
                <Save className="ml-2 h-5 w-5" /> حفظ التعديلات
             </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
