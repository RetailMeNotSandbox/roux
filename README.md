# @retailmenot/roux

The SDK for the Roux component architecture, Roux ingredient spec, and a node interface to a pantry.

## Installation

```sh
npm install @retailmenot/roux
```

## Usage

```javascript
var roux = require('@retailmenot/roux');

var pantry = roux.initialize({
  name: 'my-pantry',
  path: 'path/to/my/pantry',
  predicates: {
    less: /^index.less$/
  }
});
```

## API

### `initialize`

Initialize a `Pantry` instance for a pantry of ingredients. This method returns
a promise of the initialized instance and also accepts an optional Node.js-style
callback that can be used in lieu of the promise.

- `config` - Configuration object for the `Pantry` instance
    - `name` - the name of the pantry
    - `path` - the path to the pantry
    - `[predicates]` - optional object of entry point predicates which will be
      checked against the files contained in each ingredient in the pantry
- `[callback]` - Optional Node.js callback

#### Relocating the ingredients base directory

The pantry `path` will always be given as the path to the root directory of the
module. To support better dev ergonomics and allow for more control of project
structure, pantry authors may optionally specify a subdirectory to use as the
base path for ingredients by supplying the `roux.pantryRoot` property in the
pantry modules' `package.json` file.

#### Entry point predicates

Entry point predicates are the mechanism for discovering the entry points an
ingredient exposes. For each predicate, every `Ingredient` instance in the
pantry will have a corresponding property in their `entryPoints` map. The value
of the property will be an object if the predicate matched a file in the
ingredient and `null` otherwise. Predicates for several common entry points are
provided by default.

For example, given an ingredient containing the following files:

```
- ingredient.md
- index.js
- index.hbs
```

The `entryPoints` map might look like:

```javascript
{
  handlebars: {
    filename: 'index.hbs'
  },
  javaScript: {
    filename: 'index.js'
  },
  model: null,
  preview: null,
  previewScript: null,
  sass: null
}
```

Predicates may be functions or regular expressions (`RegExp` instances). The
predicate will be tested against each file in the root of each ingredient until
either a match is found or all files have been checked.

Function predicates are passed the name of the file to be checked as their only
argument. If the predicate can decide synchronously, it should return `true` if
the file matches and `false` otherwise.  If the predicate cannot decide
synchronously, it should return a promise that will be resolved to `true` if the
file matches and `false` otherwise.

##### Default predicates

The following predicates are configured by default:

- `assets` - `/^assets$/`
- `handlebars` - `/^index.hbs$/`
- `javaScript` - `/^index.js$/`
- `model` - `/^model.js$/`
- `preview` - `/^preview.hbs$/`
- `previewScript` - `/^preview.js$/`
- `sass` - `/^index.scss$/`

### `Pantry`

Instances of this class represent a pantry of Roux ingredients. They have the
following properties:

- `name` - the name of the pantry
- `path` - the path to the pantry
- `ingredients` - an object mapping from the name of each ingredient in the
  pantry to a corresponding `Ingredient` instance

### `Ingredient`

Instances of this class represent a Roux ingredient. They have the following
properties:

- `name` - the name of the ingredient
- `path` - the path to the ingredient
- `pantryName` - the name of the pantry this ingredient belongs to
- `entryPoints` - an object mapping from the name of a logical entry point
  ('sass', e.g.) to an object describing the entry point as provided by the
  ingredient or `null` if the ingredient does not provide it

#### `entryPoints`

The properties of this object are either `null` or an object with the following
properties:

- `filename`: the name of the file the ingredient provides for this entry point

### `parseIngredientPath`

Parse the pantry and ingredient names out of an ingredient path. If passed a
valid Roux ingredient path, this function returns an object with the pantry and
ingredient names:

- `pantry` - the name of the pantry, possibly including a namespace
- `ingredient` the name of the ingredient

If passed a string that is not a valid path, it returns `null`. If passed
anything else, it throws an `Error`.

### `resolve`

Resolve a pantry or ingredient to an instance or an entry point to an absolute
path to the corresponding file.

If passed a valid pantry name, this function returns a promise of the
corresponding `Pantry` instance. If passed valid names of a pantry and
ingredient, it returns a promise of the corresponding `Ingredient` instance. If
passed valid names of a pantry, ingredient, and entry point, it returns a
promise of the absolute path to the corresponding entry point file. In all of
these cases, an optional configuration object can be passed as the last
argument.

If passed invalid names, it throws an error. If the pantry, ingredient, or entry
point cannot be found, the returned promise is rejected with an error.

- `pantry`: pantry name
- `ingredient` - optional ingredient name
- `entryPoint` - optional entry point name
- `config` - optional configuration object
- `config.pantries` - a cache of `Pantry` instances
- `config.pantrySearchPaths` - the paths to search for pantries in if not found
    in the cache
