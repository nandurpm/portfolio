# Blog post and card automation

The portfolio blog is metadata-driven. New posts should be created in the staging inbox and should never be added manually to the generated card section in `blog.html`.

## One-command workflow

Create a metadata file and an article-body file in a temporary working directory. The metadata file can reference a cover image:

```json
{
  "title": "How I Improve My Engineering Workflow",
  "slug": "improve-engineering-workflow",
  "category": "Engineering",
  "date": "2026-08-19",
  "readTime": "6 min read",
  "excerpt": "Practical habits that make engineering work clearer, faster, and easier to review.",
  "tags": ["engineering", "workflow", "productivity"],
  "imageFile": "improve-engineering-workflow.jpg",
  "contentFile": "improve-engineering-workflow.html",
  "alt": "Engineering workflow notes on a desk"
}
```

The `contentFile` should contain article-body HTML only. For example:

```html
<p>Begin the article here.</p>
<h2>First section</h2>
<p>Continue the article with semantic HTML.</p>
```

Run the helper from the repository root:

```bash
node scripts/create-blog-post.mjs /path/to/improve-engineering-workflow.json
```

The helper creates this staging pair:

```text
uploads/blog/
├── improve-engineering-workflow.html
└── improve-engineering-workflow.jpg
```

It validates the title, slug, category, date, excerpt, read time, article body, and image filename. It also generates canonical, Open Graph, Twitter, and `BlogPosting` metadata so manual uploads follow the same SEO structure as Content Studio posts.

## Publish the staged post

Review the generated HTML, then commit the staging pair:

```bash
git add uploads/blog

git commit -m "Stage blog post: improve engineering workflow"

git push origin main
```

The GitHub Actions publishing workflow then runs the following sequence:

1. `scripts/publish-content.mjs` validates the staged HTML and image.
2. The article is copied to `blog/<slug>.html`.
3. The cover image is copied to `assets/images/blog/<slug>.<ext>`.
4. `assets/data/blog.json` is inserted or updated.
5. `scripts/render-static-content.mjs` regenerates the `BLOG_POSTS_START/END` block in `blog.html`.
6. The three newest posts are regenerated in the homepage `RECENT_POSTS_START/END` block.
7. The processed files are removed from `uploads/blog/`.

The generated blog card uses the record in `assets/data/blog.json`, including its title, URL, image, category, read time, excerpt, date, and tags. Do not edit the generated card block manually because the next publish will overwrite it.

## Editing an existing post

Use the same helper with the existing slug and add the original slug when the slug is being renamed:

```json
{
  "title": "Updated Article Title",
  "slug": "updated-article-title",
  "postOriginalSlug": "old-article-title",
  "category": "Engineering",
  "date": "2026-08-19",
  "readTime": "7 min read",
  "excerpt": "Updated excerpt.",
  "tags": ["engineering", "documentation"],
  "imageFile": "updated-article-title.jpg",
  "contentFile": "updated-article-title.html"
}
```

For a normal update where the slug remains unchanged, no original-slug field is needed. The publisher upserts the matching metadata record rather than creating a duplicate.

## Local verification

Before pushing, render the static cards locally and run the repository audit:

```bash
node scripts/render-static-content.mjs
python3 tools/audit_links.py
git diff --check
git status --short
```

A successful audit should report zero missing local references, zero duplicate IDs, and no pages without titles or descriptions. If the JSON data loads in the browser, `blog.js` provides search, category filtering, and six-post pagination. The static generated cards remain as a fallback if JavaScript or JSON loading fails.

## Category maintenance

The current blog categories are defined in both `blog.html` and `admin/admin.js`. When adding a new category, update both lists until they are moved to a shared category data file. The category string must match exactly, including capitalization, or the category filter will not match the post.

## Content Studio alternative

The browser-based Content Studio at `/admin/` remains the easiest authoring option for non-technical editing. It creates the same staged upload pair and waits for the GitHub Actions workflow. The command-line helper is intended for repeatable local authoring, batch creation, and scripted workflows.
