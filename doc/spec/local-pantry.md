# Creating a Pantry and Ingredients

In your local project, a pantry is simply a folder `pantry` with ingredients inside it.

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

Inside your ingredients, you can reference ingredients from other pantries:

For example, in `my-project/pantry/forms/index.scss`:

```
`@import "another-pantry/atoms/colors";`

// my CSS
```
