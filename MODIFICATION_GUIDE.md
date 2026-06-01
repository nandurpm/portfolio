# Portfolio Modification Guide

This site is a static GitHub Pages portfolio. You can update it without installing a framework or running a build command.

## File Map

- `index.html` - page structure and section order.
- `style.css` - colors, layout, spacing, responsive design, and animation styles.
- `script.js` - editable website content, cards, filters, contact links, and interactions.
- `assets/hero-workstation.png` - main hero visual.
- `CNAME` - your custom GitHub Pages domain.

## Fastest Way To Update Content

Most content is at the top of `script.js`.

### 1. Change Personal Details

Open `script.js` and edit the `SITE` object:

```js
const SITE = {
  name: "Nandakumar M",
  email: "nandakumar@example.com",
  location: "Chennai, Tamil Nadu, India",
  github: "https://github.com/nandurpm",
  linkedin: "https://linkedin.com/in/nandakumar",
  domain: "nandakumarm.dpdns.org",
  skills: []
};
```

Important: replace `nandakumar@example.com` with your real email so the contact form opens the correct mail address.

### 2. Add Or Edit Skills

In `SITE.skills`, add groups like this:

```js
{
  title: "Software",
  items: ["JavaScript", "Python", "HTML", "CSS", "Git"]
}
```

### 3. Add Projects

Edit the `WORKS` array in `script.js`.

```js
{
  title: "My New Project",
  category: "web",
  icon: "WEB",
  date: "2026-06-01",
  description: "Short project description.",
  tags: ["HTML", "CSS", "JavaScript"],
  link: "https://github.com/nandurpm/project-name"
}
```

Allowed project categories are controlled by `WORK_FILTERS`:

- `web`
- `technical`
- `electrical`
- `college`
- `design`
- `docs`

If you create a new category, add it to both `WORK_FILTERS` and the relevant project item.

### 4. Add Featured Items

Edit `FEATURED` in `script.js`. Keep this section short and strong. Three items is ideal.

```js
{
  title: "Portfolio Website",
  description: "The main public hub for my work.",
  status: "Live",
  link: "https://github.com/nandurpm/portfolio"
}
```

### 5. Add Writings

Edit `WRITINGS` in `script.js`.

```js
{
  title: "My Article Title",
  category: "technical",
  icon: "DEV",
  date: "2026-06-01",
  description: "Short preview text.",
  tags: ["Frontend", "Learning"],
  link: "#resources"
}
```

Allowed writing categories are controlled by `WRITING_FILTERS`.

### 6. Add Resources

Edit `RESOURCES` in `script.js`.

```js
{
  title: "Study Materials",
  category: "Learning",
  icon: "MAT",
  description: "Notes, references, and downloads.",
  link: "#contact"
}
```

### 7. Add Updates

Edit `UPDATES` in `script.js`.

```js
daily: [
  {
    date: "2026-06-01",
    title: "Portfolio redesigned",
    description: "Short update text."
  }
]
```

Tabs are controlled by `UPDATE_TABS`.

## Change The Main Text

Hero, about, section headings, and footer copy are in `index.html`. Search for the text you want to change and edit it directly.

Common edits:

- Hero headline: search `Nandakumar M`.
- Hero intro: search `I build clean, useful digital systems`.
- About text: search `Background`.
- Footer domain text: search `nandakumarm.dpdns.org`.

## Change Colors And Theme

Open `style.css` and edit the variables at the top:

```css
:root {
  --ink: #05070a;
  --paper: #f4f7fb;
  --cyan: #35d7ff;
  --teal: #2df0c5;
  --amber: #ffb545;
  --rose: #ff5f8f;
}
```

For a clean futuristic look, keep the dark base and change only 2-3 accent colors at a time.

## Change The Hero Image

Replace this file:

```text
assets/hero-workstation.png
```

Keep the same filename if you do not want to edit HTML. Use a wide image, preferably 16:9 or wider.

## Contact Form

The contact form uses `mailto:`. That means it opens the visitor's email app instead of sending through a backend server.

To make it send emails automatically, connect a service such as Formspree, Netlify Forms, or your own backend API, then replace the submit logic inside `initContactForm()` in `script.js`.

## Deploying Changes

Because this is a GitHub Pages static site:

1. Edit the files.
2. Commit the changes.
3. Push to the `main` branch.
4. Wait for GitHub Pages to redeploy.

Your custom domain is stored in `CNAME`:

```text
nandakumarm.dpdns.org
```

Do not delete `CNAME` unless you want to remove the custom domain.
