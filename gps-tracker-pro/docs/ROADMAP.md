# Capture Tracking GPS — خارطة الطريق

آخر تحديث: يونيو 2026

## الحالة الحالية

| المجال | الحالة |
|--------|--------|
| React + Vite + Traccar API/WebSocket | مكتمل |
| i18n (ar / fr / en) + RTL | مكتمل |
| إشعارات Traccar (18 حدث + 35 alarm) + فلتر per-device | مكتمل |
| اختبارات | 54/54 |
| CI (GitHub Actions) | مكتمل |
| تأمين الأسرار (gitignore, audit, validate scripts) | مكتمل |
| أيقونات PWA + manifest | مكتمل |
| Docker dev (`:3000`) + production compose | مكتمل |
| SSL bootstrap (`deploy-production.sh init`) | مُصلَح — غير منشور بعد |
| PWA Service Worker + تحديثات | مُصلَح — غير منشور بعد |
| DNS `gps-tracker-pro.ma` | **غير مربوط** |
| HTTPS على Hetzner | **لم يُنفَّذ بعد** |

---

## المرحلة 0 — الآن (قبل Hetzner)

**الهدف:** دفع آخر الإصلاحات واختبار HTTP على IP السيرفر.

- [ ] Commit + push: SSL init fix, PWA SW, CSP fonts, `deploy-production.sh http`
- [ ] تدوير `ADMIN_PASSWORD` و `TRACCAR_SERVICE_TOKEN` (كانت في git history)
- [ ] على Hetzner: `git pull` + `./scripts/deploy-production.sh http`
- [ ] تحقق: `http://<HETZNER_IP>/` و `http://<HETZNER_IP>/api/server` → 200
- [ ] تسجيل الدخول + خريطة + WebSocket

**أوامر:**

```bash
cd gps-tracker-pro
./scripts/validate-production-secrets.sh
./scripts/audit-secrets.sh
./scripts/deploy-production.sh http
```

---

## المرحلة 1 — الإطلاق (DNS + SSL)

**الهدف:** `https://gps-tracker-pro.ma` يخدم بأمان.

**المتطلبات:**

| Record | القيمة |
|--------|--------|
| `A` gps-tracker-pro.ma | IP Hetzner |
| `A` www.gps-tracker-pro.ma | IP Hetzner |

**الخطوات:**

```bash
dig +short gps-tracker-pro.ma A          # يجب أن يطابق IP السيرفر
./scripts/deploy-production.sh init      # certbot + edge HTTPS
./scripts/deploy-production.sh verify
```

**معايير النجاح:**

- [ ] `https://gps-tracker-pro.ma/api/server` → 200
- [ ] `Strict-Transport-Security` في headers
- [ ] تسجيل الدخول يعمل
- [ ] WebSocket (إشعارات حية) يعمل
- [ ] Port 8082 غير مفتوح للعموم (ufw + Hetzner firewall)

---

## المرحلة 2 — تشغيل إنتاجي مستقر

**الهدف:** بيانات آمنة، مراقبة، نسخ احتياطي.

| المهمة | الأولوية | الجهد |
|--------|----------|-------|
| نسخ احتياطي يومي (`traccar-data` volume + `.env.production`) | عالية | 1 يوم |
| مراقبة uptime (`/api/server` كل 5 دقائق) | عالية | ساعات |
| `fail2ban` على SSH | متوسطة | ساعات |
| Rate limit على `/api/session` (nginx) | متوسطة | نصف يوم |
| تفعيل CSRF في nginx (`csrf.conf`) | متوسطة | نصف يوم |
| 2FA إلزامي لحساب admin | متوسطة | ساعات |
| Docker Scout / تحديث الصور دورياً | منخفضة | مستمر |

---

## المرحلة 3 — PostgreSQL (بدل H2)

**الهدف:** قاعدة بيانات production-grade مع نسخ احتياطي واستعادة.

**لماذا:** Traccar production يستخدم H2 داخل volume — مناسب للاختبار، غير مثالي للإنتاج طويل الأمد.

**المهام:**

1. إضافة خدمة `postgres` في `docker-compose.production.yml`
2. تحديث `docker/traccar.production.xml` (PostgreSQL driver)
3. سكربت migration من H2 → PostgreSQL (أو بداية fresh على السيرفر الجديد)
4. نسخ احتياطي `pg_dump` يومي
5. توثيق الاستعادة

**تقدير:** 2–3 أيام عمل

---

## المرحلة 4 — تحسينات التطبيق

### 4.1 إشعارات

| الميزة | الحالة | العمل المطلوب |
|--------|--------|----------------|
| Traccar WebSocket events | مكتمل | — |
| per-device filter | مكتمل | — |
| storm / rain / fog toggles | UI فقط | ربط OpenWeather أو إخفاء toggles |
| email notification toggle | UI فقط | ربط Traccar mail أو إزالة |
| Web Push (FCM/VAPID) | غير موجود | backend + SW push |

### 4.2 أداء

| الميزة | التفاصيل |
|--------|----------|
| Code splitting | Bundle ~1.3MB — `React.lazy` للصفحات الثقيلة |
| Map tile cache | SW cache للمناطق المتكررة |
| WebSocket reconnect | backoff محسّن عند انقطاع الشبكة |

### 4.3 PWA / Mobile

| الميزة | الحالة |
|--------|--------|
| أيقونات + manifest | مكتمل |
| Service Worker + offline shell | مكتمل |
| Install prompt مخصص | مخطط |
| Web Push | مخطط (مرحلة 4.1) |

### 4.4 تقارير

| موجود | مخطط |
|--------|-------|
| Trips, Events, Summary, Stops | Maintenance report |
| PDF / Excel export | تقارير مجدولة بالبريد |
| — | Analytics (وقود، توقف، اتجاهات) |

---

## المرحلة 5 — بنية تحتية متقدمة

```
المرحلة 1 (الإطلاق)     Docker Compose على Hetzner CX33
المرحلة 3               PostgreSQL + backups
المرحلة 5a              Staging (subdomain + فرع git)
المرحلة 5b              CI/CD: GitHub Actions → auto deploy
المرحلة 5c              Cloudflare CDN للـ static assets
```

---

## ما لا يدخل في النطاق الحالي

- تطبيق mobile native (React Native) — PWA كافٍ للمرحلة الأولى
- Multi-tenant / SaaS billing — تطبيق fleet واحد لكل نشر
- بروتوكولات GPS مخصصة — Traccar يتولى `:5023`

---

## ترتيب التنفيذ الموصى به

```
المرحلة 0  →  commit + http test على Hetzner
     ↓
المرحلة 1  →  DNS + SSL init
     ↓
المرحلة 2  →  backups + monitoring
     ↓
المرحلة 3  →  PostgreSQL
     ↓
المرحلة 4  →  perf + notifications + reports
     ↓
المرحلة 5  →  CI/CD + staging + CDN
```

---

## مراجع

- [DEPLOY-HETZNER.md](./DEPLOY-HETZNER.md) — نشر السيرفر خطوة بخطوة
- [TOTP-ENROLLMENT.md](./TOTP-ENROLLMENT.md) — تفعيل 2FA
