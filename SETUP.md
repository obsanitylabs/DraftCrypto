# DraftCrypto — Waitlist & Admin Setup

## 1. Google Sheet Waitlist (5 min setup)

### Step A: Add the Apps Script to your spreadsheet

1. Open your spreadsheet: https://docs.google.com/spreadsheets/d/1_G9tA9cU061L1V3qtteodpgF2j8KfJesh10TvDrGRkI/edit
2. Make sure the first row has these headers: `Timestamp | Email | Referral Code | Source | User Agent | IP`
3. Click **Extensions → Apps Script**
4. Delete any existing code and paste this:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Check for duplicate email
    var emails = sheet.getRange('B:B').getValues().flat();
    if (emails.includes(data.email)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, position: emails.indexOf(data.email), duplicate: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Append new row
    sheet.appendRow([
      new Date(),
      data.email,
      data.referralCode || '',
      data.source || 'website',
      data.userAgent || '',
      data.ip || '',
    ]);

    var position = sheet.getLastRow() - 1; // minus header row

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, position: position }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

5. Click **Save** (disk icon), name the project "DraftCrypto Waitlist"
6. Click **Deploy → New deployment**
7. Click the gear icon → select **Web app**
8. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
9. Click **Deploy**
10. Click **Authorize access** → sign in → Allow
11. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`)

### Step B: Add the URL to Netlify

1. Go to https://app.netlify.com → your DraftCrypto site → **Site configuration → Environment variables**
2. Add a new variable:
   - **Key:** `WAITLIST_WEBHOOK_URL`
   - **Value:** (paste the Web app URL from step 11)
3. Click **Save**
4. Go to **Deploys → Trigger deploy → Deploy site** (to pick up the new env var)

### That's it! 
Now when someone enters their email on the site, it lands in your Google Sheet.

---

## 2. Admin Page Protection

1. In the same Netlify **Environment variables** page, add:
   - **Key:** `NEXT_PUBLIC_ADMIN_WALLET`
   - **Value:** Your wallet address (e.g. `0x1234...abcd`)
   - For multiple admins, separate with commas: `0xaaa...,0xbbb...`
2. Trigger a redeploy

Now only your wallet can see the admin page at `/admin`.

---

## 3. All Environment Variables (reference)

| Variable | Required | Description |
|----------|----------|-------------|
| `WAITLIST_WEBHOOK_URL` | Yes | Google Apps Script web app URL |
| `NEXT_PUBLIC_ADMIN_WALLET` | Yes | Your wallet address(es), comma-separated |
| `JWT_SECRET` | For backend | 32+ char random string (only when running server) |
| `REDIS_URL` | Optional | Redis connection URL (backend falls back to in-memory) |
| `DATABASE_URL` | For backend | PostgreSQL connection string |
