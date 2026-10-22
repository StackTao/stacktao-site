# Local web fonts

These are unmodified WOFF2 web subsets downloaded from the official Google Fonts
CSS service on 2026-10-22. Each family is distributed under SIL Open Font License
1.1; its complete copyright and license notice is included alongside the files.
The font binaries are not sold separately. `sources.json` records each download
URL, size and SHA-256 digest.

| CSS family | Weights/styles included | Intended use | Official source and license |
| --- | --- | --- | --- |
| LXGW WenKai TC | 400 normal | Chinese headings, readable handwriting, letters | [Project](https://github.com/lxgw/LxgwWenkaiTC), [OFL](https://github.com/google/fonts/blob/main/ofl/lxgwwenkaitc/OFL.txt) |
| Ma Shan Zheng | 400 normal | Short brush-written quotations and the wall tool | [Project](https://github.com/googlefonts/mashanzheng), [OFL](https://github.com/google/fonts/blob/main/ofl/mashanzheng/OFL.txt) |
| Newsreader | 400/500 normal, 400 italic | Latin display and reading text | [Project](https://github.com/productiontype/Newsreader), [OFL](https://github.com/google/fonts/blob/main/ofl/newsreader/OFL.txt) |
| Caveat | 400 normal | Latin handwritten annotations and the wall tool | [Project](https://github.com/googlefonts/caveat), [OFL](https://github.com/google/fonts/blob/main/ofl/caveat/OFL.txt) |

`css/typography.css` imports `font-faces.css`. Every face uses `font-display: swap`
and its original `unicode-range`: the browser downloads only the subsets needed
for characters actually displayed, not all 8.6 MB of installed fonts. We retain
all supplied subsets for arbitrary visitor writing, including traditional Chinese.
These fonts do not promise universal Unicode coverage; absent glyphs fall back to
the next family or the system. Caveat is labeled as Latin handwriting in the wall.

The UI and code use system fonts. Do not preload every Chinese subset. Font
requests resolve on this site's own origin; no Google Fonts connection is needed
at runtime. Root preview and production keep identical `assets/fonts/` copies.
The original files can be refreshed from Google's CSS API with these families:
`LXGW WenKai TC:400`, `Ma Shan Zheng:400`, `Newsreader:400,500;italic400`,
`Caveat:400`. Keep source hashes and complete OFL notices when refreshing.
