# Quick Start Guide

Get your portfolio website live in 5 minutes!

## 1. Customize Your Content (5 minutes)

Open each HTML file and replace placeholder text with your information:

- `index.html` - Update your name and introduction
- `about.html` - Add your bio and skills
- `works.html` - Update your projects
- `writings.html` - Add your articles
- `contact.html` - Update your contact information

Replace "My Name" with your actual name throughout the site.

## 2. Add Your Images (2 minutes)

Replace these placeholder images:

- `assets/images/profile.jpg` - Your profile picture
- `assets/images/banner.jpg` - Your banner image
- Add project images to `assets/images/project-images/`

## 3. Update Links (2 minutes)

Replace these with your actual links:

- Email: `your.email@example.com`
- GitHub: `https://github.com/yourusername`
- LinkedIn: `https://linkedin.com/in/yourprofile`
- Twitter: `https://twitter.com/yourhandle`

## 4. Deploy to GitHub (5 minutes)

### Option A: Using Git (Recommended)

```bash
cd portfolio
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/portfolio.git
git branch -M main
git push -u origin main
```

### Option B: Using GitHub Web Interface

1. Go to GitHub.com and create a new repository
2. Click "Upload files"
3. Drag and drop all portfolio files
4. Click "Commit changes"

## 5. Enable GitHub Pages (1 minute)

1. Go to your repository → Settings → Pages
2. Select "main" branch as source
3. Click "Save"
4. Your site is now live at: `https://yourusername.github.io/portfolio`

## 6. Add Custom Domain (Optional)

1. In GitHub Pages settings, enter your domain: `yourdomain.com`
2. Update DNS records with your domain provider
3. Wait for DNS propagation (15 minutes to 24 hours)

## Done! 🎉

Your portfolio website is now live!

- **GitHub Pages URL**: `https://yourusername.github.io/portfolio`
- **Custom Domain**: `yourdomain.com` (if configured)

## Next Steps

- Update content regularly
- Add more projects and writings
- Share your portfolio with others
- Monitor analytics (optional)

## Need Help?

- See `DEPLOYMENT_GUIDE.md` for detailed instructions
- See `README.md` for comprehensive documentation
- Check GitHub Pages docs: https://pages.github.com/

---

**Pro Tip**: Test your site locally before deploying!

```bash
# Using Python 3
python -m http.server 8000

# Then visit: http://localhost:8000
```
