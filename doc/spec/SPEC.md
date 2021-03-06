# Conventions
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119][].

# Roux Ingredients
A component in the Roux ecosystem is called an *ingredient*. A Roux ingredient
is a filesystem subtree containing an `ingredient.md` file at its root.
Ingredients must be distributed in a *pantry*: a filesystem subtree containing
one or more Roux ingredients.

An ingredient may be small (e.g. a single button) or large (the entire coupon
ingredient). An ingredient may include other ingredients by composition (the
coupon uses the button ingredient, e.g.), but must not contain other
ingredients: if an `ingredient.md` file appears in a subdirectory of an
ingredient, it will be ignored. Roux ingredient tools must ignore
`ingredient.md` files that appear in a subdirectory of an ingredient.

## `ingredient.md`
An ingredient is defined by the presence of a file named `ingredient.md` in a
directory. The file should document the usage of the ingredient. Roux ingredient
tools may use the first paragraph of the file as a description of the
ingredient.

## Roux ingredient path
Ingredients are named by an *ingredient path*. An ingredient path must begin
with a pantry name followed by a slash: `my-pantry/`. The pantry name may
include an [npm scope][]: `@scope/my-pantry/`. The remainder of the ingredient
path must be the slash-delimited path from the pantry root to the ingredient:
`@scope/my-pantry/path/to/my-ingredient`.

### Examples
- `pantry/ingredient`
- `pantry/path/to/ingredient`
- `@scope/pantry/ingredient`
- `@scope/pantry/path/to/ingredient`

### Private ingredient paths
Ingredients should refer to non-entry point files using relative paths:
`../path/to/file`.

Some technologies (Handlebars, e.g.) have limitations that prevent using
relative paths. In this case, ingredients must refer to non-entry point files by
prepending a relative path from the ingredient root to the file in question with
the ingredient's ingredient path:
`@scope/my-pantry/path/to/my-ingredient/path/to/file`. The resulting path must
be normalized: `@scope/my-pantry/my-ingredient/./foo` must be written as
`@scope/my-pantry/my-ingredient/foo`, e.g.

In any case, an ingredient path must not refer to a non-entry point file in
another ingredient.

## Entry points
Ingredients expose their public interface through *entry points*. An entry point
is a file in the ingredient's root directory with a well-known name, typically
`index.<extension>`, where `<extension>` is replaced by the canonical extension
for whatever technology the interface employs. For example, an ingredient that
exposes a JavaScript interface does so via a file in its root directory named
`index.js`.

### Handlebars
An ingredient's Handlebars entry point must be named `index.hbs`. If the
entry point includes partials (whether from the ingredient or another source),
it must use a full Roux ingredient path. Relative partial paths are not
allowed.

### JavaScript
An ingredient's JavaScript entry point must be named `index.js`. The entry
point may use the AMD or CommonJS module formats. The entry point may
require other files in the ingredient using relative module paths. If the entry
point requires the JavaScript entry point of another ingredient, it must use
a full Roux ingredient path.

### Model
An ingredient may define a model entry point with a JavaScript module named
`model.js`. If present, the exported value of the module must be used as the
root model when rendering a preview of the ingredient.

### Preview script
An ingredient may define a preview script entry point with a JavaScript
module named `preview.js`. If present, this file must be used as the
main script when rendering a preview of the ingredient.

### Preview template
An ingredient may define a preview template entry point with a Handlebars
template named `preview.hbs`. If present, this entry point must be used as
the outermost template when rendering a preview of the ingredient.

### Sass
An ingredient's Sass entry point must be named `index.scss`. The entry point
may import other files in the ingredient using relative module paths.  If the
entry point imports the Sass entry point of another ingredient, it must use
a full Roux ingredient path.

## Composition
While ingredients may not define sub-ingredients, they may reuse other
ingredients by composition. Ingredients may include another ingredient by
referring to one or more of its entry points. Ingredients must not refer to
any other files in an ingredient.

[npm scope]: https://docs.npmjs.com/misc/scope
[RFC 2119]: https://www.ietf.org/rfc/rfc2119.txt
