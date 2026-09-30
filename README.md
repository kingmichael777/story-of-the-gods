# Story of the gods

The cinematic pitch website for Mike Rashid King’s original science-fiction universe.

## Application

The complete static site is in `dist/`. No package installation, build command, server functions, environment variables, or database are required to serve it. All illustrations, video clips, fonts, and browser libraries are local assets.

- `dist/index.html`: page structure and pitch copy
- `dist/css/style.css`: responsive design
- `dist/js/app.js`: navigation, character roster, dialogs, and scrolling
- `dist/js/scene-motion.js`: hero, character, origin, and Mothership video playback
- `dist/assets/motion/`: encoded videos and static posters

Run a local preview with `python3 -m http.server 8080 --directory dist`, then open http://localhost:8080.

## Netlify deployment

`netlify.toml` sets the publish directory to `dist`. Leave the build command empty and use the repository’s main branch as the production branch.

Existing Netlify project created for this migration:
- Team: SQUAD (`eraced777`)
- Project: `storyofthegods`
- Project ID: `885343da-8406-4b06-a35e-5142feba2aaa`
- Dashboard: https://app.netlify.com/projects/storyofthegods
- Intended domain: `storyofthegods.io`, registered at GoDaddy

The project exists; repository linking, initial deployment, domain assignment, and DNS cutover still need to be completed. Source repository: https://github.com/kingmichael777/story-of-the-gods. Configure both the apex domain and `www` in Netlify and verify HTTPS after DNS resolves. Inspect existing GoDaddy records before editing and preserve unrelated email and verification records.

The existing Sites publication is retained during migration. Its configuration in `.openai/hosting.json` is independent of Netlify and is not published from `dist`.

## Motion

Videos are silent and play inline. They pause when off screen, when the page is hidden, or when motion is disabled. Reduced-motion visitors receive static artwork. The later Mothership scene is tied to scroll position.

## Ownership

Story, characters, and supplied artwork: Mike Rashid King. No license to reuse these materials is granted by the repository.
