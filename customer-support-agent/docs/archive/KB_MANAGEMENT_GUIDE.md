# Knowledge Base Management System - User Guide

## Overview

The Knowledge Base Management System allows admins to upload, manage, and test documents that the AI chatbot uses to answer questions.

## Features

✅ **Upload Documents** - Upload TXT, MD, or PDF files
✅ **Automatic Processing** - Text extraction, chunking, embedding, and Pinecone upload
✅ **Document Management** - View, delete, and track uploaded documents
✅ **RAG Testing** - Test queries to see how the bot retrieves information
✅ **Multi-tenant Support** - Separate knowledge bases per clinic/business

---

## How to Access

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to admin dashboard:
   ```
   http://localhost:3000/admin/login
   ```

3. After login, click **"Knowledge Base"** in the sidebar

---

## Uploading Documents

### Step 1: Prepare Your Document

**Supported formats:**
- `.txt` - Plain text files
- `.md` - Markdown files
- `.pdf` - PDF documents (coming soon - use TXT for now)

**Requirements:**
- Maximum file size: 10MB
- Minimum content: 50 characters
- UTF-8 encoding recommended

**Example content structure:**
```
Promo Bulan Desember 2025

Klinik Kecantikan Glow menawarkan promo spesial:

1. Facial Basic Glow - Diskon 30%
   Harga normal: Rp 250,000
   Harga promo: Rp 175,000
   Berlaku sampai 31 Desember 2025

2. Laser Treatment - Buy 1 Get 1
   Treatment laser wajah dengan teknologi terbaru
   Harga: Rp 800,000 (dapat 2 sesi)
```

### Step 2: Upload via Admin Dashboard

1. Go to **Knowledge Base** page
2. Click **"Choose File"** in the upload section
3. Select your file
4. Wait for processing (typically 30-60 seconds for a 5KB file)
5. Success message will show number of chunks uploaded

**What happens during upload:**
1. ✅ File is validated (size, type, content)
2. ✅ Text is extracted
3. ✅ Text is split into chunks (~800 characters each)
4. ✅ Each chunk is embedded using Voyage AI
5. ✅ Vectors are uploaded to Pinecone
6. ✅ Document record saved to database

---

## Managing Documents

### View Documents

The **Uploaded Documents** section shows:
- 📄 **File name** - Original filename
- 📊 **Chunks** - Number of text chunks
- 💾 **File size** - Total size in KB/MB
- ⏰ **Upload time** - When it was uploaded
- ✅ **Status** - PROCESSING, COMPLETED, or FAILED

### Delete Documents

1. Click the **🗑️ Trash** icon next to a document
2. Confirm deletion
3. Document is removed from:
   - Pinecone vector database
   - PostgreSQL database

**⚠️ Warning:** Deletion is permanent and cannot be undone!

---

## Testing RAG Queries

### How to Test

1. In the **Test RAG Query** section, enter a question
2. Click **Search** button
3. View matching results with:
   - 📄 Source document name
   - 📈 Relevance score (0-100%)
   - 📝 Matched text snippet

### Example Test Queries

```
Query: "Ada promo apa bulan ini?"
Expected Result:
- Document: "Promo Desember 2025.txt"
- Score: 85%
- Text: "Facial Basic Glow - Diskon 30%..."

Query: "Berapa harga facial?"
Expected Result:
- Document: "Price List.txt"
- Score: 92%
- Text: "Facial Basic Glow - Rp 250,000..."
```

### Interpreting Scores

- **90-100%** - Excellent match, highly relevant
- **70-89%** - Good match, relevant
- **50-69%** - Moderate match, somewhat relevant
- **Below 50%** - Weak match, may not be relevant

---

## Database Schema

### KnowledgeBaseDocument Table

```sql
CREATE TABLE knowledge_base_documents (
  id                 TEXT PRIMARY KEY,
  file_name          TEXT NOT NULL,
  original_name      TEXT NOT NULL,
  knowledge_base_id  TEXT NOT NULL,      -- e.g., "default", "clinic-1"
  uploaded_by        TEXT NOT NULL,      -- Admin user ID
  file_size          INTEGER NOT NULL,   -- Bytes
  mime_type          TEXT,
  chunk_count        INTEGER NOT NULL,
  status             TEXT NOT NULL,       -- PROCESSING, COMPLETED, FAILED
  pinecone_namespace TEXT,
  pinecone_ids       TEXT[],             -- Array of vector IDs
  processed_at       TIMESTAMP,
  error_message      TEXT,
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### 1. Upload Document
```
POST /api/admin/knowledge-base/upload
Content-Type: multipart/form-data

Body:
- file: File
- knowledgeBaseId: string (default: "default")

Response:
{
  "success": true,
  "documentId": "clxxx...",
  "chunks": 45,
  "message": "Successfully uploaded 45 chunks"
}
```

### 2. List Documents
```
GET /api/admin/knowledge-base/list?knowledgeBaseId=default

Response:
{
  "success": true,
  "documents": [...],
  "count": 5
}
```

### 3. Delete Document
```
DELETE /api/admin/knowledge-base/delete
Content-Type: application/json

Body:
{
  "documentId": "clxxx..."
}

Response:
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### 4. Test Query
```
POST /api/admin/knowledge-base/test
Content-Type: application/json

Body:
{
  "query": "Ada promo apa?",
  "knowledgeBaseId": "default",
  "topK": 5
}

Response:
{
  "success": true,
  "query": "Ada promo apa?",
  "matches": [
    {
      "score": 0.85,
      "text": "Promo Desember...",
      "fileName": "promo.txt",
      "documentId": "clxxx...",
      "chunkIndex": 0
    }
  ],
  "count": 5
}
```

---

## Troubleshooting

### Issue: Upload fails with "File too large"
**Solution:** File must be under 10MB. Split large files or compress content.

### Issue: Upload fails with "No content found"
**Solution:** File might be empty or corrupted. Check file content.

### Issue: Test query returns no results
**Solution:**
- Make sure documents are uploaded successfully (status: COMPLETED)
- Try different query phrasing
- Check if document actually contains relevant information

### Issue: Processing stuck on "PROCESSING" status
**Solution:**
- Check server logs for errors
- Verify Pinecone API key is valid
- Check Voyage AI API key is valid
- Try re-uploading the document

---

## Best Practices

### 1. Content Organization
- Use descriptive filenames: `promo_december_2025.txt` (not `doc1.txt`)
- Group related information in one file
- Keep files focused (prices in one file, promos in another)

### 2. Content Format
- Use clear headings and structure
- Include relevant keywords naturally
- Write in the same language as customer queries (Indonesian)

### 3. Regular Updates
- Remove outdated documents (old promos, changed prices)
- Update seasonal content monthly
- Test queries after adding new documents

### 4. Quality Control
- Always test new documents with sample queries
- Verify scores are above 70% for important content
- Review and delete documents with consistent low scores

---

## Migration from Script-based Upload

### Old Way (Manual Script)
```bash
# Had to run script for every upload
npx tsx scripts/upload-faq.ts
```

### New Way (Admin Dashboard)
1. Log in to admin panel
2. Click "Knowledge Base"
3. Upload file
4. Done!

**Benefits:**
- ✅ No technical knowledge required
- ✅ Real-time upload status
- ✅ Visual document management
- ✅ Built-in query testing
- ✅ Audit trail (who uploaded what, when)

---

## Future Enhancements (Roadmap)

- [ ] PDF text extraction support
- [ ] DOCX file support
- [ ] Bulk upload (multiple files)
- [ ] Document preview
- [ ] Edit document content
- [ ] Version history
- [ ] Auto-learning from conversations
- [ ] Knowledge base analytics (most queried topics)

---

## Support

For issues or questions:
1. Check server logs: `npm run dev` terminal output
2. Review Prisma database: `npx prisma studio`
3. Check Pinecone dashboard for vector counts
4. Contact system administrator

---

**Built with:** Next.js, Prisma, Pinecone, Voyage AI, PostgreSQL
