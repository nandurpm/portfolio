# Technical Notes Website

This is a simple static website for GitHub Pages.

## Files

- `index.html` - Home page
- `notes.html` - College notes page
- `technical.html` - Technical items page
- `style.css` - Website design
- `script.js` - Loads notes/items from JSON files
- `data/notes.json` - Edit this to add college notes
- `data/technical.json` - Edit this to add technical items
- `CNAME` - Replace `yourdomain.com` with your actual domain

## How to add a college note

Open `data/notes.json` and add one item like this:

```json
{
  "title": "Your Note Title",
  "category": "College Notes",
  "date": "2026-06-01",
  "description": "Short description",
  "link": "https://drive.google.com/file/d/YOUR_FILE_ID/view"
}
```

## How to add a technical item

Open `data/technical.json` and add one item like this:

```json
{
  "title": "Your Technical Item",
  "category": "Technical",
  "date": "2026-06-01",
  "description": "Short description",
  "link": "https://drive.google.com/file/d/YOUR_FILE_ID/view"
}
```

## Important

If you use Google Drive links, make sure the file sharing is set to:

Anyone with the link can view.

## Upload to GitHub

1. Open your repository.
2. Upload all files and folders.
3. Keep the `CNAME` file in the root folder.
4. Replace `yourdomain.com` inside `CNAME` with your real domain.
5. Commit changes.
6. Open your domain.

