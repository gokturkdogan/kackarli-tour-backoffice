# Kaçkarlı Tur Backoffice

Kaçkarlı Tur yönetim paneli — turlar, tur tarihleri ve rezervasyonlar.

Public site (`kackarli-tour`) ile **aynı PostgreSQL veritabanını** paylaşır.

## Kurulum

```bash
npm install
cp .env.example .env
# DATABASE_URL ve AUTH_SECRET değerlerini doldurun
npm run db:generate
npm run db:seed
npm run dev
```

- Panel: http://localhost:3001
- Giriş: `admin@kackarlitur.com` / `admin123456` (seed varsayılanı)

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | Public site ile aynı veritabanı |
| `AUTH_SECRET` | NextAuth JWT secret |
| `AUTH_URL` | Backoffice URL (ör. `http://localhost:3001`) |
| `CLOUDINARY_*` | Tur görseli yükleme |
| `ADMIN_*` | İlk admin kullanıcısı (seed) |
| `SMTP_*` | Google SMTP ile rezervasyon e-postaları |

## E-posta (Google SMTP)

Gmail için [Uygulama Şifresi](https://myaccount.google.com/apppasswords) oluşturun ve `.env` dosyasına ekleyin:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM_NAME=Kaçkarlı Tur
SMTP_FROM_EMAIL=your-email@gmail.com
```

Rezervasyon oluşturulduğunda, onaylandığında ve iptal edildiğinde müşteriye otomatik e-posta gönderilir.

## Migrasyonlar

Veritabanı şeması public repo (`kackarli-tour`) üzerinden yönetilebilir. Her iki proje de aynı `prisma/schema.prisma` yapısını kullanır.
