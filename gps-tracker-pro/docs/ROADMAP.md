# Capture Tracking GPS — خارطة الطريق

آخر تحديث: يونيو 2026

## الحالة الحالية

| المجال | الحالة |
|--------|--------|
| React + Vite + Traccar API/WebSocket | مكتمل |
| i18n (ar / fr / en) + RTL | مكتمل |
| إشعارات Traccar (18 حدث + 35 alarm) + فلتر per-device | مكتمل |
| polish الصفحات (Dashboard, Map, Vehicles, Devices, Users, Reports, Settings, Profile) | مكتمل |
| رفع صورة الملف الشخصي (`captureAvatar`) | مكتمل |
| تصدير التقارير CSV/PDF/Excel | مكتمل |
| بحث Navbar → `/vehicles?q=` | مكتمل |
| سياسة كلمة المرور موحّدة (12 حرف) | مكتمل |
| اختبارات | **164** unit (+ 5 E2E specs) |
| CI (GitHub Actions) | مكتمل |
| تأمين الأسرار (gitignore, audit, validate scripts) | مكتمل |
| أيقونات PWA + manifest | مكتمل |
| Docker dev + production compose (PostgreSQL 14) | مكتمل |
| SSL bootstrap (`deploy-production.sh init`) | مُصلَح — **غير منشور بعد** |
| DNS `gps-tracker-pro.ma` | **غير مربوط** |
| HTTPS على Hetzner | **لم يُنفَّذ بعد** |

---

## المرحلة 0 — الآن (قبل Hetzner)

**الهدف:** نشر HTTP على IP السيرفر + smoke test.

- [x] polish التطبيق + اختبارات (164)
- [x] إصلاح تصدير التقارير + رفع صورة Profile
- [ ] تدوير `ADMIN_PASSWORD` و `TRACCAR_SERVICE_TOKEN` (كانت في git history)
  ```bash
  cd gps-tracker-pro
  ROTATE_CONFIRM=1 ./scripts/rotate-production-secrets.sh
  ```
- [ ] على Hetzner: `git pull` + `./scripts/deploy-production.sh http`
- [ ] تحقق: `http://<HETZNER_IP>/` و `http://<HETZNER_IP>/api/server` → 200
- [ ] smoke: login + map + WebSocket + export + avatar

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

| Record | القيمة |
|--------|--------|
| `A` gps-tracker-pro.ma | IP Hetzner |
| `A` www.gps-tracker-pro.ma | IP Hetzner |

```bash
dig +short gps-tracker-pro.ma A
./scripts/deploy-production.sh init
./scripts/deploy-production.sh verify
```

**معايير النجاح:**

- [ ] `https://gps-tracker-pro.ma/api/server` → 200
- [ ] `Strict-Transport-Security` في headers
- [ ] تسجيل الدخول + WebSocket يعملان
- [ ] Port 8082 غير مفتوح للعموم

---

## المرحلة 2 — تشغيل إنتاجي مستقر

| المهمة | الأولوية |
|--------|----------|
| نسخ احتياطي يومي (`backup.sh` + cron) | عالية |
| مراقبة uptime (`monitor.sh` + cron) | عالية |
| `fail2ban` على SSH | متوسطة |
| Rate limit على `/api/session` (nginx) | متوسطة |
| 2FA إلزامي لحساب admin | متوسطة |
| Docker Scout / تحديث الصور | منخفضة |

---

## المرحلة 3 — PostgreSQL

**الحالة:** ✅ **مكتمل** في `docker-compose.prod.yml` (PostgreSQL 14 + Traccar).

- Fresh deploy: `init` ينشئ قاعدة جديدة
- Migration من H2: نافذة صيانة منفصلة إذا لزم (انظر DEPLOY-HETZNER.md)

---

## المرحلة 4 — تحسينات التطبيق

### 4.1 إشعارات

| الميزة | الحالة |
|--------|--------|
| Traccar WebSocket + per-device filter | مكتمل |
| storm / rain / fog toggles | UI فقط — لا مصدر Traccar |
| email notification toggle | UI فقط |
| Web Push (FCM/VAPID) | مخطط |

### 4.2 أداء

| الميزة | التفاصيل |
|--------|----------|
| Code splitting | Reports/Map/Users lazy — PDF/Excel chunks > 500 kB |
| Map tile cache | مخطط |
| WebSocket reconnect | backoff موجود |

### 4.3 PWA / Mobile

| الميزة | الحالة |
|--------|--------|
| أيقونات + manifest + SW | مكتمل |
| Install prompt مخصص | مخطط |

### 4.4 تقارير

| موجود | مخطط |
|--------|-------|
| Trips, Events, Summary, Stops + PDF/Excel/CSV | Maintenance report |
| — | تقارير مجدولة بالبريد |

---

## المرحلة 5 — بنية تحتية متقدمة

```
المرحلة 1 (الإطلاق)     Docker Compose على Hetzner CX33
المرحلة 3               PostgreSQL ✅ (في compose)
المرحلة 5a              Staging (subdomain)
المرحلة 5b              CI/CD auto deploy (cd.yml موجود)
المرحلة 5c              Cloudflare CDN للـ static assets
```

---

## ما لا يدخل في النطاق الحالي

- تطبيق mobile native — PWA كافٍ للمرحلة الأولى
- Multi-tenant / SaaS billing
- بروتوكولات GPS مخصصة — Traccar يتولى `:5023`

---

## ترتيب التنفيذ الموصى به

```
المرحلة 0  →  تدوير أسرار + deploy http على Hetzner
     ↓
المرحلة 1  →  DNS + SSL init
     ↓
المرحلة 2  →  backups + monitoring
     ↓
المرحلة 4  →  weather toggles + Web Push + perf
     ↓
المرحلة 5  →  staging + CDN
```

---

## مراجع

- [DEPLOY-HETZNER.md](./DEPLOY-HETZNER.md) — نشر السيرفر
- [TOTP-ENROLLMENT.md](./TOTP-ENROLLMENT.md) — تفعيل 2FA
