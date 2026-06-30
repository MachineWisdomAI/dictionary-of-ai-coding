# Glanceable Markdown Conversion Notes

This spike treats the generated README as the source of truth. The page should make its existing structure visible before it changes the surface. The goal is not to improve the definitions. The goal is to make the reader see the dictionary as a system.

The first HTML pass failed because it was still document-shaped. It exposed sections and links, but each entry still asked the reader to enter through long prose. For a dictionary, the default semantic object is a concept, not an article. The improved pass renders each concept as a compact knowledge card, then keeps the full source explanation behind disclosure.

## Principles

Start by extracting structure, not styling the wall. In this source, the useful structure is already present: seven sections, term order, entry headings, usage blocks, tables, and internal links. A converter should expose those signals before adding any new hierarchy.

Use source-authored categories first. The seven section headings are stronger evidence than an invented taxonomy because the entries already cluster around them. For example, `Model`, `Parameters`, and `Training` belong to the model mechanics cluster, while `Environment`, `Tool`, and `Sandbox` belong to the tools and environment cluster.

Use exact excerpts for previews. A preview should be an entry's opening source text, shortened only for fit. It should not restate the definition, change tone, or add a new interpretation.

Make the prose secondary when the semantic object is not prose. A concept needs a name, one-line signal, relationship context, and content cues before it needs the full explanation. The full text still matters, but it is the recovery path for depth, not the scanning surface.

Make source links visible as relationships. Internal links show which terms explain each other. High inbound terms such as `Agent`, `Session`, `Model`, `Harness`, `Context`, `Context window`, and `Token` deserve more prominence because the source repeatedly points readers there.

Spend visual weight only on information. In this page, color marks section membership. Size marks level in the hierarchy. Position marks navigation and reading order. There is no decorative palette, no standalone icon system, and no search field standing in for structure.

## Pattern

Parse the source into four layers: document intro, source sections, entries, and link graph. Render those layers in the same order a scanning reader needs them: overview, section map, concept deck, disclosed source text.

Invert each entry. Lead with the term and a source-derived one-line signal. Show measurable cues next: word count, inbound links, outbound links, related concepts, usage, table, and avoid guidance. Collapse the full source entry under a clear disclosure control.

Treat Markdown conversion as a view-selection problem. The renderer should ask what kind of knowledge object it has before choosing layout. A concept should not render like a timeline, a decision record should not render like a dashboard, and a debate should not render like a dictionary.

## Failure Modes

Do not turn each full entry into a card grid. That preserves the wall while making it wider. Cards only help when they change the unit from prose block to semantic summary.

Do not create a new taxonomy unless the source fails to provide one. Here it does provide one.

Do not use color unless a reader can say what the color means. In this spike, it means section membership.

Do not paraphrase definitions for UI convenience. If a summary is needed, derive it from source text and mark the conversion rule in code.
