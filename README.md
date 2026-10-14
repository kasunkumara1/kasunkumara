# G. Kasun Portfolio — GitHub-Only CMS Edition

A database-free portfolio + admin system designed for GitHub Pages.

## What this version does

- Keeps the premium dark / neon / glassmorphism public UI.
- Loads portfolio projects dynamically from `data/projects.json`.
- Loads categories dynamically from `data/categories.json`.
- Loads public contact settings from `data/site.json`.
- Includes a private-use admin console at `/admin/`.
- Admin can add, edit, publish, unpublish, feature and delete projects.
- Admin can upload project images and short preview videos directly to the GitHub repository.
- Admin can add / rename / delete categories.
- Admin can update email, LinkedIn, Fiverr, availability and resume link.
- Admin can export and restore CMS JSON backups.
- No PHP, Supabase, Firebase or database is required.

## Important security model

GitHub Pages is a static hosting platform. Therefore this project does **not** pretend that a password stored in JavaScript can protect the admin.

The admin page is not linked from the public portfolio and has `noindex`, but the real write authorization is your **GitHub fine-grained personal access token**.

Use a fine-grained token that is:

1. Restricted to **only your portfolio repository**.
2. Given repository permission **Contents: Read and write**.
3. Never pasted into `index.html`, `admin.js`, screenshots, commits or public messages.

The admin stores the token only in browser `sessionStorage`. Disconnecting clears it, and it is not written to the repository.

## 1. Create your GitHub repository

Create a public GitHub repository, for example:

`kasun-portfolio`

Upload **all files and folders from this ZIP** into the repository root.

Your root should look like:

```text
index.html
style.css
script.js
.nojekyll
admin/
data/
images/
assets/
```

## 2. Turn on GitHub Pages

In your repository:

**Settings → Pages → Build and deployment → Source → Deploy from a branch**

Choose:

- Branch: `main`
- Folder: `/(root)`

Save.

Your website will normally be at:

`https://YOUR-USERNAME.github.io/kasun-portfolio/`

Admin:

`https://YOUR-USERNAME.github.io/kasun-portfolio/admin/`

## 3. Create the GitHub admin token

Create a **fine-grained personal access token** in GitHub account settings.

Recommended setup:

- Repository access: **Only select repositories**
- Select: your portfolio repository only
- Repository permissions → **Contents → Read and write**

You do not need to give the token access to all your repositories.

## 4. Connect the admin

Open:

`https://YOUR-USERNAME.github.io/kasun-portfolio/admin/`

Enter:

- GitHub owner: your username
- Repository: `kasun-portfolio`
- Branch: `main`
- Fine-grained token: your token

Press **Connect & Load Portfolio**.

Repository name / owner / branch are stored locally for convenience. The token is only stored for the browser session.

## 5. Upload a new work / project

Admin → **Projects → New Project**

Fill in:

- Title
- Category
- Description
- Tags
- Client
- Year
- Role
- Tools
- External project link (optional)
- Card layout
- Display order
- Published / Featured

Then drag/drop or select an image / preview video.

Click **Save Project**.

The admin will:

1. Upload the media to `assets/projects/...`
2. Update `data/projects.json`
3. Commit those changes to GitHub
4. GitHub Pages will publish the new version automatically

## Upload limits used by this CMS

The admin intentionally limits direct browser uploads to **25 MB per file** for reliability.

Recommended:

- Images: WEBP/JPG, preferably under 2–5 MB
- Video previews: compressed MP4/WEBM, preferably under 15–25 MB
- Full-length/high-resolution videos: YouTube or Vimeo, then add the external project URL

Do not use the Git repository as unlimited raw-video storage.

## Add a category

Admin → **Categories**

Example:

- Name: `Web Development`
- ID: `web-development`

Save it. The public portfolio filter is generated automatically.

A category cannot be deleted while projects are using it.

## Change contact details

Admin → **Site Settings**

You can update:

- Availability text
- Email
- Location
- LinkedIn
- Fiverr
- Resume link/path

This updates `data/site.json`.

## Backup

Admin → **Backup**

**Export Backup** downloads:

- Projects
- Categories
- Site settings

Media files are already stored in GitHub and are not copied into the JSON backup.

## Folder structure

```text
/
├── index.html
├── style.css
├── script.js
├── .nojekyll
├── images/
│   ├── profile.jpg
│   └── sample works...
├── assets/
│   └── projects/
├── data/
│   ├── projects.json
│   ├── categories.json
│   └── site.json
└── admin/
    ├── index.html
    ├── admin.css
    └── admin.js
```

## Notes

- Do not remove `.nojekyll`.
- Do not commit your GitHub token.
- The public site only shows projects where `published` is true.
- Featured projects are sorted before normal projects.
- If you replace project media, old media may remain in the repository. You can delete unused files through GitHub if desired.
- Public contact form opens the visitor's email app (`mailto:`), so no contact-message database is required.

## Local preview

Because the portfolio fetches JSON files, opening `index.html` directly with `file://` may not load the gallery in some browsers.

Use a small local HTTP server if testing locally, or test on GitHub Pages.

Example with Python:

```bash
python -m http.server 8080
```

Then open:

`http://localhost:8080/`
