# Prompt untuk Google AI Studio - Admin Dashboard Complete

Copy paste prompt di bawah ini ke Google AI Studio:

---

## PROMPT:

```
Saya punya AI customer support chatbot pakai Next.js 14 (App Router), Prisma, PostgreSQL, dan Claude AI API.

Sekarang saya butuh ADMIN DASHBOARD lengkap untuk HUMAN AGENTS yang bisa:
1. Monitor semua percakapan customer real-time
2. Ngambil alih (take over) percakapan dari AI kalau diperlukan
3. Chat langsung dengan customer sebagai human agent
4. Melihat analytics & insights AI performance
5. Manage handoff queue (antrian percakapan yang butuh bantuan human)

---

## DATABASE SCHEMA YANG SUDAH ADA:

```prisma
// Customer & Conversations
model Customer {
  id            String         @id @default(cuid())
  phoneNumber   String         @unique
  name          String?
  createdAt     DateTime       @default(now())
  conversations Conversation[]
  bookings      Booking[]
}

model Conversation {
  id              String                @id @default(cuid())
  customerId      String
  status          ConversationStatus    @default(ACTIVE)
  startedAt       DateTime              @default(now())
  endedAt         DateTime?
  metadata        ConversationMetadata?
  customer        Customer              @relation(...)
  messages        Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           MessageRole  // 'user' | 'assistant'
  content        String
  timestamp      DateTime     @default(now())
  conversation   Conversation @relation(...)
}

model ConversationMetadata {
  id                 String       @id @default(cuid())
  conversationId     String       @unique
  userMood           String?
  categories         String[]     @default([])
  wasRedirected      Boolean      @default(false)
  redirectReason     String?

  // Sales tracking
  salesStage              String?
  intentScore             Int?      @default(0)
  servicesInterested      String[]  @default([])
  convertedToBooking      Boolean   @default(false)
  conversionRevenue       Int?

  conversation       Conversation @relation(...)
}

// Admin users (sudah ada)
model AdminUser {
  id            String          @id
  username      String          @unique
  passwordHash  String
  name          String
  email         String          @unique
  role          AdminRole       @default(ADMIN)
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime
  AdminAuditLog AdminAuditLog[]
  AdminSession  AdminSession[]
}

model AdminSession {
  id          String    @id
  adminUserId String
  tokenHash   String    @unique
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  ipAddress   String?
  userAgent   String?
  AdminUser   AdminUser @relation(...)
}

model AdminAuditLog {
  id          String     @id
  adminUserId String?
  action      String
  resource    String?
  resourceId  String?
  details     Json?
  timestamp   DateTime   @default(now())
  AdminUser   AdminUser? @relation(...)
}

enum ConversationStatus {
  ACTIVE
  ENDED
  REDIRECTED
}

enum MessageRole {
  user
  assistant
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  VIEWER
}
```

---

## YANG HARUS DIBUATKAN:

### 1. TAMBAHAN DATABASE SCHEMA

Buatkan Prisma schema untuk:

**ConversationHandoff model** - Track ketika human agent ambil alih conversation:
- id, conversationId (unique), assignedAgentId
- handoffAt, resolvedAt
- status: PENDING | IN_PROGRESS | RESOLVED | ESCALATED
- priority: 0-3 (Low, Medium, High, Urgent)
- handoffReason, resolutionNotes, internalNotes
- relation ke Conversation & AdminUser

**Notification model** - Notifikasi untuk agents:
- id, agentId, type, title, message, isRead
- relatedConversationId, relatedHandoffId
- createdAt
- relation ke AdminUser

**Plus migration SQL nya!**

---

### 2. AUTHENTICATION SYSTEM

File: `app/lib/admin-auth.ts`
- hashPassword() pakai bcrypt (12 rounds)
- verifyPassword()
- createSession() - bikin session token (random 32 bytes), save ke AdminSession table
- validateSession() - check token valid & belum expire
- deleteSession() - logout
- getSessionUser() - get current user dari token

File: `middleware.ts` (root level)
- Protect semua routes `/admin/*` KECUALI `/admin/login`
- Redirect ke `/admin/login` kalau belum ada session
- Session token dari cookie "admin_session"

File: `app/admin/login/page.tsx`
- Login form: username & password
- Call API POST /api/admin/auth/login
- Set cookie, redirect ke /admin/dashboard
- Error handling, loading state
- Pakai shadcn/ui components (Card, Input, Button)

File: `app/api/admin/auth/login/route.ts`
- Verify username & password
- Create session, set httpOnly cookie (7 hari expiry)
- Audit log login action
- Return user data

File: `app/api/admin/auth/logout/route.ts`
- Delete session, clear cookie
- Audit log logout

File: `app/api/admin/auth/me/route.ts`
- Return current user dari session

---

### 3. ADMIN LAYOUT & NAVIGATION

File: `app/admin/layout.tsx`
- Sidebar navigation (collapsible)
- Top bar: breadcrumb, notifications, user menu
- Check auth, redirect kalau belum login
- Mobile responsive

File: `app/admin/components/Sidebar.tsx`
- Menu items:
  * Dashboard (/)
  * Conversations (/conversations)
  * Handoff Queue (/handoffs)
  * Analytics (/analytics)
  * Agents (/agents) - placeholder
  * Settings (/settings) - placeholder
- Active state, icons (lucide-react)
- Collapse button
- Badge count untuk pending handoffs

File: `app/admin/components/TopBar.tsx`
- Breadcrumb
- Notification bell dengan dropdown (show pending handoffs & new conversations)
- User menu: Profile, Logout
- Theme toggle

---

### 4. CONVERSATION MANAGEMENT

File: `app/admin/conversations/page.tsx`
- Table list semua conversations
- Columns: Customer, Phone, Status, Started, Messages, Last Message, Actions
- Filter by status (All, Active, Ended, Redirected)
- Search by customer name/phone (debounced 500ms)
- Pagination (20 per page)
- Click row → go to detail
- Real-time badge untuk active conversations
- Loading & empty states

File: `app/admin/conversations/[id]/page.tsx`
- Header: customer name, phone, status badge, duration
- Chat messages display (WhatsApp-like bubbles):
  * User messages: right side, blue
  * Assistant: left side, gray
  * Timestamps, auto-scroll ke bottom
- Sidebar kanan: Conversation metadata
  * Customer info
  * Mood, categories
  * Sales stage, intent score
  * Services interested
  * Conversion info
- HandoffControls component (see below)
- Export conversation button (download JSON)

File: `app/admin/conversations/components/ChatViewer.tsx`
- Reusable chat display component
- Message bubbles dengan styling
- Copy message button
- Auto-scroll
- Typing indicator (future)

File: `app/api/admin/conversations/route.ts`
- GET dengan query: ?status=ACTIVE&search=john&page=1&limit=20
- Return conversations list dengan:
  * Customer info
  * Message count
  * Last message preview
  * Metadata (sales stage, etc)
- Pagination metadata

File: `app/api/admin/conversations/[id]/route.ts`
- GET conversation detail dengan ALL messages
- Include customer, metadata, handoff info

---

### 5. HANDOFF SYSTEM (CRITICAL!)

File: `app/admin/conversations/[id]/components/HandoffControls.tsx`
- Kalau BELUM ada handoff:
  * "Request Handoff" button → create handoff (status PENDING)
  * Priority selector (Low, Medium, High, Urgent)
  * Reason textarea
- Kalau ada handoff PENDING:
  * Show "Waiting for agent..." status
  * "Assign to Me" button
  * Priority badge
- Kalau handoff IN_PROGRESS (assigned ke current agent):
  * Show LiveChatInterface (see below)
  * "Mark as Resolved" button
  * Internal notes textarea
- Kalau handoff IN_PROGRESS (tapi assigned ke agent lain):
  * Show "Being handled by [Agent Name]"
  * Disabled
- Kalau handoff RESOLVED:
  * Show resolution info & notes
  * "Reopen" button

File: `app/admin/conversations/[id]/components/LiveChatInterface.tsx`
- Chat input field untuk agent (hanya muncul kalau handoff IN_PROGRESS dan assigned ke current user)
- Send button
- Quick replies dropdown:
  * "I'm looking into this for you..."
  * "Let me check with our specialist"
  * "Thank you for your patience"
  * "Is there anything else?"
  * Custom (type your own)
- Message counter (berapa message agent sudah kirim)
- Show agent name badge di atas input

File: `app/admin/handoffs/page.tsx` - HANDOFF QUEUE
- Table semua pending & in-progress handoffs
- Columns: Customer, Priority, Reason, Time Waiting, Status, Agent, Actions
- Sort by priority DESC, then handoffAt ASC
- Filter by status (Pending, In Progress, All)
- "Claim" button untuk take handoff (update status ke IN_PROGRESS, assign ke current user)
- Real-time updates (polling every 5s)
- Badge count di sidebar

File: `app/api/admin/handoff/create/route.ts`
- POST: Create handoff
- Body: { conversationId, priority, reason }
- Update conversation status ke REDIRECTED
- Create notification untuk all agents
- Audit log
- Return handoff object

File: `app/api/admin/handoff/assign/route.ts`
- POST: Assign handoff ke agent
- Body: { handoffId, agentId }
- Check handoff belum di-claim agent lain
- Update status ke IN_PROGRESS
- Create notification untuk assigned agent
- Audit log

File: `app/api/admin/handoff/resolve/route.ts`
- POST: Mark as resolved
- Body: { handoffId, resolutionNotes }
- Update status ke RESOLVED, set resolvedAt
- Update conversation status ke ENDED
- Audit log

File: `app/api/admin/handoff/send-message/route.ts`
- POST: Agent kirim message
- Body: { conversationId, message }
- Create Message dengan role 'assistant'
- (Future: trigger WhatsApp send - untuk sekarang cuma save ke DB)
- Return message object

File: `app/api/admin/handoff/list/route.ts`
- GET handoffs dengan filter status
- Include conversation & customer info
- Sort by priority & time

---

### 6. ANALYTICS DASHBOARD

File: `app/admin/dashboard/page.tsx` - MAIN DASHBOARD
- 4 KPI Cards:
  * Total Conversations (today)
  * AI Resolution Rate (% tanpa handoff)
  * Average Response Time
  * Conversion Rate (% → booking)
- Date range selector (Today, 7d, 30d)
- Charts pakai Recharts:
  * Line chart: Conversations over time (last 7 days)
  * Bar chart: Handoff reasons (top 5)
  * Pie chart: Conversation status distribution
  * Bar chart: Sales funnel stages
- Recent activity feed (last 10 conversations)

File: `app/admin/analytics/page.tsx`
- More detailed analytics
- Tabs: Overview, Performance, Handoffs
- Performance metrics:
  * Avg messages per conversation
  * Avg conversation duration
  * Peak hours heatmap
  * Common categories
- Handoff metrics:
  * Total handoffs
  * Avg time to assignment
  * Avg resolution time
  * Agent performance table

File: `app/api/admin/analytics/overview/route.ts`
- GET dengan query: ?period=7d
- Complex Prisma aggregations:
  * Count conversations by date
  * Calculate AI resolution rate
  * Avg response time (dari message timestamps)
  * Conversion rate
  * Handoff reasons groupBy
  * Status distribution
  * Sales funnel stages
- Return JSON dengan all metrics

File: `app/api/admin/analytics/performance/route.ts`
- Performance metrics calculations
- Peak hours (groupBy hour)
- Category frequency
- Intent score distribution

File: `app/api/admin/analytics/handoffs/route.ts`
- Handoff metrics
- Time-based aggregations
- Agent stats (count resolved, avg time)

File: `app/admin/components/KPICard.tsx`
- Reusable metric card
- Show value, label, trend icon, % change
- Loading skeleton

File: `app/admin/components/DateRangePicker.tsx`
- Preset buttons
- Custom range picker
- Apply callback

---

### 7. NOTIFICATIONS & REAL-TIME

File: `app/api/admin/notifications/route.ts`
- GET: Return unread notifications untuk current user
- POST: Mark as read
- Include related conversation/handoff info

File: `app/admin/components/NotificationBell.tsx`
- Bell icon dengan badge count
- Dropdown list notifications
- Click to navigate ke conversation
- Mark as read

---

### 8. SEED DATA & MIGRATION

File: `prisma/migrations/XXX_add_handoff_system/migration.sql`
- SQL migration untuk ConversationHandoff & Notification tables
- Add indexes
- Add foreign keys

File: `prisma/seed-admin.ts`
- Create 3 admin users:
  * username: "admin", password: "Admin123!", role: SUPER_ADMIN
  * username: "agent1", password: "Agent123!", role: ADMIN
  * username: "agent2", password: "Agent123!", role: ADMIN
- Hash passwords pakai bcrypt
- Create 10 sample conversations dengan messages
- Create 3 sample handoffs (1 pending, 1 in_progress, 1 resolved)

---

## REQUIREMENTS:

**General:**
- TypeScript strict mode
- All components pakai shadcn/ui (Button, Input, Card, Table, Badge, Avatar, Dialog, DropdownMenu, Select, Textarea, Skeleton)
- Icons: lucide-react
- Dark mode support (pakai next-themes)
- Mobile responsive
- Loading states everywhere
- Error handling yang bagus
- ARIA labels untuk accessibility

**Security:**
- httpOnly cookies untuk session
- CSRF protection
- Rate limiting (optional, comment aja kalau implement)
- Permission checks (VIEWER role read-only)
- Audit log SEMUA admin actions

**Performance:**
- Efficient Prisma queries (use include & select)
- Pagination untuk large lists
- Debounced search
- Polling interval 5s untuk real-time updates (gunakan useEffect)

**UI/UX:**
- WhatsApp-like chat bubbles
- Smooth transitions
- Optimistic updates
- Toast notifications (pakai shadcn toast)
- Confirm dialogs untuk destructive actions

---

## OUTPUT YANG DIHARAPKAN:

Berikan FULL CODE untuk SEMUA files yang disebutkan di atas, termasuk:

1. Prisma schema additions (ConversationHandoff & Notification models)
2. Migration SQL
3. All authentication files
4. All layout & navigation components
5. All conversation management pages & components
6. All handoff system files
7. All analytics dashboard files
8. All API routes
9. Seed script

Code harus PRODUCTION-READY, bisa langsung copy-paste!

Struktur folder:
```
app/
├── admin/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── conversations/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx
│   │   └── components/
│   ├── handoffs/page.tsx
│   ├── analytics/page.tsx
│   └── components/
├── api/admin/
│   ├── auth/
│   ├── conversations/
│   ├── handoff/
│   ├── analytics/
│   └── notifications/
└── lib/
    └── admin-auth.ts

prisma/
├── schema.prisma (additions)
├── migrations/XXX_add_handoff/migration.sql
└── seed-admin.ts
```

IMPORTANT: Pastikan semua code connect dengan benar! Handoff system harus fully functional - agent bisa claim, chat, dan resolve. Analytics harus pakai data REAL dari database, bukan mock!
```

---

## CARA PAKAI:

1. Copy prompt di atas ke **Google AI Studio**
2. Generate (mungkin perlu 2-3 generate karena panjang)
3. Copy code hasil generate ke folder yang sesuai
4. Run migration: `npx prisma migrate dev --name add_handoff_system`
5. Generate Prisma client: `npx prisma generate`
6. Seed data: `npx tsx prisma/seed-admin.ts`
7. Install dependencies kalau ada yang kurang:
   ```bash
   npm install bcrypt @types/bcrypt recharts
   ```
8. Run dev: `npm run dev`
9. Login: http://localhost:3000/admin/login
   - Username: `admin`
   - Password: `Admin123!`

---

## EXPECTED FEATURES:

✅ Admin login dengan session management
✅ Dashboard dengan real-time metrics & charts
✅ List semua conversations dengan filter & search
✅ View conversation detail dengan full chat history
✅ Request handoff dari conversation (create pending handoff)
✅ Handoff queue untuk agents
✅ Claim handoff (assign to me)
✅ Live chat interface untuk agent kirim message ke customer
✅ Mark handoff as resolved
✅ Notifications untuk new handoffs
✅ Analytics dashboard dengan KPIs & charts
✅ Audit logging semua admin actions
✅ Mobile responsive
✅ Dark mode

---

**File ini siap untuk dipakai di Google AI Studio!** 🚀
