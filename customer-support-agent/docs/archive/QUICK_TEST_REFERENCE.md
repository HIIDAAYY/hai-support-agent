# 🚀 Quick Testing Reference

## Automated Testing (Fastest)

```bash
npx tsx scripts/comprehensive-test.ts
```

Results akan menampilkan:
- ✅ Pass/Fail untuk setiap kategori
- ⏱️ Response time
- ❌ Detailed error messages
- 💡 Recommendations

---

## Manual Browser Testing (Most Thorough)

### 1. Start Server
```bash
npm run dev
```

### 2. Open Browser
http://localhost:3000

### 3. Quick Test Queries

#### FAQ Testing ✅
```
"Halo"
"Dimana lokasi klinik?"
"Jam operasional klinik?"
"Berapa harga facial treatment?"
```

#### Bot Tools Testing 🛠️
```
"Cek ketersediaan slot untuk besok"
"Saya mau booking facial untuk tanggal 5 Februari jam 10 pagi"
"Buatkan link pembayaran"
```

#### Mood Testing 😊
```
"Wah bagus sekali!" (Positive)
"Saya penasaran..." (Curious)
"Saya bingung..." (Confused)
"Saya mau komplain!" (Negative → Should redirect)
```

#### Multilingual 🌍
```
"What treatments do you offer?" (English)
"Berapa harganya?" (Indonesian)
```

#### Edge Cases ⚠️
```
"asdfghjkl" (Invalid)
"Siapa presiden Indonesia?" (Out of scope)
```

### 4. Admin Dashboard Testing

Visit:
- http://localhost:3000/admin/conversations
- http://localhost:3000/admin/handoffs
- http://localhost:3000/admin/analytics
- http://localhost:3000/admin/dashboard

Check:
- ✅ Pages load
- ✅ Data displays correctly
- ✅ Can resolve handoffs
- ✅ Can send messages

---

## What to Look For

### ✅ Good Signs
- Bot responds in < 5 seconds
- Answers accurate and natural
- Tools called when appropriate
- Response NOT raw JSON
- Suggested questions appear
- Mood detected correctly
- Negative mood triggers redirect to agent
- Admin dashboard accessible

### ❌ Red Flags
- Response is raw JSON like `{"order_id": "..."}`
- Tools not called when they should be
- Wrong language response
- No suggested questions
- Crashes or errors
- Very slow responses (> 10s)
- Admin dashboard errors

---

## Quick Debugging

### Bot Not Responding?
1. Check server running: `npm run dev`
2. Check console for errors (F12)
3. Verify API keys in `.env.local`

### Tools Not Working?
1. Check console logs for tool calls
2. Try more explicit queries
3. Verify tool definitions in code

### Admin Dashboard Error?
1. Run: `npx prisma migrate dev`
2. Check PostgreSQL running: `docker ps`
3. Check browser console

### Wrong Language?
1. Be explicit: "In English please" or "Dalam bahasa Indonesia"
2. Check system prompt settings

---

## Success Criteria

✅ **PASS**: 80%+ tests working, no critical bugs
⚠️ **NEEDS WORK**: < 70% tests working, critical bugs present

---

## Full Documentation

- **Automated Testing**: [`scripts/comprehensive-test.ts`](file:///c:/Users/aditm/claude-quickstarts/customer-support-agent/scripts/comprehensive-test.ts)
- **Manual Testing Guide**: [`MANUAL_TESTING_GUIDE.md`](file:///c:/Users/aditm/claude-quickstarts/customer-support-agent/MANUAL_TESTING_GUIDE.md)
- **Walkthrough**: [`walkthrough.md`](file:///C:/Users/aditm/.gemini/antigravity/brain/ba32096e-00eb-4018-b1fc-0e67b6ce5019/walkthrough.md)
- **Original Testing Guide**: [`TESTING_GUIDE.md`](file:///c:/Users/aditm/claude-quickstarts/customer-support-agent/TESTING_GUIDE.md)

---

**Happy Testing!** 🎉
