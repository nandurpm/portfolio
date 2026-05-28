# 🧰 NToolkit

> A static, no-backend engineering tools dashboard with hardcoded login.

**Live:** https://nandakumarm.dpdns.org/

---

## 📁 Project Structure

```
/project-root
  index.html      ← Login page
  dashboard.html  ← Tabbed tool dashboard
  admin.html      ← Admin panel
  users.js        ← Hardcoded user list (admin edits this)
  README.md
```

---

## 🔐 Login System

All users are hardcoded in `users.js`. No database. Passwords are plain text.  
Session stored in `localStorage`. Clears on logout.

### Default Users

| Username     | Password  | Role  | Active |
|-------------|-----------|-------|--------|
| nandakumar  | nandu123  | admin | ✅     |
| selvakumar  | selva123  | user  | ✅     |
| karthik     | kart123   | user  | ✅     |
| demo        | demo123   | user  | ❌     |

---

## ➕ How to Add a User

1. Open `users.js`
2. Add a new entry to the `USERS` array:

```js
{ username: "newuser", password: "pass123", name: "Full Name", role: "user", active: true },
```

3. Save the file and re-upload to GitHub (or push via git).
4. Done — change is live immediately on next page load.

## ➖ How to Remove a User

Delete their line from `users.js` and re-upload.

## 🚫 How to Deactivate (without deleting)

Set `active: false`:
```js
{ username: "olduser", password: "pass123", name: "Old User", role: "user", active: false },
```

Deactivated users **cannot login** but remain in the admin panel as "Inactive".

---

## ⚙️ Admin Panel

URL: `/admin.html`

**Admin credentials** (hardcoded in `users.js`):
- Username: `admin`
- Password: `666666`

Admin can:
- View all users, their roles, and active/inactive status
- See user count stats

To add/remove users, admin must edit `users.js` directly.

---

## 🛠️ Tools Available

| Tab         | Tool                                          |
|-------------|-----------------------------------------------|
| 🧮 Calculator | Standard calculator with keyboard support    |
| ⏱️ Timer      | Stopwatch + countdown timer with laps        |
| 🗺️ Maps       | Interactive map via Leaflet.js (no API key)  |
| 📝 Notes      | Notepad with localStorage auto-save          |
| 🌤️ Weather    | Weather via Open-Meteo API (no API key)      |
| 🔄 Converter  | Length, weight, temperature converter        |

---

## 🚀 Deployment to GitHub Pages

```bash
# 1. Init repo (first time only)
git init
git remote add origin https://github.com/nandurpm/<repo-name>.git

# 2. Push all files
git add .
git commit -m "deploy NToolkit"
git push -u origin main

# 3. Enable GitHub Pages
# Go to repo → Settings → Pages → Source: main branch / root
# Your site: https://nandurpm.github.io/<repo-name>/
```

### Deploy to VPS (nandakumarm.dpdns.org)

If using Nginx:
```nginx
server {
    listen 80;
    server_name nandakumarm.dpdns.org;
    root /var/www/ntoolkit;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

Then just copy files to `/var/www/ntoolkit/` via `scp` or `rsync`.

---

## ⚠️ Security Note

This is an **internal tool only**. Credentials are plain text in JS — not suitable for public-facing production use. For internal team use on a private/VPN-restricted server, this is fine.
