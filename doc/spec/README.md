# Roux

A roux is a mixture of butter and flour that provides the base for many sauces,
including the French mother sauces. In the same way, RMN’s Roux ecosystem is a
set of ingredients, tools, and an app that is a base for scalable development of
front-end assets. It consists of:

* pantries of ingredients,
* a set of npm modules to test, lint, visually test, and install the ingredients
  in your app,
* and an app, [Béchamel][], to view ingredients and their documentation.


# Table of Contents

1. Terminology & Spec
    1. [Pantries and Ingredients](#pantries-and-ingredients)
2. The Ingredient Spec
3. Installing and Using
    1. [Creating a pantry and ingredients in my project](local-pantry.md)
4. [Tooling](#tooling)
    1. Testing
    2. Visual Diffing
    3. Linting
    4. Build/Compile
    5. Other
5. [Béchamel](#bechamel)

## Pantries and Ingredients

The core of the Roux ecosystem is pantries and ingredients.

An **ingredient** is a pattern. This can be small, like a button, or large, like
the entire horizontal coupon pattern. An ingredient is reusable, modular, and
standalone.

A **pantry** is a set of ingredients. You can use more than one pantry in your
application, if necessary.

## Ingredient Spec

A component in the Roux ecosystem is called an *ingredient*. A Roux ingredient
contains an `ingredient.md` that describes it, as well as the `hbs`, `scss`, and
if any, `js` that creates it.

Read the [roux ingredient spec](SPEC.md) for more details.

## Tooling

* More information on npm modules, testing, visual diffing, and linting
  [TBD](TBD).

## Béchamel

Béchamel is a viewer for ingredients and their documentation.

Béchamel is an app that allows you to load a pantry, and for any ingredient in
that pantry, show a rendered version, its documentation, and model/state
variations.

This allows a developer to easily view the ingredients they are working on,
create and run tests, and document ingredients, without the effort of running
their main app's build.

See the [Béchamel project README][] for more information.

[Béchamel]: https://github.com/RetailMeNotSandbox/bechamel
[Béchamel project README]: https://github.com/RetailMeNotSandbox/bechamel/blob/master/README.md
