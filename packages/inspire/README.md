# @valos/inspire provides the ValOS browser gateway and DOM UI renderer

Provides the runtime entry point and UI rendering integration using
`React`. Sets up the full ValaaStack. Manages initial authentication
and connects to the entry partition. Sets up the rendering module,
attaches it to DOM and renders the entry partition `LENS`. Renders
resources using attached `lens` Media files. Introduces a Media type
`VSX` (similar to `JSX`) specifically for this purpose, which allows
writing natural HTML but also embedding it with fully live ValaaScript
snippets. With promise-enabled rendering enables fully dynamic
ValaaSpace integration with the UI.

- depends: `@valos/engine`, `React`, `brace`
- exports: `createInspireClient`,
- ValaaSpace: `ValaaScope`, `If`, `ForEach`, `TextFileEditor`
- concepts: `model-view`, `HTML5/CSS/JS`, `rapid devevelopment`
