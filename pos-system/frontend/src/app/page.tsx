import { redirect } from 'next/navigation';

export default function RootPage() {
  // توجيه المستخدم تلقائياً إلى لوحة التحكم عند فتح الرابط الرئيسي
  redirect('/dashboard');
}
