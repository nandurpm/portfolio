# Nandakumar M Portfolio

Modern GitHub Pages portfolio website for **Nandakumar M**, a Designing and Development Engineer based in Chennai, Tamil Nadu, India.

## Live Site

- Custom domain: <https://nandakumarm.dpdns.org>
- GitHub Pages repository: <https://github.com/nandurpm/portfolio>

## Features

- Pure HTML5, CSS3, and vanilla JavaScript
- Modern glassmorphism user interface
- Fully responsive desktop, tablet, and mobile layouts
- Dark and light theme toggle with local storage
- AOS-powered smooth scroll animations
- Animated typing effect on the home page
- Projects page with category filters
- Blog page with search, category filter, and pagination
- Resume page with timeline layout and PDF download
- Contact page with static mailto form, social links, and location map
- SEO metadata, Open Graph tags, canonical URLs, and fast static assets
- GitHub Pages compatible with no backend requirement

## Folder Structure

```text
portfolio/
+-- index.html
+-- projects.html
+-- blog.html
+-- resume.html
+-- contact.html
+-- assets/
|   +-- css/
|   |   +-- main.css
|   |   +-- theme.css
|   |   +-- animations.css
|   +-- js/
|   |   +-- main.js
|   |   +-- theme.js
|   |   +-- blog.js
|   +-- images/
|   |   +-- profile.jpg
|   |   +-- projects/
|   +-- data/
|       +-- projects.json
|       +-- blog.json
+-- README.md
```

## Customize Content

### Projects

Edit `assets/data/projects.json` to add or update project cards.

Each project supports:

- `title`
- `category`
- `description`
- `image`
- `github`
- `download`
- `technologies`

Supported categories:

- Web Development
- Embedded Systems
- Engineering Design
- Electronics

### Blog

Edit `assets/data/blog.json` to add or update blog posts.

Supported categories:

- Technical Articles
- Engineering
- Current Affairs
- Movie Reviews
- Politics
- Personal Writings

### Resume PDF

Replace `assets/Nandakumar_Resume.pdf` with the latest resume file. Keep the same filename to avoid updating links.

### Profile Photo

Replace `assets/images/profile.jpg` with a new profile image. Keep the same filename for automatic use across the site.

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings** > **Pages**.
4. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/** root
5. Save the settings.
6. GitHub Pages will publish the website.

## Custom Domain

The repository includes a `CNAME` file:

```text
nandakumarm.dpdns.org
```

Make sure the DNS provider points the domain to GitHub Pages.

## Local Preview

Because the site loads JSON files, preview it through a local server instead of opening `index.html` directly.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## License

This project is available under the MIT License.
