# Personal Portfolio Website

A futuristic, modern personal portfolio website with dark mode, neon gradients, glassmorphism design, and responsive layout. Built with HTML, CSS, and JavaScript - perfect for GitHub Pages hosting.

## Features

✨ **Design & UI**
- Futuristic dark theme with neon gradients
- Glassmorphism card design
- Smooth animations and transitions
- Responsive layout (desktop, tablet, mobile)
- Glowing borders and hover effects
- 3D floating UI elements
- Professional typography

🎯 **Functionality**
- Mobile hamburger navigation menu
- Smooth scrolling navigation
- Active page highlighting
- Content filtering and search
- Dynamic content loading from JSON files
- Back-to-top button
- Scroll reveal animations
- Card hover effects

📄 **Pages**
1. **Home** - Hero section with featured content
2. **About Me** - Personal introduction, education, skills, certifications
3. **My Works** - Project showcase with category filtering
4. **My Writings** - Blog posts with search and filtering
5. **Notes / Resources** - Study materials and references
6. **Blog / Updates** - Timeline-style updates and announcements
7. **Contact** - Contact information and message form

## Project Structure

```
personal-portfolio-website/
│
├── index.html                 # Home page
├── about.html                 # About Me page
├── works.html                 # My Works page
├── writings.html              # My Writings page
├── resources.html             # Notes & Resources page
├── updates.html               # Blog & Updates page
├── contact.html               # Contact page
│
├── css/
│   └── style.css              # Main stylesheet
│
├── js/
│   └── script.js              # Main JavaScript file
│
├── data/
│   ├── featured.json          # Featured content for homepage
│   ├── works.json             # Projects and works
│   ├── writings.json          # Blog posts and articles
│   ├── resources.json         # Study materials and notes
│   └── updates.json           # Updates and announcements
│
├── assets/
│   ├── images/                # Project images and screenshots
│   ├── icons/                 # Custom icons
│   ├── documents/             # PDFs and downloadable files
│   └── screenshots/           # Website screenshots
│
├── CNAME                      # Custom domain configuration
├── README.md                  # This file
└── LICENSE                    # License file
```

## Getting Started

### Prerequisites
- A web browser (Chrome, Firefox, Safari, Edge)
- A text editor (VS Code, Sublime Text, etc.)
- Git (for version control)
- GitHub account (for hosting)

### Local Development

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/yourusername/personal-portfolio-website.git
   cd personal-portfolio-website
   ```

2. **Open in a local server** (important for JSON loading)
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js (with http-server)
   npx http-server
   ```

3. **Open in browser**
   - Navigate to `http://localhost:8000`

## Customization Guide

### 1. Update Profile Information

**Edit `index.html`, `about.html`, and `contact.html`:**
- Replace "Your Name" with your actual name
- Update profile image: `assets/images/profile.jpg`
- Update bio and introduction text
- Add your social media links
- Update contact information

### 2. Add Featured Content

**Edit `data/featured.json`:**
```json
{
  "featured": [
    {
      "id": 1,
      "title": "Your Featured Item Title",
      "category": "Latest Project",
      "description": "Description of your featured item",
      "date": "Dec 2024",
      "link": "https://your-link.com",
      "downloadLink": null
    }
  ]
}
```

### 3. Add Your Projects

**Edit `data/works.json`:**
```json
{
  "works": [
    {
      "id": 1,
      "title": "Project Title",
      "category": "Technical Projects",
      "description": "Project description",
      "date": "Dec 2024",
      "image": "assets/images/project1.jpg",
      "link": "https://project-link.com",
      "github": "https://github.com/username/repo"
    }
  ]
}
```

**Available categories:**
- Technical Projects
- Design Works
- College Works
- Electrical / Electronics
- Website Projects
- Documentation Work

### 4. Add Blog Posts

**Edit `data/writings.json`:**
```json
{
  "writings": [
    {
      "id": 1,
      "title": "Article Title",
      "category": "Technical Articles",
      "preview": "Short preview text",
      "date": "Dec 2024",
      "tags": ["tag1", "tag2"],
      "link": "#",
      "content": "Full article content"
    }
  ]
}
```

**Available categories:**
- Essays
- Political Writings
- Reviews
- Technical Articles
- College Notes
- Personal Thoughts

### 5. Add Study Resources

**Edit `data/resources.json`:**
```json
{
  "resources": [
    {
      "id": 1,
      "title": "Resource Title",
      "category": "Technical Notes",
      "type": "PDF",
      "description": "Resource description",
      "date": "Dec 2024",
      "tags": ["tag1", "tag2"],
      "downloadLink": "assets/documents/file.pdf",
      "referenceLink": null
    }
  ]
}
```

**Available categories:**
- Technical Notes
- College Notes
- Study Materials
- Reference Links
- Tools

### 6. Add Updates

**Edit `data/updates.json`:**
```json
{
  "updates": [
    {
      "id": 1,
      "title": "Update Title",
      "category": "Announcement",
      "date": "Dec 15, 2024",
      "content": "Update content",
      "link": "#"
    }
  ]
}
```

**Available categories:**
- Announcement
- Technical Learning
- Project Update
- Study Update
- Daily Update
- Personal Update

### 7. Update Contact Form

**Option 1: Using Formspree (Recommended)**

1. Go to [Formspree.io](https://formspree.io)
2. Sign up and create a new form
3. Get your form endpoint (e.g., `https://formspree.io/f/YOUR_FORM_ID`)
4. Update `contact.html`:
   ```javascript
   this.action = 'https://formspree.io/f/YOUR_FORM_ID';
   ```

**Option 2: Using mailto**
```html
<form action="mailto:your.email@example.com" method="POST">
  <!-- form fields -->
</form>
```

### 8. Replace Profile Image

1. Add your profile image to `assets/images/`
2. Name it `profile.jpg` or update the path in HTML files
3. Recommended size: 300x300px or larger
4. Supported formats: JPG, PNG, WebP

### 9. Update Social Links

**Edit footer and contact page:**
- GitHub: Update `https://github.com` links
- LinkedIn: Add your LinkedIn profile URL
- Twitter: Add your Twitter profile URL
- Other social media: Add your profile URLs

### 10. Customize Theme Colors

**Edit `css/style.css` - CSS Variables section:**
```css
:root {
    --neon-blue: #00d4ff;
    --neon-cyan: #00f0ff;
    --neon-purple: #b000ff;
    --neon-pink: #ff006e;
    --neon-green: #39ff14;
    /* ... more colors ... */
}
```

## GitHub Pages Deployment

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New" to create a new repository
3. Name it: `personal-portfolio-website`
4. Choose "Public"
5. Click "Create repository"

### Step 2: Upload Files

**Option A: Using Git (Recommended)**
```bash
# Initialize git in your project folder
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Personal portfolio website"

# Add remote repository
git remote add origin https://github.com/yourusername/personal-portfolio-website.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Option B: Upload via GitHub Web Interface**
1. Go to your repository
2. Click "Add file" → "Upload files"
3. Drag and drop all files
4. Commit changes

### Step 3: Enable GitHub Pages

1. Go to repository Settings
2. Scroll to "Pages" section
3. Under "Source", select "Deploy from a branch"
4. Select branch: `main`
5. Select folder: `/ (root)`
6. Click "Save"
7. Wait 1-2 minutes for deployment

### Step 4: Access Your Website

- Your site will be available at: `https://yourusername.github.io/personal-portfolio-website`
- Check the "Pages" section in Settings for the live URL

## Custom Domain Setup

### Step 1: Purchase Domain

Purchase a domain from:
- GoDaddy
- Namecheap
- Google Domains
- Any other domain registrar

### Step 2: Update CNAME File

1. Edit the `CNAME` file in your repository
2. Replace `yourdomain.com` with your actual domain
3. **Important:** Do NOT include `https://` or `www`
   ```
   yourdomain.com
   ```
4. Commit and push changes

### Step 3: Configure DNS Records

**For GoDaddy:**
1. Go to DNS Management
2. Add these DNS records:
   - Type: `A`
   - Name: `@`
   - Value: `185.199.108.153`
   - Value: `185.199.109.153`
   - Value: `185.199.110.153`
   - Value: `185.199.111.153`

3. Add CNAME record:
   - Type: `CNAME`
   - Name: `www`
   - Value: `yourusername.github.io`

**For other registrars:** Follow similar steps using GitHub's IP addresses

### Step 4: Update GitHub Pages Settings

1. Go to repository Settings → Pages
2. Under "Custom domain", enter: `yourdomain.com`
3. Check "Enforce HTTPS"
4. Save

### Step 5: Verify

- Wait 5-10 minutes for DNS propagation
- Visit your domain: `https://yourdomain.com`
- Your portfolio should be live!

## Adding Content

### Add Project Images

1. Create images (recommended: 400x300px or 16:9 aspect ratio)
2. Save to `assets/images/`
3. Update `data/works.json` with image path

### Add PDF Documents

1. Save PDFs to `assets/documents/`
2. Update JSON files with download links

### Add Screenshots

1. Save screenshots to `assets/screenshots/`
2. Reference in relevant pages

## SEO Optimization

### Update Meta Tags

Edit HTML files to add:
```html
<meta name="description" content="Your portfolio description">
<meta name="keywords" content="developer, designer, portfolio">
<meta name="author" content="Your Name">
```

### Add Favicon

1. Create a favicon (32x32px)
2. Save as `favicon.ico` in root folder
3. Add to HTML head:
   ```html
   <link rel="icon" type="image/x-icon" href="favicon.ico">
   ```

## Performance Tips

1. **Optimize Images:** Use tools like TinyPNG to compress images
2. **Minimize CSS/JS:** Remove unused code
3. **Lazy Loading:** Images load only when visible
4. **Caching:** GitHub Pages automatically caches static files

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Troubleshooting

### JSON Files Not Loading

**Problem:** Content not appearing on pages

**Solution:**
1. Ensure you're using a local server (not file://)
2. Check browser console for errors (F12)
3. Verify JSON file paths are correct
4. Validate JSON syntax at [jsonlint.com](https://www.jsonlint.com)

### Images Not Displaying

**Problem:** Images show as broken

**Solution:**
1. Verify image file exists in `assets/images/`
2. Check image path in JSON/HTML is correct
3. Ensure filename matches exactly (case-sensitive)

### GitHub Pages Not Updating

**Problem:** Changes not appearing on live site

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Wait 5-10 minutes for GitHub Pages to rebuild
3. Check repository Settings → Pages for build status

### Form Not Working

**Problem:** Contact form not submitting

**Solution:**
1. Verify Formspree endpoint is correct
2. Check browser console for errors
3. Ensure form action URL is set properly

## Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with variables and animations
- **JavaScript (ES6+)** - Dynamic functionality
- **JSON** - Data storage
- **GitHub Pages** - Hosting

## Features Breakdown

### CSS Features
- CSS Grid and Flexbox layouts
- CSS variables for theming
- Gradient backgrounds
- Animations and transitions
- Backdrop filters (glassmorphism)
- Box shadows and glow effects
- Responsive media queries

### JavaScript Features
- DOM manipulation
- Event listeners
- Fetch API for JSON loading
- Array methods (filter, map, etc.)
- Local storage (optional)
- Intersection Observer for animations
- Mobile menu toggle

## Best Practices

1. **Keep JSON files updated** - Update content regularly
2. **Optimize images** - Use compressed images for faster loading
3. **Test on mobile** - Ensure responsive design works
4. **Check links** - Verify all links are working
5. **Backup files** - Keep local backups of important content
6. **Use meaningful filenames** - Make files easy to identify

## Future Enhancements

- Dark/Light mode toggle
- Blog post detail pages
- Comments section
- Newsletter signup
- Analytics integration
- PWA (Progressive Web App) support
- Multi-language support

## License

This project is open source and available under the MIT License. See LICENSE file for details.

## Support & Contributions

Found a bug or have suggestions? Feel free to:
- Open an issue on GitHub
- Submit a pull request
- Contact me through the portfolio

## Credits

- Design inspiration: Modern futuristic UI trends
- Icons: Unicode and emoji
- Fonts: System fonts for better performance
- Colors: Neon and cyberpunk aesthetic

## Contact

- Email: your.email@example.com
- GitHub: https://github.com/yourusername
- LinkedIn: https://linkedin.com/in/yourprofile
- Twitter: https://twitter.com/yourhandle

---

**Last Updated:** December 2024

**Version:** 1.0.0

Enjoy your new portfolio website! 🚀
