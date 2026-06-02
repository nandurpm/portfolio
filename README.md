# Nandakumar M Futuristic Portfolio Website

A modern, colorful, futuristic, GitHub Pages friendly personal portfolio website for showcasing profile details, works, writings, technical content, study notes, resources, blog updates, and contact details.

This project is prepared for:

- GitHub repository: `nandurpm/portfolio`
- Custom domain: `nandakumarm.dpdns.org`
- Technology: HTML, CSS, JavaScript, and JSON only
- Backend: Not required

## Features

- Futuristic dark theme
- Neon gradients and glow effects
- Glassmorphism cards
- Animated particles background
- Sticky responsive navigation bar
- Mobile hamburger menu
- Dynamic homepage featured content
- Works category filtering
- Writings category filtering and search
- Resources category filtering and search
- Blog / updates timeline
- GitHub Pages friendly contact form using `mailto:`
- Fully responsive layout for desktop, tablet, and mobile
- Easy content updates through JSON files

## Website Pages

| Page | File | Purpose |
| --- | --- | --- |
| Home | `index.html` | Introduction, hero, dynamic featured updates, previews |
| About Me | `about.html` | Bio, education timeline, skills, goals, tools, certifications |
| My Works | `works.html` | Projects, design works, college works, electronics work |
| My Writings | `writings.html` | Essays, political writings, movie reviews, technical articles |
| Notes / Resources | `resources.html` | Notes, downloads, references, study material, tools |
| Blog / Updates | `updates.html` | Daily updates, announcements, project and study updates |
| Contact | `contact.html` | Contact details, social links, mailto contact form |

## Folder Structure

```text
portfolio/
├── index.html
├── about.html
├── works.html
├── writings.html
├── resources.html
├── updates.html
├── contact.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   ├── images/
│   ├── icons/
│   ├── documents/
│   └── screenshots/
├── data/
│   ├── featured.json
│   ├── works.json
│   ├── writings.json
│   ├── resources.json
│   └── updates.json
├── CNAME
├── README.md
└── LICENSE
```

## How to Edit Homepage Featured Content

Open:

```text
data/featured.json
```

Each object creates one homepage card:

```json
{
  "type": "New Writing",
  "icon": "✍️",
  "title": "The Future of Technology and Society",
  "date": "2026-06-01",
  "description": "Short preview text here.",
  "link": "writings.html",
  "actionLabel": "Read Writing"
}
```

You can reorder, remove, or add cards. The homepage automatically loads the file.

## How to Add a New Work Item

Open:

```text
data/works.json
```

Copy one object and update it:

```json
{
  "title": "My New Project",
  "category": "Technical Projects",
  "date": "2026-06-02",
  "description": "Short description of the project.",
  "image": "assets/images/project-dashboard.svg",
  "link": "https://example.com",
  "github": "https://github.com/username/repository",
  "tags": ["HTML", "CSS", "JavaScript"]
}
```

Supported categories:

- Technical Projects
- Design Works
- College Works
- Electrical / Electronics
- Website Projects
- Documentation Work

## How to Add a New Writing Post

Open:

```text
data/writings.json
```

Example:

```json
{
  "title": "My New Writing",
  "category": "Technical Articles",
  "date": "2026-06-02",
  "tags": ["Technology", "Learning"],
  "preview": "Short preview text.",
  "link": "#"
}
```

Supported categories:

- Essays
- Political Writings
- Movie Reviews
- Technical Articles
- College Notes
- Personal Thoughts
- Book / Media Reviews

## How to Add Notes / Resources

Open:

```text
data/resources.json
```

Example:

```json
{
  "title": "New College Note",
  "category": "College Notes",
  "description": "Short description.",
  "fileType": "PDF",
  "downloadLink": "assets/documents/my-note.pdf",
  "referenceLink": "#",
  "date": "2026-06-02",
  "tags": ["College", "Notes"]
}
```

Place downloadable files inside:

```text
assets/documents/
```

You can also use Google Drive links in `downloadLink` or `referenceLink`.

## How to Update Blog / Daily Updates

Open:

```text
data/updates.json
```

Example:

```json
{
  "title": "Daily Update Title",
  "category": "Daily Updates",
  "date": "2026-06-02",
  "description": "Short update description.",
  "link": "updates.html"
}
```

## How to Replace Profile Image

Replace this file:

```text
assets/images/profile-placeholder.svg
```

Recommended option:

1. Add your photo as `assets/images/profile.jpg` or `assets/images/profile.png`.
2. Open `index.html`.
3. Find `assets/images/profile-placeholder.svg`.
4. Replace it with your new image path.

## How to Update Contact Details

Open:

```text
contact.html
```

Replace:

```text
your-email@example.com
```

with your real email address.

Also update:

- GitHub profile link
- LinkedIn profile link
- Location placeholder
- Phone placeholder if needed
- Footer email link in all pages if you want exact contact details everywhere

## Contact Form Options

### Current Method: mailto

The form opens the visitor's email app with the message filled in. This works without a backend server.

### Optional Method: Formspree

To use Formspree:

1. Create a Formspree account.
2. Create a new form.
3. Copy your Formspree endpoint.
4. In `contact.html`, change the form tag to:

```html
<form class="glass-card contact-form reveal" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

5. Remove or disable the JavaScript mailto handler in `js/script.js` if needed.

## How to Run Locally

Because JSON files are loaded using `fetch`, use a local server instead of opening `index.html` directly.

Using Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Using VS Code:

1. Install the Live Server extension.
2. Right-click `index.html`.
3. Select **Open with Live Server**.

## GitHub Pages Deployment for `nandurpm/portfolio`

1. Create or open your repository: `nandurpm/portfolio`.
2. Upload all files from this project folder to the root of the repository.
3. Commit the files to the `main` branch.
4. Open repository **Settings**.
5. Open **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select branch: `main`.
8. Select folder: `/root`.
9. Save.
10. Wait for GitHub Pages to build.
11. Open the generated GitHub Pages URL.

## Custom Domain Setup

This project already includes a `CNAME` file containing:

```text
nandakumarm.dpdns.org
```

Important: Do not add `https://` inside the `CNAME` file.

In GitHub Pages settings:

1. Open repository **Settings**.
2. Open **Pages**.
3. In **Custom domain**, enter:

```text
nandakumarm.dpdns.org
```

4. Save.
5. Enable **Enforce HTTPS** after DNS is active.

With your DNS provider, configure the required DNS record for your domain/subdomain. For this domain, keep the record pointed to GitHub Pages according to your DNS provider's dashboard and GitHub Pages instructions.

## Public or Private Repository

To change repository visibility:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Scroll to **Danger Zone**.
4. Choose **Change repository visibility**.
5. Select public or private.
6. Confirm.

Note: GitHub Pages availability for private repositories can depend on your GitHub plan and repository settings.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- JSON
- GitHub Pages
- Custom domain through `CNAME`

## Design References Included

The uploaded website architecture images are saved inside:

```text
assets/screenshots/
```

They are included only as visual references for the futuristic sitemap and UI architecture concept.
