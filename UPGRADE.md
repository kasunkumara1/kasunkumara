# Multi-Media Project Upgrade

This patch upgrades the existing GitHub-only portfolio CMS without replacing your data files.

Replace only these files in the repository:
- /script.js
- /style.css
- /admin/index.html
- /admin/admin.js
- /admin/admin.css

Do NOT replace /data/projects.json, /data/categories.json, or /data/site.json.

New behavior:
- Upload up to 6 image/video files in one project.
- Select multiple files in one chooser or drag/drop multiple files together.
- The first 2 files render side-by-side on the public project card.
- The first 3 files render as a premium mosaic on the public project card.
- More than 3 files show a +N overlay on the third tile.
- Opening a project shows all uploaded media in the project gallery.
- Existing single-media projects continue to work automatically.
- Remove individual media from the editor before saving.
- Direct file limit remains 25 MB per file.
