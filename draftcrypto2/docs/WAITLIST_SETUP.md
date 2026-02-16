# DraftCrypto Waitlist → Google Sheets Setup

## 5-Minute Setup

### Step 1: Create a Google Sheet
1. Go to https://sheets.google.com and create a new spreadsheet
2. Name it "DraftCrypto Waitlist"
3. In Row 1, add headers: `Email` | `Timestamp` | `Source` | `Referral Code`

### Step 2: Create the Apps Script
1. In your sheet, click **Extensions → Apps Script**
2. Delete the default code and paste this:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Check for duplicate email
    var emails = sheet.getRange("A:A").getValues().flat();
    if (emails.includes(data.email)) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, duplicate: true, position: emails.indexOf(data.email) })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Append new row
    sheet.appendRow([
      data.email,
      new Date().toISOString(),
      data.source || 'popup',
      data.referralCode || ''
    ]);
    
    var position = sheet.getLastRow() - 1; // minus header row
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, position: position })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: GET endpoint to return waitlist count
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var count = Math.max(0, sheet.getLastRow() - 1);
  return ContentService.createTextOutput(
    JSON.stringify({ count: count })
  ).setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy → New deployment**
4. Select type: **Web app**
5. Set "Execute as": **Me**
6. Set "Who has access": **Anyone**
7. Click **Deploy** and copy the URL

### Step 3: Add the URL to your environment
In your Netlify dashboard (or `.env.local`):

```
NEXT_PUBLIC_WAITLIST_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Step 4: Deploy
Push to GitHub — Netlify will pick up the new env var.

### Viewing Signups
Just open your Google Sheet. Every email will appear with a timestamp, which popup they used, and any referral code.
