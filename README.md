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
- About Me page with autoplaying portfolio presentation, photo, resume timeline, contact form, social links, and location map
- SEO metadata, Open Graph tags, canonical URLs, and fast static assets
- GitHub Pages compatible with no backend requirement

## Folder Structure

```text
portfolio/
+-- index.html
+-- projects.html
+-- works.html
+-- blog.html
+-- about.html
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
|   |   +-- about-photo.jpg
|   |   +-- works/
|   +-- data/
|       +-- works.json
|       +-- blog.json
+-- README.md
```

## Customize Content

### Projects

Edit `assets/data/works.json` to add or update project cards. The public projects page is `projects.html`; `works.html` redirects there for older links.

Each project supports:

- `title`
- `category`
- `description`
- `image`
- `github`
- `download`
- `url`
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

### About Me, Resume, and Contact

The `about.html` page combines the professional introduction, autoplaying presentation deck, resume timeline, contact form, social links, and location map.

The old `resume.html` and `contact.html` pages redirect to the matching sections on `about.html` so older links continue to work.

Replace `assets/files/resume.pdf` with the latest resume file. Keep the same filename to avoid updating links.

The autoplaying presentation is built with HTML, CSS, and vanilla JavaScript, so it is lightweight and easy to edit directly in `about.html`.

### Profile Photo

Replace `assets/images/profile.jpg` with a new profile image. Keep the same filename for automatic use across the site.

Replace `assets/images/about-photo.jpg` to update the About Me page photo.

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
