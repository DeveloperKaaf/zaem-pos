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
import { UserPlus, Shield, Trash2, RefreshCw } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'CASHIER' });

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchUsers();
        setFormData({ username: '', password: '', name: '', role: 'CASHIER' });
      }
    } catch (e) { alert('خطأ في الإضافة'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الموظف؟')) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchUsers();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800">إدارة الموظفين والصلاحيات</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold h-12">
              <UserPlus className="ml-2 h-5 w-5" /> إضافة موظف جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle className="text-xl font-bold">بيانات الموظف الجديد</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} placeholder="أحمد محمد" />
              </div>
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input value={formData.username} onChange={(e)=>setFormData({...formData, username: e.target.value})} placeholder="ahmed_pos" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="password" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddUser} className="w-full h-12 bg-blue-600 font-bold">تفعيل الحساب</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table dir="rtl">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">الموظف</TableHead>
                <TableHead className="font-bold">اسم المستخدم</TableHead>
                <TableHead className="font-bold">الصلاحية</TableHead>
                <TableHead className="text-left font-bold">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 animate-pulse font-bold text-slate-400">جاري التحميل...</TableCell></TableRow>
              ) : users.map((user: any) => (
                <TableRow key={user.id} className="hover:bg-slate-50 border-b">
                  <TableCell className="font-black text-slate-700 py-4">{user.name}</TableCell>
                  <TableCell className="font-mono text-slate-500 font-bold">{user.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit text-xs font-black border border-blue-100 uppercase">
                      <Shield className="h-3 w-3" /> {user.role === 'ADMIN' ? 'مدير عام' : 'كاشير'}
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-10 w-10">
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
  );
}
