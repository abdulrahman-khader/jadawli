# جداولي — اختبارات جدول الضرب والقسمة

موقع للمعلمين: فصول وطلاب، اختبار بمؤقت لكل سؤال، تقارير PDF برسوم بيانية، خطة علاجية وورقة عمل لكل طالب.
مبني بـ **React + Vite**، والبيانات في **Firebase**، والنشر تلقائي على **GitHub Pages**.

---

## التشغيل لأول مرة (مرة واحدة فقط)

### ١. Firebase (قاعدة البيانات وتسجيل الدخول)
1. ادخل **console.firebase.google.com** ← **Create a project** ← سمّه `jadawli` ← أطفئ Google Analytics ← **Create project**.
2. **Build ← Authentication ← Get started** ← **Email/Password** ← فعّل الخيار الأول ← **Save**.
3. **Build ← Firestore Database ← Create database** ← اختر موقعاً قريباً ← **Start in production mode** ← **Create**.
4. في تبويب **Rules** الصق هذا ثم **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /users/{uid}/{doc=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. ⚙ **Project settings** ← أسفل الصفحة أيقونة الويب **</>** ← سجّل التطبيق ← اترك الصفحة مفتوحة (فيها apiKey وغيرها).

### ٢. GitHub (رفع المشروع)
1. أنشئ حساباً في **github.com**.
2. **+ ← New repository** ← الاسم `jadawli` ← **Public** ← **Create repository**.
3. اضغط **uploading an existing file** واسحب **كل محتويات** مجلد المشروع (بعد فك الضغط) ← **Commit changes**.
4. تأكد أن مجلد `.github` ظهر في المشروع. إذا لم يظهر (الماك يخفيه):
   **Add file ← Create new file** ← اكتب الاسم `.github/workflows/deploy.yml` ← الصق محتوى الملف نفسه من المشروع ← **Commit changes**.

### ٣. تشغيل النشر التلقائي
**Settings ← Pages ← Source: GitHub Actions**.

### ٤. ضع إعدادات Firebase
في GitHub افتح `src/firebase-config.js` ← أيقونة القلم ✏️ ← الصق القيم بين علامات التنصيص ← **Commit changes**.
خلال دقيقتين يُبنى الموقع وينشر. تابع التقدم من تبويب **Actions** (العلامة الخضراء ✓ تعني نجح).
الرابط: `https://اسم-المستخدم.github.io/jadawli/`

### ٥. اسمح للرابط بتسجيل الدخول
Firebase ← **Authentication ← Settings ← Authorized domains ← Add domain** ← `اسم-المستخدم.github.io`

---

## التعديل لاحقاً
أي ملف تعدّله أو ترفعه في GitHub يُنشر تلقائياً خلال دقيقتين. البيانات في Firebase لا تتأثر.

## للمطوّرين
```
npm install
npm run dev      # تشغيل محلي
npm run build    # بناء في مجلد dist
```

| المجلد | المحتوى |
|---|---|
| `src/lib` | التخزين، الحسابات، الخطة العلاجية، التوجيه |
| `src/components` | عناصر الواجهة والرسوم البيانية |
| `src/views` | الصفحات |
| `src/views/Docs.jsx` | تقارير PDF وورقة العمل |
