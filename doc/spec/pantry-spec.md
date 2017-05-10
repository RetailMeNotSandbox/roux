# Roux Pantry Spec

A set of ingredients in the Roux ecosystem is called a **pantry**: a filesystem
subtree containing one or more ingredients. [Read the Ingredient specification for more information on ingredients.](ingredient-spec.md)

For example:

```
┌── my-project
│   └── pantry
│       └── pantry.js
│       ├── forms
│       │   └── index.scss
│       │   └── index.hbs
│       │   └── ingredient.md
│       ├── sidebar
│       │   └── index.scss
│       │   └── index.hbs
│       │   └── ingredient.md
│       │   └── model.js
```

## Pantry Name

A pantry has a name. This name must be a string. It may contain dashes,
underscores, and any combination of lowercase letters or numbers. It must
not contain spaces, punctuation, or other characters that are not recognized
as filesystem path names.

### Examples

- `pantry`
- `docs`
- `my-pantry`
- `pantry123`

## Pantry Path

A pantry is named by a *pantry path*. A pantry path must begin with the
name of the pantry, and may include an [npm scope][]: `@scope/my-pantry/`.

```
[<scope>]/<pantry>/
```

It is recommended that the pantry folder is named `pantry`.

### Pantry Root

A consuming application must define a `pantryRoot` as the pantry's path.

```
 "roux": {
   "pantryRoot": "[<scope>]/<pantry>"
 }
```

## `pantry.js`

A pantry is defined by the presence of a file named `pantry.js` in the root
level pantry folder.

A project may contain multiple pantries. A folder with a `pantry.js` file
cannot exist as a child of another pantry folder with a `pantry.js`.

A `pantry.js` must export an object.

That object must include the following properties:

- `name`: the name of the pantry, specified as a string, following the specification in this file
- `version`: the pantry's version, as a semantic version number, specified as a string
- `description`: a one-line description of the pantry's contents, specified as a string
- `initalize`: an object that must contain the following properties:
  - `path`: the path to the pantry, including an optional npm scope, specified as a string
  - `predicates`: an object inside `roux.initalize` that specifies the types of
entry points this pantry contains


## Example `pantry.js`

```
module.exports = {
    "name": "pantry",
    "version": "1.0.3",
    "description": "A pantry with ingredients for my app.",
    initialize: {
        path: "path/to/pantry",
        predicates: {
            sass: /^index.scss$/,
            hbs: /^index.hbs$/,
            js: /^index.js$/,
            model: /^model.js$/,
            preview: /^preview.hbs$/,
            previewSass: /^preview.scss$/,
            previewScript: /^preview.js$/
        },
    }
});
```
