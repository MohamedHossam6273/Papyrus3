# Interactive Reader (JSON-based)

Static, client-only interactive reader that loads pre-generated story JSON files.

## Files
- `index.html` — main page
- `styles.css` — custom styles
- `app.js` — app logic (auto story loader, save/resume, export, restart)
- `stories/index.json` — list of stories shown in the dropdown
- `stories/sample-story.json` — example story

## How to use
1. Push this repository to GitHub.
2. Enable GitHub Pages in the repository settings (branch `main`, root).
3. Open the published site.
4. Select a story from the dropdown or press **Use sample story**.
5. Play — progress is saved automatically. Use **Restart** to reset.

## Story JSON format
Each story JSON should be an array of segments or an object with `segments` (array). Each segment:
```json
{
  "id": "unique_id",
  "title": "Optional title",
  "text": "Segment text (strings may include newlines)",
  "choices": [
    { "id": "c1", "label": "Choice text", "next": "next_segment_id" },
    ...
  ]
}
