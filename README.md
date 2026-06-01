# Nandakumar M — Personal Portfolio

Personal portfolio site. Live on GitHub Pages.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main page — Home, About, Works, Writings, Blog, Contact |
| `style.css` | Dark slate + amber theme, fully responsive |
| `script.js` | All data and rendering — edit this to add your content |
| `notes.html` | College notes page |
| `technical.html` | Technical projects page |
| `notes.json` | Add your college notes here |
| `technical.json` | Add your technical items here |
| `CNAME` | Replace with your custom domain (or delete if not using one) |

## How to add your content

### Works & Writings → edit `script.js`

Add to `WORKS[]`:
```js
{ id:4, category:"web", emoji:"🌐", title:"Project Name", date:"2026-06-01", desc:"Short description.", link:"https://your-link.com" }
```
Categories: `technical` | `design` | `college` | `web` | `docs`

Add to `WRITINGS[]`:
```js
{ id:4, category:"personal", title:"Post Title", date:"2026-06-01", tags:["Tag"], preview:"Short preview...", link:"#" }
```

### College Notes → edit `notes.json`
```json
{ "title": "Note Title", "category": "College Notes", "date": "2026-06-01", "description": "Short description.", "link": "https://drive.google.com/..." }
```

### Technical Items → edit `technical.json`
```json
{ "title": "Project Title", "category": "Technical", "date": "2026-06-01", "description": "Short description.", "link": "https://your-link.com" }
```

## Add your photo

In `index.html`, replace the avatar placeholder div with:
```html
<img src="photo.jpg" alt="Your Name" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />
```

## Update personal info

Edit directly in `index.html`:
- Name, bio, roles
- Email, phone, location
- GitHub and LinkedIn links

## Deploy

Push all files to `main`. Go to repo Settings → Pages → Source: `main` / root.

---
© 2026 Nandakumar M
