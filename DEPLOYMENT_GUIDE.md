# GitHub Pages Deployment Guide

Complete step-by-step guide to deploy your portfolio website on GitHub Pages with custom domain support.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Setup](#github-setup)
3. [Upload Files](#upload-files)
4. [Enable GitHub Pages](#enable-github-pages)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, make sure you have:

- A GitHub account (free account is sufficient)
- Git installed on your computer (optional but recommended)
- Your portfolio files ready
- Access to your domain's DNS settings (for custom domain)

## GitHub Setup

### Step 1: Create a New Repository

1. Log in to [GitHub](https://github.com)
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `portfolio` (or any name you prefer)
   - **Description**: "Personal portfolio website"
   - **Visibility**: Select "Public" (required for free GitHub Pages)
   - **Initialize with README**: Leave unchecked
5. Click "Create repository"

### Step 2: Get Your Repository URL

After creating the repository, you'll see a page with your repository URL:
- HTTPS: `https://github.com/yourusername/portfolio.git`
- SSH: `git@github.com:yourusername/portfolio.git`

Copy this URL - you'll need it in the next steps.

## Upload Files

### Option 1: Using Git Command Line (Recommended)

**Windows Users**: Install [Git for Windows](https://gitforwindows.org/)
**Mac Users**: Install [Homebrew](https://brew.sh/), then run `brew install git`
**Linux Users**: Run `sudo apt-get install git`

**Steps**:

```bash
# 1. Navigate to your portfolio folder
cd path/to/portfolio

# 2. Initialize git repository
git init

# 3. Add all files
git add .

# 4. Create initial commit
git commit -m "Initial commit: Portfolio website"

# 5. Add remote repository (replace URL with your repository URL)
git remote add origin https://github.com/yourusername/portfolio.git

# 6. Rename branch to main (if needed)
git branch -M main

# 7. Push files to GitHub
git push -u origin main
```

### Option 2: Using GitHub Desktop

**Steps**:

1. Download and install [GitHub Desktop](https://desktop.github.com/)
2. Sign in with your GitHub account
3. Click "File" → "Clone Repository"
4. Find your newly created repository in the list
5. Select a local path and click "Clone"
6. Copy all your portfolio files to the cloned folder
7. In GitHub Desktop, you'll see all files listed as changes
8. Enter a commit message: "Initial commit: Portfolio website"
9. Click "Commit to main"
10. Click "Push origin" to upload files to GitHub

### Option 3: Upload via GitHub Web Interface

**Steps**:

1. Go to your repository on GitHub
2. Click "Add file" → "Upload files"
3. Drag and drop all your portfolio files into the upload area
4. Or click "choose your files" to select them
5. Add a commit message: "Initial commit: Portfolio website"
6. Click "Commit changes"

**Note**: This method uploads files one at a time and may take longer for many files.

## Enable GitHub Pages

### Step 1: Access Repository Settings

1. Go to your repository on GitHub
2. Click the "Settings" tab (gear icon)
3. In the left sidebar, click "Pages"

### Step 2: Configure GitHub Pages

1. Under "Source", select the branch: **main**
2. Select the folder: **/ (root)**
3. Click "Save"

Your site will now be published at:
- `https://yourusername.github.io/portfolio`

**Note**: It may take a few minutes for the site to be live. Refresh the page to check the status.

## Custom Domain Setup

### Step 1: Add Custom Domain in GitHub

1. In the GitHub Pages settings (Settings → Pages)
2. Under "Custom domain", enter your domain: `nandakumarm.dpdns.org`
3. Click "Save"

GitHub will automatically create/update the CNAME file in your repository.

### Step 2: Configure DNS Records

Contact your domain provider (dpdns.org) and add DNS records:

**Option A: CNAME Record (Recommended)**
- Type: CNAME
- Name: www (or your subdomain)
- Value: `yourusername.github.io`

**Option B: A Records**
- Type: A
- Name: @ (root domain)
- Values (add all four):
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

### Step 3: Wait for DNS Propagation

DNS changes can take 15 minutes to 24 hours to propagate. You can check the status at:
- [DNS Checker](https://dnschecker.org/)
- [What's My DNS](https://whatsmydns.net/)

### Step 4: Enable HTTPS

1. Return to GitHub Pages settings
2. Check "Enforce HTTPS" (this option appears after DNS is configured)
3. Your site is now secure with HTTPS

## Verification

### Check if Your Site is Live

1. **GitHub Pages URL**: Visit `https://yourusername.github.io/portfolio`
2. **Custom Domain**: Visit `https://nandakumarm.dpdns.org`

Both URLs should display your portfolio website.

### Verify HTTPS Certificate

1. Click the lock icon in your browser's address bar
2. Click "Certificate" to view certificate details
3. Certificate should be issued by "Let's Encrypt" (provided by GitHub)

### Test All Pages

1. Navigate through all pages to ensure links work
2. Test responsive design by resizing browser window
3. Test on mobile devices
4. Check console for any JavaScript errors (F12)

## Troubleshooting

### Issue: Site Not Loading

**Solution 1**: Check GitHub Pages is enabled
- Go to Settings → Pages
- Verify "Source" is set to "main" branch
- Check "Custom domain" is correctly entered

**Solution 2**: Clear browser cache
- Press Ctrl+Shift+Del (Windows) or Cmd+Shift+Del (Mac)
- Select "All time" and clear cache
- Refresh the page

**Solution 3**: Wait for deployment
- GitHub Pages may take a few minutes to deploy
- Check the "Deployments" tab in your repository
- Look for green checkmark indicating successful deployment

### Issue: Custom Domain Not Working

**Solution 1**: Verify DNS records
- Use [DNS Checker](https://dnschecker.org/)
- Ensure your DNS records are correctly configured
- Wait for DNS propagation (up to 24 hours)

**Solution 2**: Check CNAME file
- Go to your repository
- Verify CNAME file exists in the root directory
- File should contain only your domain name

**Solution 3**: Disable and re-enable custom domain
- Remove custom domain from GitHub Pages settings
- Wait 5 minutes
- Re-add the custom domain
- Save changes

### Issue: Styles/Images Not Loading

**Solution 1**: Check file paths
- Ensure all CSS files are in the `css/` folder
- Ensure all JavaScript files are in the `js/` folder
- Verify relative paths in HTML files are correct

**Solution 2**: Clear browser cache
- Press Ctrl+Shift+Del and clear cache
- Refresh the page

**Solution 3**: Check file names
- Ensure file names match exactly (case-sensitive on GitHub)
- Verify no typos in file paths

### Issue: Links Not Working

**Solution 1**: Verify relative paths
- Check that all links use correct relative paths
- Example: `href="about.html"` for same folder
- Example: `href="works/project-1.html"` for subfolder

**Solution 2**: Test locally first
- Open `index.html` in a local server
- Test all links before deploying
- Fix any broken links locally

### Issue: HTTPS Not Available

**Solution 1**: Wait for certificate
- GitHub Pages needs time to generate SSL certificate
- This can take up to 24 hours
- Check back later

**Solution 2**: Verify DNS is working
- Use [DNS Checker](https://dnschecker.org/)
- Ensure DNS records are properly configured
- HTTPS requires DNS to be working

## Making Updates

### Update Files Locally

1. Edit files on your computer
2. Test changes locally
3. Commit and push changes to GitHub

**Using Git**:
```bash
# Make changes to files
# Then commit and push:
git add .
git commit -m "Update portfolio content"
git push origin main
```

**Using GitHub Desktop**:
1. Make changes to files
2. GitHub Desktop will detect changes
3. Enter commit message
4. Click "Commit to main"
5. Click "Push origin"

### Changes Go Live

- Changes are deployed automatically after pushing to GitHub
- Usually takes 1-2 minutes
- Refresh your browser to see updates

## Performance Tips

1. **Optimize Images**
   - Compress images before uploading
   - Use appropriate formats (JPG for photos, PNG for graphics)
   - Keep file sizes under 1MB

2. **Minimize CSS/JavaScript**
   - Consider minifying files for production
   - Use online tools like [CSS Minifier](https://cssminifier.com/)

3. **Lazy Load Images**
   - Implement lazy loading for better performance
   - Use `loading="lazy"` attribute on images

## Security Best Practices

1. **Never commit sensitive data**
   - Don't include API keys or passwords
   - Don't include personal information

2. **Use HTTPS**
   - Always enforce HTTPS on your site
   - GitHub provides free SSL certificates

3. **Keep dependencies updated**
   - If using any packages, keep them updated
   - Check for security vulnerabilities

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Pages Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages Troubleshooting](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#limits-on-use-of-github-pages)
- [DNS Configuration Guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review GitHub Pages documentation
3. Contact your domain provider for DNS issues
4. Search GitHub Issues for similar problems

---

**Congratulations!** Your portfolio website is now live on GitHub Pages!

For more information, visit: https://pages.github.com/
