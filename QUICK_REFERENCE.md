# Admin Panel - Quick Reference Card

## 🔐 Login
- **URL:** `admin.html`
- **Username:** Stored in Supabase
- **Password:** Stored as a salted hash in Supabase

---

## 📊 Dashboard Tab
- View total records, seminars, categories, and certificates
- See recently added/edited records
- Get quick overview of all data

---

## ➕ Add Seminar Tab
**Required Fields:**
- Title
- Category  
- Provider/Organization
- Date
- Description

**Optional Fields:**
- Duration
- Certificate Number
- Image URLs (comma-separated)

**Example:**
```
Title: AI in Aviation
Category: AI and Digital Transformation
Provider: NUST
Date: 2025-06-15
Description: Discussion on AI applications in aviation
Duration: 1 Day
Images: nust1.jpg, nust2.jpg, nust3.jpg
```

---

## 📜 Add Certificate Tab
1. **Select Seminar** from dropdown
2. **Enter Certificate Number**
3. **Add Certificate Images** (optional)
4. Click **Add Certificate**

---

## ✏️ Manage All Tab
**View all records with:**
- Quick edit button
- Quick delete button
- Category badge
- Date info
- Provider info

---

## 🎯 Edit Record
1. Find record in any tab
2. Click **Edit** button
3. Update all fields
4. Click **Save Changes**
5. Modal will close automatically

---

## 🗑️ Delete Record
1. Find record in **Manage All** tab
2. Click **Delete** button
3. Confirm deletion in popup
4. Record is removed

---

## 💾 Data Management

**Where is data stored?**
- Supabase database
- Same location as cookies

**How to backup?**
1. Open Browser DevTools (F12)
2. Check the Supabase `training_records` table
3. Find key: `trainingRecords`
4. Copy the JSON data
5. Save to a file

**How to restore?**
1. Open DevTools
2. Check the Supabase `training_records` table
3. Find key: `trainingRecords`
4. Paste backup data
5. Refresh page

**How to reset all data?**
1. Go to DevTools
2. Delete the `trainingRecords` key
3. Refresh page
4. Default data will reload

---

## 🔄 Sync with Main Page
1. Make changes in admin panel
2. Changes save to Supabase
3. **Refresh** `index.html` to see updates
4. No action needed!

---

## ⚠️ Important
- Data is **browser-specific**
- Different browsers = different storage
- **Clearing cache deletes data**
- Keep backups!

---

## 🐛 Troubleshooting

**Can't login?**
- Check caps lock
- Username: `admin` (lowercase)
- Password: configured in Supabase as a salted hash

**Changes not showing?**
- Refresh the page
- Check Supabase table data and server logs
- Try different browser

**Records disappeared?**
- Check the Supabase `training_records` table
- Look for `trainingRecords` key
- May need to restore from backup

**Images not showing?**
- Make sure image files are in same folder as HTML
- Or use full URLs (http://...)
- Check file names are spelled correctly

---

## 📱 Mobile Support
✓ Admin panel works on mobile  
✓ Responsive design  
✓ Touch-friendly buttons  

---

## 🔒 Security Notes
- Demo credentials are for testing only
- Credentials are hardcoded (no real authentication)
- Data is stored locally (not on server)
- Use only for personal portfolio

---

## ✨ Pro Tips

1. **Organization**
   - Use consistent category names
   - Use same date format
   - Standardize provider names

2. **Images**
   - Keep images in same folder as HTML files
   - Use short, descriptive file names
   - Compress images to reduce size

3. **Descriptions**
   - Be detailed and specific
   - Include key achievements
   - Highlight learning outcomes

4. **Backups**
   - Export Supabase data regularly
   - Save to multiple locations
   - Keep version history

---

## 🎨 Customization
To change login credentials:
1. Open Supabase SQL Editor.
2. Update the `admin_users` row with a new salt and password hash.
3. Keep the plain password out of project files.
6. Save file

---

**Version:** 1.0  
**Last Updated:** 2026-06-11  
**Status:** Ready to Use ✓
