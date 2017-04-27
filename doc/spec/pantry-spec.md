# Roux Pantry Spec

Ingredients in the Roux ecosystem are distributed in a **pantry**: a filesystem
subtree containing one or more ingredients.

For example:

```
┌── my-project
│   └── pantry
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

A pantry folder is typically but not required to be named `pantry`.

A consuming application will define the `pantryRoot` in its `package.json`:

```
 "roux": {
   "pantryRoot": "pantry"
 }
```

Or for a folder not named `pantry`:

```
 "roux": {
   "pantryRoot": "somethingelse"
 }
```

## `pantry.js`

A pantry is defined by the presence of a file named `pantry.js` in the root
level pantry folder.

A project may contain multiple pantries, but a folder with a `pantry.js` file cannot exist as a child of a folder with a `pantry.js`.

A pantry should know some things about itself:

In `pantry.js`, a developer must define:

* the pantry's name,
* the pantry's version,
* a brief one-line description of the pantry,
* the type of frameworks or languages its ingredients use, as `predicates` in
  `roux.initalize`,
* webpack loaders or plugins that are required to display those ingredients

## Example `pantry.js`

```
module.exports = {
    "name": "my-pantry",
    "version": "1.0.3",
    "description": "A pantry with ingredients for my app.",
    initialize: {
        path: "path/to/my/pantry",
        predicates: {
            sass: /^index.scss$/,
            hbs: /^index.hbs$/,
            js: /^index.js$/,
            model: /^model.js$/,
            preview: /^preview.hbs$/
        },
    }
});
```
