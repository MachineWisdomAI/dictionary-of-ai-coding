# Glanceable Markdown Conversion Notes

This spike treats the generated README as the source of truth. The page should make its existing structure visible before it changes the surface. The goal is not to improve the definitions. The goal is to make the reader see the dictionary as a system.

## Principles

Start by extracting structure, not styling the wall. In this source, the useful structure is already present: seven sections, term order, entry headings, usage blocks, tables, and internal links. A converter should expose those signals before adding any new hierarchy.

Use source-authored categories first. The seven section headings are stronger evidence than an invented taxonomy because the entries already cluster around them. For example, `Model`, `Parameters`, and `Training` belong to the model mechanics cluster, while `Environment`, `Tool`, and `Sandbox` belong to the tools and environment cluster.

Use exact excerpts for previews. A preview should be an entry's opening source text, shortened only for fit. It should not restate the definition, change tone, or add a new interpretation.

Make source links visible as relationships. Internal links show which terms explain each other. High inbound terms such as `Agent`, `Session`, `Model`, `Harness`, `Context`, `Context window`, and `Token` deserve more prominence because the source repeatedly points readers there.

Spend visual weight only on information. In this page, color marks section membership. Size marks level in the hierarchy. Position marks navigation and reading order. There is no decorative palette, no standalone icon system, and no search field standing in for structure.

## Pattern

Parse the source into four layers: document intro, source sections, entries, and link graph. Render those layers in the same order a scanning reader needs them: overview, section map, term atlas, full entries.

Keep the full source text in one continuous reading surface. The atlas is for finding a term. The entry body is for reading it. Relationship chips at the end of each entry return the reader to the source section and show nearby links without interrupting the prose.

## Failure Modes

Do not turn each entry into a card grid. That preserves the wall while making it wider.

Do not create a new taxonomy unless the source fails to provide one. Here it does provide one.

Do not use color unless a reader can say what the color means. In this spike, it means section membership.

Do not paraphrase definitions for UI convenience. If a summary is needed, derive it from source text and mark the conversion rule in code.
