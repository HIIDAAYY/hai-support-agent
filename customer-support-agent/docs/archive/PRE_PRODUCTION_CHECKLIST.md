# ⚠️ Pre-Production Checklist

## Issues yang Perlu Diperbaiki Sebelum Production

### 🐛 1. Mood Detection Tidak Akurat

**Issue**: Mood detection terlalu konservatif, query dengan sentiment positif jelas detected sebagai "neutral"

**Example Case**:
- Query: "Wah kliniknya bagus sekali! Saya tertarik booking"
- Expected: `positive` ✅
- Actual: `neutral` ❌

**Root Cause**: System prompt tidak memiliki explicit guidelines untuk mood detection. Claude menebak mood secara konservatif.

**Indicators Positive Mood yang Tidak Detected**:
1. ✅ "Wah" - Ekspresi antusiasme
2. ✅ "bagus sekali!" - Pujian dengan tanda seru (strong positive sentiment)
3. ✅ "tertarik booking" - Intent positif untuk take action
4. ✅ Tanda seru (!) - Menunjukkan excitement

**Solution Needed**:
Tambahkan Mood Detection Guidelines ke system prompt di `app/api/chat/route.ts`:

```
**Mood Detection Guidelines:**
- positive: Customer shows enthusiasm (Wah!, Bagus!, Mantap!, excited tone, compliments, ready to book, tanda seru untuk hal positif)
  Examples: "Wah bagus!", "Tertarik booking!", "Keren sekali!", "Thank you so much!"
  
- curious: Asking questions to learn more, penasaran, ingin tahu lebih detail
  Examples: "Saya penasaran...", "Apa bedanya?", "Could you explain more?"
  
- neutral: Regular factual inquiries without emotional indicators
  Examples: "Berapa harga?", "Jam operasional?", "What's the location?"
  
- frustrated: Impatient, repeated questions, complaints about delays
  Examples: "Kenapa lama sekali?", "Sudah tanya berkali-kali", "This is taking too long"
  
- negative: Explicit complaints, dissatisfaction, problems with service
  Examples: "Saya kecewa", "Treatment malah tambah parah!", "Very disappointed"
  
- confused: "Bingung", "tidak mengerti", needs clarification, unclear about process
  Examples: "Saya bingung...", "I don't understand", "Tolong jelaskan lebih simple"
```

**Impact**: 
- Sales opportunity detection kurang optimal
- Buying signals tidak tertangkap dengan baik
- Upsell/closing timing bisa terlewat

**Priority**: MEDIUM (affects sales conversion but not critical functionality)

**File to Edit**: `app/api/chat/route.ts` (around line 900-1100, add to system prompt)

---

### 💳 2. Testing Pembayaran End-to-End

**Issue**: Perlu memastikan payment flow bekerja dengan lancar sebelum production

**What to Test**:

#### A. Payment Link Generation
- [ ] Generate payment link berhasil untuk semua methods:
  - [ ] GoPay
  - [ ] QRIS
  - [ ] OVO
  - [ ] ShopeePay
  - [ ] Transfer Bank (VA: BCA/BNI/BRI/Mandiri/Permata)
- [ ] Link valid dan bisa dibuka di browser
- [ ] Link mengarah ke Midtrans Sandbox yang benar

#### B. Payment Processing
- [ ] Test payment di Midtrans Sandbox:
  - [ ] Complete payment successfully
  - [ ] Payment status callback diterima
  - [ ] Booking status terupdate jadi PAID
  - [ ] Customer dapat konfirmasi pembayaran
- [ ] Test payment failed scenario:
  - [ ] Expired payment link handling
  - [ ] Cancel payment handling
  - [ ] Failed transaction handling

#### C. Payment Status Checking
- [ ] `check_payment_status` tool berfungsi
- [ ] Status accurate setelah payment completed
- [ ] Status sinkron antara DB dan Midtrans

#### D. Production Readiness
- [ ] **CRITICAL**: Switch dari Midtrans Sandbox ke Production
  - [ ] Dapatkan Production Server Key & Client Key
  - [ ] Update `.env.local` dengan production keys
  - [ ] Update Midtrans callback URL ke production domain
  - [ ] Test dengan real payment (small amount)
- [ ] Payment notification webhook configured di Midtrans
- [ ] Webhook signature validation working
- [ ] Error logging untuk failed payments

**Testing Commands**:
```bash
# Test payment link generation
# Query: "Buatkan link pembayaran pakai GoPay"

# Test payment status check
# Query: "Cek status pembayaran booking BKG-2026-246"
```

**Files to Check**:
- `app/lib/bot-tools.ts` - Payment tools implementation
- `app/api/payment/webhook/route.ts` - Payment callback handler (if exists)
- `.env.local` - Midtrans credentials

**Priority**: HIGH (critical for actual transactions)

---

## ✅ Additional Pre-Production Checklist

### Security
- [ ] All API keys secure dan tidak exposed
- [ ] Environment variables proper untuk production
- [ ] Database credentials secure
- [ ] Admin dashboard protected dengan authentication
- [ ] Rate limiting implemented untuk API endpoints

### Performance
- [ ] Response time average < 5 seconds
- [ ] Database queries optimized
- [ ] Caching implemented dan working
- [ ] No memory leaks

### Monitoring
- [ ] Error logging configured (e.g., Sentry)
- [ ] Analytics tracking conversations
- [ ] Payment transaction logging
- [ ] Failed booking logging

### Data & Database
- [ ] Database backup strategy
- [ ] Migration scripts tested
- [ ] Seed data for production prepared
- [ ] Data privacy compliance (GDPR/local laws)

### Customer Experience
- [ ] WhatsApp integration tested end-to-end (if using)
- [ ] Email notifications working
- [ ] Admin dashboard fully functional
- [ ] Handoff to human agent smooth

### Documentation
- [ ] README updated dengan production setup
- [ ] API documentation complete
- [ ] Deployment guide created
- [ ] User manual for admin dashboard

---

## 📝 Notes

**Date**: 2026-01-29
**Added by**: Testing Session

**Next Steps**:
1. Fix mood detection guidelines
2. Test payment flow thoroughly
3. Complete remaining checklist items
4. Final end-to-end testing
5. Deploy to staging first
6. Production deployment

---

**Status**: 🔴 NOT READY FOR PRODUCTION
**Blocker Issues**: Payment testing incomplete
**Estimated Time to Production Ready**: 1-2 days (assuming payment testing + mood detection fix)
