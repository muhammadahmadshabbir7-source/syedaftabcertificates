# Admin Panel Guide

## Overview
The Admin Panel allows you to manage seminars and certificates in Supabase and automatically sync them with the main profile page.

---

## Features

### 1. **Dashboard**
- View statistics about your records:
  - Total number of records
  - Total seminars
  - Number of categories
  - Records with certificates
- See recently added/edited records

### 2. **Add Seminar**
- Create new seminars with:
  - Title (required)
  - Category (required)
  - Provider/Organization (required)
  - Date (required)
  - Duration (optional)
  - Description (required)
  - Certificate Number (optional)
  - Image URLs (comma-separated)

### 3. **Add Certificate**
- Add certificates to existing seminars:
  - Select a seminar from dropdown
  - Add certificate number
  - Add certificate images (optional)

### 4. **Manage All**
- View, edit, or delete all records
- Edit multiple details at once
- Delete records with confirmation

---

## Accessing the Admin Panel

### Login Credentials (Demo)
```
Admin credentials are stored in Supabase. The password is stored as a salted hash.
```

1. Open `admin.html` in your browser
2. Enter the demo credentials
3. Click **Login**

---

## How It Works

### Data Storage
- Portfolio records are stored in Supabase.
- Data persists across browser sessions
- No server/database required

### Synchronization
- Changes made in Admin Panel automatically appear on the main profile page
- Simply refresh `index.html` to see updates
- All browsers/computers will have their own storage

---

## Step-by-Step Guide

### Adding a New Seminar
1. Click **"Add Seminar"** tab
2. Fill in all required fields (marked with *)
3. For images, enter URLs separated by commas
4. Click **"Add Seminar"**
5. Confirm the success message
6. Visit `index.html` to see the new seminar

### Adding a Certificate
1. Click **"Add Certificate"** tab
2. Select a seminar from the dropdown
3. Enter the certificate number
4. (Optional) Add certificate images
5. Click **"Add Certificate"**

### Editing a Seminar
1. Click **"Manage All"** tab
2. Find the record you want to edit
3. Click **"Edit"** button
4. Update the details
5. Click **"Save Changes"**

### Deleting a Seminar
1. Click **"Manage All"** tab
2. Find the record you want to delete
3. Click **"Delete"** button
4. Confirm the deletion

---

## Important Notes

⚠️ **Browser-Specific Storage**
- Data is stored per browser/device
- Different browsers have separate storage
- Clearing browser data will delete all records

⚠️ **Backup**
- Consider exporting records periodically
- Uploaded data size depends on the configured Supabase plan and storage approach.

✅ **Changes Reflect Automatically**
- Admin Panel and Main Page share the same data source
- Refresh the main page to see latest changes

---

## Troubleshooting

### Records Not Showing After Adding
- Refresh `index.html`
- Check that you're in the same browser
- Check the Supabase `training_records` table to verify saved records.

### Lost Data
- Check if browser data/cache was cleared
- Use Demo Credentials again to reload default data

### Can't Login
- Use the admin credentials configured in Supabase.
- Check for typos
- Try different browser if issues persist

---

## Technical Details

### Data Structure
Each record contains:
```javascript
{
  id: "unique_id",
  title: "Seminar Title",
  category: "Category Name",
  provider: "Organization",
  date: "YYYY-MM-DD",
  duration: "1 Day",
  description: "Detailed description",
  certificateNo: "CERT-123",
  images: ["image1.jpg", "image2.jpg"],
  type: "Seminar"
}
```

### LocalStorage Key
- Key: `trainingRecords`
- Format: JSON array

---

## Tips & Best Practices

1. **Organize Categories** - Use consistent category names
2. **Image URLs** - Use complete URLs or place images in the same folder
3. **Regular Backups** - Export your data using browser DevTools
4. **Date Format** - Use YYYY-MM-DD format
5. **Description** - Be detailed and descriptive

---

## Support

For any issues:
1. Check the Troubleshooting section above
2. Verify login credentials
3. Try a different browser
4. Check that JavaScript is enabled

---

**Version:** 1.0  
**Last Updated:** 2026-06-11
