# Personal Portfolio Website

A modern, responsive, and animated personal portfolio website built with HTML, CSS, and JavaScript. This website is ready to be deployed on GitHub Pages with a custom domain.

## Features

- **Modern Design**: Dark futuristic theme with glassmorphism cards and gradient backgrounds
- **Responsive Layout**: Works seamlessly on all devices (mobile, tablet, desktop)
- **Smooth Animations**: Beautiful scroll animations, hover effects, and transitions
- **Multiple Pages**: Comprehensive portfolio with various sections
- **No Dependencies**: Pure HTML, CSS, and JavaScript - no frameworks or build tools required
- **GitHub Pages Ready**: Optimized for GitHub Pages deployment
- **Custom Domain Support**: Configured for custom domain (nandakumarm.dpdns.org)

## Project Structure

```
portfolio/
│
├── index.html                          # Home page
├── about.html                          # About me page
├── works.html                          # Works overview page
├── writings.html                       # Writings overview page
├── study.html                          # Study/Technical page
├── gallery.html                        # Gallery page
├── contact.html                        # Contact page
├── CNAME                               # Custom domain configuration
├── README.md                           # This file
│
├── css/
│   ├── style.css                       # Main stylesheet
│   ├── animations.css                  # Animation keyframes
│   └── responsive.css                  # Mobile/tablet responsive styles
│
├── js/
│   ├── script.js                       # Main JavaScript functionality
│   ├── writings.js                     # Writings page interactions
│   └── animations.js                   # Advanced animations
│
├── assets/
│   ├── images/
│   │   ├── profile.jpg                 # Profile picture
│   │   ├── banner.jpg                  # Banner image
│   │   └── project-images/             # Project images folder
│   ├── icons/                          # Icon files
│   ├── logos/                          # Logo files
│   └── documents/
│       ├── resume.pdf                  # Resume file
│       └── notes/                      # Study notes folder
│
├── works/
│   ├── technical-works.html            # Technical works page
│   ├── design-works.html               # Design works page
│   ├── project-1.html                  # Project 1 details
│   └── project-2.html                  # Project 2 details
│
└── writings/
    ├── essays/
    │   ├── index.html                  # Essays index
    │   ├── essay-1.html                # Essay 1
    │   └── essay-2.html                # Essay 2
    ├── politics/
    │   ├── index.html                  # Political writings index
    │   ├── political-article-1.html    # Political article 1
    │   └── political-article-2.html    # Political article 2
    ├── movie-reviews/
    │   ├── index.html                  # Movie reviews index
    │   ├── movie-review-1.html         # Movie review 1
    │   └── movie-review-2.html         # Movie review 2
    ├── technical/
    │   ├── index.html                  # Technical articles index
    │   ├── emi-filter-test.html        # Technical article 1
    │   └── escalator-safety.html       # Technical article 2
    └── personal-notes/
        ├── index.html                  # Personal notes index
        ├── note-1.html                 # Personal note 1
        └── note-2.html                 # Personal note 2
```

## Getting Started

### Prerequisites

- Git
- GitHub account
- Text editor (VS Code recommended)
- Web browser

### Local Development

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/nandurpm/portfolio.git
   cd portfolio
   ```

2. **Open in a local server** (optional but recommended)
   - Using Python 3:
     ```bash
     python -m http.server 8000
     ```
   - Using Python 2:
     ```bash
     python -m SimpleHTTPServer 8000
     ```
   - Then visit `http://localhost:8000` in your browser

3. **Or simply open index.html**
   - Double-click `index.html` to open in your default browser

### Customization

Before deploying, customize the following:

1. **Update Personal Information**
   - Edit all HTML files and replace "My Name" with your actual name
   - Update email addresses and social media links
   - Replace placeholder content with your actual information

2. **Add Your Images**
   - Replace `assets/images/profile.jpg` with your profile picture
   - Replace `assets/images/banner.jpg` with your banner image
   - Add project images to `assets/images/project-images/`

3. **Update Content**
   - Edit each page with your actual content
   - Update project descriptions and details
   - Add your writings and articles
   - Customize the about page with your information

4. **Update Social Links**
   - Replace GitHub, LinkedIn, Twitter URLs with your profiles
   - Update email address in contact forms and links

## Deployment on GitHub Pages

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click the "+" icon in the top right and select "New repository"
3. Name your repository: `nandurpm/portfolio` (or your username)
4. Choose "Public" for the repository visibility
5. Click "Create repository"

### Step 2: Upload Files to GitHub

**Option A: Using Git Command Line**

```bash
# Navigate to your portfolio folder
cd portfolio

# Initialize git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Portfolio website"

# Add remote repository
git remote add origin https://github.com/nandurpm/portfolio.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Option B: Using GitHub Desktop**

1. Download and install [GitHub Desktop](https://desktop.github.com/)
2. Click "File" → "Clone Repository"
3. Select your new repository
4. Copy all portfolio files to the cloned folder
5. Commit and push changes

**Option C: Drag and Drop on GitHub**

1. Go to your repository on GitHub
2. Click "Add file" → "Upload files"
3. Drag and drop all portfolio files
4. Commit the changes

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" (gear icon)
3. Scroll down to "GitHub Pages" section
4. Under "Source", select "main" branch
5. Click "Save"
6. Your site will be published at `https://nandurpm.github.io/portfolio`

### Step 4: Configure Custom Domain

1. In your repository settings, scroll to "GitHub Pages"
2. Under "Custom domain", enter: `nandakumarm.dpdns.org`
3. Click "Save"
4. A `CNAME` file will be created automatically

**Note**: The CNAME file is already included in this repository with the correct domain.

### Step 5: Update DNS Settings

Contact your domain provider (dpdns.org) and update DNS settings:

1. Add a CNAME record pointing to `nandurpm.github.io`
2. Or add A records pointing to GitHub Pages IP addresses:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

**Note**: DNS changes can take up to 24 hours to propagate.

### Step 6: Verify Custom Domain

1. Wait for DNS propagation (15 minutes to 24 hours)
2. Visit `https://nandakumarm.dpdns.org` in your browser
3. Your portfolio should now be live!

## File Modifications

### Updating Content

1. **Home Page** (`index.html`)
   - Update hero section text
   - Add your profile image
   - Update featured works and writings

2. **About Page** (`about.html`)
   - Update personal introduction
   - Add education details
   - List your skills
   - Update interests

3. **Works Pages** (`works.html`, `works/`)
   - Update project descriptions
   - Add project links
   - Update technologies used

4. **Writings Pages** (`writings.html`, `writings/`)
   - Add your articles and essays
   - Update writing categories
   - Add publication dates

5. **Contact Page** (`contact.html`)
   - Update email address
   - Add social media links
   - Update contact information

### Styling Customization

Edit `css/style.css` to customize:
- Colors (CSS variables at the top)
- Fonts and typography
- Spacing and layout
- Component styles

Edit `css/responsive.css` for mobile/tablet adjustments.

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

1. **Optimize Images**
   - Compress images before uploading
   - Use appropriate image formats (JPG for photos, PNG for graphics)
   - Consider using WebP format for better compression

2. **Minimize CSS/JS**
   - Consider minifying CSS and JavaScript files
   - Use a build tool like Webpack or Parcel for production

3. **Lazy Loading**
   - Implement lazy loading for images
   - Load scripts asynchronously where possible

## SEO Optimization

The website includes basic SEO features:
- Meta descriptions on each page
- Semantic HTML structure
- Proper heading hierarchy
- Mobile-friendly design

Consider adding:
- Open Graph meta tags for social sharing
- Schema.org structured data
- XML sitemap
- robots.txt file

## Troubleshooting

### Website not loading on custom domain

1. Check CNAME file exists and contains correct domain
2. Verify DNS records are properly configured
3. Wait for DNS propagation (up to 24 hours)
4. Check GitHub Pages settings are enabled

### Styles not loading

1. Verify CSS file paths are correct
2. Check browser console for 404 errors
3. Clear browser cache (Ctrl+Shift+Del)
4. Try a different browser

### Links not working

1. Verify relative paths are correct
2. Check for typos in file names
3. Ensure files exist in the correct directories

## Support & Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Pages Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [HTML Reference](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [JavaScript Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## License

This project is open source and available under the MIT License.

## Credits

Built with HTML, CSS, and JavaScript. No frameworks or dependencies required.

---

**Last Updated**: 2024

For questions or support, please contact: your.email@example.com
