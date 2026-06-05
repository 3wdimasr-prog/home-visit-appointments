# مواعيد الزيارة المنزلية

مشروع جديد مستقل بنفس فكرة مشروع مختبرات الخلايا الطبية الأخير، لكن بجدول مستقل باسم:
home_visits

## الحقول
- تاريخ موعد الزيارة المنزلية
- اسم الحي
- اسم المريض
- رقم الجوال واتس
- رقم الجوال اتصال
- نوع التحليل: صيام / لا صيام
- منسق المواعيد: SA / وعد / ملوك / جود / مؤيد / محمد
- النتائج: released / Pending
- طريقة الدفع: شبكة / صفر كاش
- السعر
- الملاحظات

## خطوات التشغيل
1. أنشئ GitHub repo جديد مثل:
   home-visit-appointments

2. ارفع ملفات المشروع.

3. في Supabase SQL Editor شغل:
   supabase_home_visits_schema.sql

4. في Vercel أضف Environment Variables:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY

5. Deploy.

## ملاحظة
يمكنك استخدام نفس مشروع Supabase الحالي، لأن هذا المشروع يستخدم جدول جديد مستقل:
home_visits
