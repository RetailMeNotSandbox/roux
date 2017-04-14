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

Pantries are typically named `pantry` but can be named anything you choose.
A consuming application will define the `pantryRoot` in its `package.json`:

```
 "roux": {
   "pantryRoot": "pantry"
 }
```


## `pantry.js`

A pantry is defined by the presence of a file named `pantry.js` in the root
level pantry directory (above, `pantry`). A pantry cannot contain another pantry.

A pantry should know some things about itself.

In `pantry.js`, a developer must define:

* the pantry's name,
* the pantry's version,
* a brief one-line description of the pantry,
* the type of frameworks or languages its ingredients use, as `predicates` in
  `roux.initalize`,
* webpack loaders or plugins that are required to display those ingredients

## Example `pantry.js`

```
{
    "name": "my-pantry",
    "version": "1.0.3",
    "description": "A pantry with ingredients for my app.",
    initialize: {
        path: 'path/to/my/pantry',
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
