# Portfolio Website Modification Guide

This guide provides instructions on how to easily modify and maintain your redesigned personal portfolio website. The website is built using standard web technologies: HTML, CSS, and JavaScript, making it straightforward to update.

## 1. Understanding the Project Structure

The project consists of three main files:

-   `index.html`: The main structure and content of your website.
-   `style.css`: Controls the visual appearance, colors, fonts, and layout.
-   `script.js`: Manages dynamic content, animations, and interactive features.

## 2. Updating Website Content

Most of the dynamic content on your website is managed through JavaScript arrays in `script.js`. This allows for easy updates without directly editing the HTML.

### 2.1. Updating Hero Section (index.html)

To change your name, roles, and bio in the hero section, directly edit the `index.html` file:

```html
<h1 class="hero-name">Nandakumar M</h1>
<p class="hero-roles">
  <span class="role-tag">Engineer</span>
  <span class="role-dot">·</span>
  <span class="role-tag">Developer</span>
  <span class="role-dot">·</span>
  <span class="role-tag">Creator</span>
</p>
<p class="hero-bio">Passionate about building innovative solutions that solve real-world problems. I combine engineering principles with creative design to craft impactful digital experiences.</p>
```

### 2.2. Updating 
Dynamic Content (script.js)

All dynamic sections like **My Works**, **My Writings**, **Featured Projects**, **Resources**, and **Blog / Updates** are populated from JavaScript arrays defined in `script.js`. Each array contains objects representing individual items.

#### Example: Updating `WORKS` Array

To add, edit, or remove projects, modify the `WORKS` array in `script.js`:

```javascript
const WORKS = [
  { id:1, category:"web", emoji:"🌐", title:"Portfolio Website", date:"2026-06-01", desc:"A modern personal portfolio built with HTML, CSS, and JavaScript. Features responsive design, smooth animations, and dynamic content filtering.", link:"https://github.com/nandurpm/portfolio" },
  { id:2, category:"web", emoji:"💼", title:"E-Commerce Platform", date:"2026-05-15", desc:"Full-stack e-commerce solution with product catalog, shopping cart, and payment integration. Built with React and Node.js.", link:"#" },
  // Add new projects here
];
```

-   **`id`**: Unique identifier (ensure it's unique).
-   **`category`**: Used for filtering (e.g., "web", "technical", "design", "college", "electrical", "docs").
-   **`emoji`**: An emoji to represent the project.
-   **`title`**: The title of your project.
-   **`date`**: Completion date in "YYYY-MM-DD" format.
-   **`desc`**: A short description of the project.
-   **`link`**: URL to the project demo or repository.
-   **`badge`** (Optional, for `FEATURED` only): Text for a small badge (e.g., "Live", "New").

Similarly, update the `WRITINGS`, `FEATURED`, `RESOURCES`, and `UPDATES` arrays following the existing structure.

### 2.3. Updating About Me Section (index.html)

For the "About Me" section, you can directly edit the paragraphs and skill tags in `index.html`:

```html
<div class="about-card">
  <h3>Background</h3>
  <p>I'm a passionate engineer and developer from Chennai, India. With a strong foundation in electrical engineering and a deep interest in software development, I bridge the gap between hardware and software to create innovative solutions.</p>
</div>
<!-- ... -->
<div class="skill-tags">
  <span>Python</span><span>JavaScript</span><span>React</span><span>Node.js</span>
</div>
```

### 2.4. Updating Contact Information (index.html)

Your contact details and social media links are in the `contact` section of `index.html`:

```html
<a href="mailto:nandakumar@example.com">nandakumar@example.com</a>
<!-- ... -->
<span>+91 98765 43210</span>
<!-- ... -->
<a href="https://github.com/nandurpm" target="_blank" class="social-btn" title="GitHub">GH</a>
```

Remember to update the `href` attributes for links and the text content for phone numbers, emails, and location.

## 3. Customizing the Appearance (style.css)

The `style.css` file controls the visual aspects of your website. You can customize colors, fonts, and layout here.

### 3.1. Color Palette

The main color variables are defined at the top of `style.css` in the `:root` selector:

```css
:root {
  --bg:       #0a0e27; /* Main background color */
  --bg2:      #0f1429; /* Secondary background color */
  --amber:    #f5a623; /* Primary accent color */
  --pink:     #ec4899; /* Secondary accent color */
  --text:     #e8eaf0; /* Main text color */
  /* ... other colors ... */
}
```

Modify the hexadecimal color codes to change the website's theme. For example, changing `--amber` will update all elements that use the primary accent color.

### 3.2. Fonts

Font families are also defined in the `:root` selector:

```css
:root {
  --font-display: 'Syne', sans-serif; /* For headings and prominent text */
  --font-body:    'DM Sans', sans-serif;    /* For body text */
}
```

You can change these to other Google Fonts or web-safe fonts. Remember to update the `<link>` tags in `index.html` if you use new Google Fonts.

### 3.3. Layout and Spacing

-   **Sections:** Adjust `padding` values in the `.section` class to change vertical spacing between sections.
-   **Containers:** The `.container` class sets the maximum width for content. Modify `max-width` to make content wider or narrower.
-   **Grids:** Classes like `.works-grid`, `.writings-grid`, `.about-grid`, and `.contact-grid` use CSS Grid. Adjust `grid-template-columns` and `gap` properties to change how items are arranged.

## 4. Enhancing Interactivity (script.js)

### 4.1. Animations

The `script.js` file includes functions for animations:

-   **`observeFadeIns()`**: Manages the fade-in effect for elements with the `fade-in` class as they enter the viewport. You can adjust the `threshold` (how much of the element must be visible to trigger) or the `setTimeout` delay for a different effect.
-   **`@keyframes` in `style.css`**: Animations like `pulse-ring`, `blink`, `fadeInUp`, `fadeInRight`, and `slideIn` are defined in `style.css`. You can modify their duration, timing functions, and keyframes to create different animation styles.

### 4.2. Navigation

-   **`initNav()`**: Handles active navigation links based on scroll position and smooth scrolling. The `window.scrollY >= sec.offsetTop - 100` line determines when a section is considered active. Adjust `100` to change the offset.
-   **Mobile Menu**: The hamburger menu functionality is also within `initNav()`. No major changes are typically needed here unless you want to alter the mobile menu's behavior.

### 4.3. Form Handling

-   **`initContactForm()`**: Contains the logic for the contact form. Currently, it simulates sending an email. To make it truly functional, you would need to integrate it with a backend service (e.g., a serverless function, a PHP script, or a third-party form service like Formspree or Netlify Forms). Replace the `await new Promise(...)` line with an actual `fetch` request to your backend endpoint.
-   **`subscribeNewsletter()`**: Handles the newsletter subscription. Similar to the contact form, this currently uses an `alert`. For a real newsletter, you would integrate this with an email marketing service (e.g., Mailchimp, SendGrid) via an API call.

## 5. Adding New Sections or Pages

### 5.1. Adding a New Section to `index.html`

1.  **HTML Structure**: Create a new `<section>` element with a unique `id` (e.g., `<section id="new-section" class="section">`). Include a `.container` and `.section-header` for consistent styling.
2.  **Navigation Link**: Add a new `<li>` to the `<ul class="nav-links">` and a new `<a>` to the `<div class="mobile-menu">` in `index.html`, linking to your new section's `id`.
3.  **Styling**: Add specific CSS rules for your new section in `style.css`.
4.  **JavaScript (Optional)**: If your new section requires dynamic content or interactivity, add corresponding logic to `script.js` (e.g., a new data array and a `renderNewSection()` function).

### 5.2. Adding a New HTML Page

1.  **Create New HTML File**: Duplicate `index.html` and rename it (e.g., `new-page.html`). Remove sections not relevant to the new page.
2.  **Update Navigation**: Modify the navigation links in `index.html` and `new-page.html` to point to the correct HTML files.
3.  **Styling and Scripting**: Ensure `style.css` and `script.js` are correctly linked. You might need a separate CSS or JS file for page-specific styles/scripts if they are extensive.

## 6. Deployment

This website is designed for easy deployment on platforms like GitHub Pages, Netlify, Vercel, or any static web host. Simply upload the `index.html`, `style.css`, and `script.js` files (along with any images or other assets) to your hosting provider.

## 7. Best Practices for Future Modifications

-   **Version Control**: Always use Git (as you are already doing with GitHub) to track your changes. Commit frequently with descriptive messages.
-   **Backup**: Before making major changes, create a backup of your project files.
-   **Test Thoroughly**: After any modification, test your website on different browsers and devices to ensure everything works as expected.
-   **Semantic HTML**: Use HTML tags that accurately describe the content they contain (e.g., `<nav>`, `<section>`, `<footer>`).
-   **Modular CSS**: Keep your CSS organized. Consider using comments to delineate sections or even breaking it into multiple files for very large projects.
-   **Clean JavaScript**: Write readable and maintainable JavaScript. Use meaningful variable names and comment complex logic.
-   **Performance**: Optimize images, minify CSS/JS (for production), and leverage browser caching to ensure fast loading times.
-   **Accessibility**: Ensure your website is usable by everyone. Use proper ARIA attributes, sufficient color contrast, and keyboard navigation.

By following this guide, you can effectively manage and enhance your portfolio website to reflect your evolving skills and projects. Happy coding!
