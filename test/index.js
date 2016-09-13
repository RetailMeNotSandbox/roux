'use strict';

/* eslint camelcase: [2, {properties: "never"}], quote-props: 0, max-len: [1, 200] */

var mockfs = require('mock-fs');
var _ = require('lodash');
var mockery = require('mockery');
var path = require('path');
var Promise = require('bluebird');
var sinon = require('sinon');
var tap = require('tap');

var roux = require('../');
var Ingredient = require('../lib/ingredient');
var Pantry = require('../lib/pantry');
var initialize = roux.initialize;
var parseIngredientPath = roux.parseIngredientPath;
var resolve = roux.resolve;
var normalizeConfig = roux.normalizeConfig;
var pantryErrors = roux.errors;

function restoreMockFS() {
	mockfs.restore();
}

tap.test('API', function (t) {
	t.autoend();

	t.type(
		roux.Pantry,
		'function',
		'exports the Pantry class'
	);

	t.type(
		roux.Ingredient,
		'function',
		'exports the Ingredient class'
	);

	t.type(initialize, 'function', 'exports an initialize method');

	t.test('initialize', function (t) {
		t.autoend();

		t.test('returns a Promise', function (t) {
			mockfs({
				'empty-pantry': {
				}
			});

			var promise = initialize({
				path: path.resolve('empty-pantry'),
				name: 'empty-pantry'
			});

			t.type(promise, 'object');
			t.type(promise.then, 'function');

			t.test('resolved with Pantry instance on success', function (t) {
				initialize(
					{
						path: path.resolve('empty-pantry'),
						name: 'empty-pantry'
					})
					.then(function (pantry) {
						t.type(pantry, Pantry);
						t.end();
					});
			});

			t.test('rejected with error on failure', function (t) {
				initialize(
					{
						path: path.resolve('no-such-pantry'),
						name: 'empty-pantry'
					})
					.catch(function (error) {
						t.type(error, Error);
						t.end();
					});
			});

			restoreMockFS();
			t.end();
		});

		t.test('accepts a required config object', function (t) {
			t.autoend();

			t.throws(function () {
				initialize();
			}, 'throws if config is not passed');

			t.throws(function () {
				initialize(123);
			}, 'throws if config not an object');

			t.throws(function () {
				initialize(true);
			}, 'throws if config not an object');

			t.test('config.predicates', function (t) {
				t.autoend();

				t.test('can be regexes', function (t) {
					mockfs({
						'entrypoints-pantry': {
							'custom-only': {
								'ingredient.md': '',
								'index.foo': ''
							}
						}
					});

					return initialize(
						{
							path: path.resolve('entrypoints-pantry'),
							name: 'entrypoints-pantry',
							predicates: {
								foo: /^index.foo$/,
								bar: /^index.bar$/
							}
						})
						.then(function (pantry) {
							t.strictSame(
								pantry.ingredients['custom-only'].entryPoints.foo,
								{
									filename: 'index.foo'
								},
								'pantry.entryPoints[<predicate name>] is an object if match'
							);

							t.equal(
								pantry.ingredients['custom-only'].entryPoints.bar,
								null,
								'pantry.entryPoints[<predicate name>] is null if no match'
							);
						})
						.finally(restoreMockFS);
				});

				t.test('can be synchronous functions', function (t) {
					mockfs({
						'entrypoints-pantry': {
							'custom-only': {
								'ingredient.md': '',
								'index.foo': ''
							}
						}
					});

					return initialize(
						{
							path: path.resolve('entrypoints-pantry'),
							name: 'entrypoints-pantry',
							predicates: {
								foo: function (filename) {
									return filename === 'index.foo';
								},
								bar: function (filename) {
									return filename === 'index.bar';
								},
							}
						})
						.then(function (pantry) {
							t.strictSame(
								pantry.ingredients['custom-only'].entryPoints.foo,
								{
									filename: 'index.foo'
								},
								'pantry.entryPoints[<predicate name>] is an object if match'
							);

							t.equal(
								pantry.ingredients['custom-only'].entryPoints.bar,
								null,
								'pantry.entryPoints[<predicate name>] is null if no match'
							);
						})
						.finally(restoreMockFS);
				});

				t.test('can be asynchronous functions', function (t) {
					mockfs({
						'entrypoints-pantry': {
							'custom-only': {
								'ingredient.md': '',
								'index.foo': ''
							}
						}
					});

					return initialize(
						{
							path: path.resolve('entrypoints-pantry'),
							name: 'entrypoints-pantry',
							predicates: {
								foo: function (filename) {
									return Promise.resolve(filename === 'index.foo');
								},
								bar: function (filename) {
									return Promise.resolve(filename === 'index.bar');
								},
							}
						})
						.then(function (pantry) {
							t.strictSame(
								pantry.ingredients['custom-only'].entryPoints.foo,
								{
									filename: 'index.foo'
								},
								'pantry.entryPoints[<predicate name>] is an object if match'
							);

							t.equal(
								pantry.ingredients['custom-only'].entryPoints.bar,
								null,
								'pantry.entryPoints[<predicate name>] is null if no match'
							);
						})
						.finally(restoreMockFS);
				});

				t.test('can override default predicates', function (t) {
					mockfs({
						'entrypoints-pantry': {
							'js-only': {
								'ingredient.md': '',
								'index.js': ''
							},
							'override-only': {
								'ingredient.md': '',
								'main.js': ''
							}
						}
					});

					return initialize(
						{
							path: path.resolve('entrypoints-pantry'),
							name: 'entrypoints-pantry',
							predicates: {
								javaScript: /^main.js$/
							}
						})
						.then(function (pantry) {
							t.ok(
								pantry.ingredients['override-only'].entryPoints.javaScript,
								'pantry.entryPoints.javaScript is truthy if match'
							);

							t.notOk(
								pantry.ingredients['js-only'].entryPoints.javaScript,
								'pantry.entryPoints.javaScript is falsy if no match'
							);
						})
						.finally(restoreMockFS);
				});
			});
		});

		t.test('accepts an optional node callback', function (t) {
			t.autoend();

			t.test('called with Pantry instance on success', function (t) {
				mockfs({
					'empty-pantry': {}
				});

				initialize(
					{
						path: path.resolve('empty-pantry'),
						name: 'empty-pantry'
					},
					function (error, pantry) {
						t.equals(error, null, 'error should be null');
						t.type(pantry, Pantry);
						t.end();
					})
					.finally(restoreMockFS);
			});

			t.test('called with error on failure', function (t) {
				mockfs({
					'empty-pantry': {}
				});

				initialize(
					{
						path: path.resolve('no-such-pantry'),
						name: 'empty-pantry'
					},
					function (error, pantry) {
						t.type(error, Error);
						t.equals(pantry, undefined, 'pantry should be undefined');
						t.end();
					})
					.catch(function (e) {
						if (e.code !== 'ENOENT') {
							throw e;
						}
					})
					.finally(restoreMockFS);
			});
		});

		t.test('Pantry.ingredients', function (t) {
			t.autoend();

			t.test('is an object', function (t) {
				mockfs({
					'empty-pantry': {}
				});

				return initialize(
					{
						path: path.resolve('empty-pantry'),
						name: 'empty-pantry'
					})
					.then(function (pantry) {
						return t.type(pantry.ingredients, 'object');
					})
					.finally(restoreMockFS);
			});

			t.test('is an empty object if the pantry has no ingredients',
				function (t) {
					mockfs({
						'empty-pantry': {}
					});

					return initialize(
						{
							path: path.resolve('empty-pantry'),
							name: 'empty-pantry'
						})
						.then(function (pantry) {
							return t.same(pantry.ingredients, {});
						})
						.finally(restoreMockFS);
				});

			t.test('has a key for each valid ingredient in the pantry', function (t) {
				mockfs({
					'simple-pantry': {
						one: {
							'ingredient.md': ''
						},
						two: {
							'ingredient.md': ''
						},
						path: {
							to: {
								three: {
									'ingredient.md': ''
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('simple-pantry'),
						name: 'simple-pantry'
					})
					.then(function (pantry) {
						return t.same(
							_.keys(pantry.ingredients).sort(),
							['one', 'two', 'path/to/three'].sort()
						);
					})
					.finally(restoreMockFS);
			});

			t.test('ignores nested ingredients', function (t) {
				mockfs({
					'nested-pantry': {
						'path': {
							'ingredient.md': '',
							'to': {
								'three': {
									'ingredient.md': ''
								}
							}
						},
						'prefix': {
							'ingredient.md': ''
						},
						'prefixed': {
							'ingredient.md': ''
						},
						'prefixedpath': {
							'to': {
								'another': {
									'ingredient.md': ''
								},
								'anotherone': {
									'ingredient.md': ''
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('nested-pantry'),
						name: 'nested-pantry'
					})
					.then(function (pantry) {
						return t.same(
							_.keys(pantry.ingredients).sort(),
							[
								'prefix',
								'prefixed',
								'prefixedpath/to/another',
								'prefixedpath/to/anotherone',
								'path'
							].sort()
						);
					})
					.finally(restoreMockFS);
			});

			t.test('doesn\'t behave differently when package.json exists and roux.pantryRoot property is missing', function (t) {
				mockfs({
					'simple-pantry': {
						'package.json': '{}',
						one: {
							'ingredient.md': ''
						},
						pantry: {
							two: {
								'ingredient.md': ''
							},
							path: {
								to: {
									three: {
										'ingredient.md': ''
									}
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('simple-pantry'),
						name: 'simple-pantry'
					})
					.then(function (pantry) {
						t.same(pantry.path, path.resolve('simple-pantry'), 'pantry path is unchanged');
						t.same(
							_.keys(pantry.ingredients).sort(),
							['one', 'pantry/two', 'pantry/path/to/three'].sort(),
							'ingredients are unchanged'
						);
					})
					.finally(restoreMockFS);
			});

			t.test('doesn\'t behave differently when package.json exists and roux.pantryRoot property is set to a non-string value', function (t) {
				mockfs({
					'simple-pantry': {
						'package.json': JSON.stringify({
							roux: {
								pantryRoot: 8675309
							}
						}),
						one: {
							'ingredient.md': ''
						},
						pantry: {
							two: {
								'ingredient.md': ''
							},
							path: {
								to: {
									three: {
										'ingredient.md': ''
									}
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('simple-pantry'),
						name: 'simple-pantry'
					})
					.then(function (pantry) {
						t.same(pantry.path, path.resolve('simple-pantry'), 'pantry path is unchanged');
						t.same(
							_.keys(pantry.ingredients).sort(),
							['one', 'pantry/two', 'pantry/path/to/three'].sort(),
							'ingredients are unchanged'
						);
					})
					.finally(restoreMockFS);
			});

			t.test('respects custom pantry directory when package.json exists and contains a string value for roux.pantryRoot', function (t) {
				mockfs({
					'simple-pantry': {
						'package.json': JSON.stringify({
							roux: {
								pantryRoot: 'pantry'
							}
						}),
						one: {
							'ingredient.md': ''
						},
						pantry: {
							two: {
								'ingredient.md': ''
							},
							path: {
								to: {
									three: {
										'ingredient.md': ''
									}
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('simple-pantry'),
						name: 'simple-pantry'
					})
					.then(function (pantry) {
						t.same(pantry.path, path.resolve('simple-pantry', 'pantry'), 'pantry path is updated');
						t.same(
							_.keys(pantry.ingredients).sort(),
							['two', 'path/to/three'].sort(),
							'ingredient paths are updated'
						);
					})
					.finally(restoreMockFS);
			});

			t.test('respects custom pantry directory when package.json exists and contains a string value for roux.pantryRoot and pantry sub-directory doesn\'t exist', function (t) {
				mockfs({
					'simple-pantry': {
						'package.json': JSON.stringify({
							roux: {
								pantryRoot: 'notPantry'
							}
						}),
						one: {
							'ingredient.md': ''
						},
						pantry: {
							two: {
								'ingredient.md': ''
							},
							path: {
								to: {
									three: {
										'ingredient.md': ''
									}
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('simple-pantry'),
						name: 'simple-pantry'
					})
					.then(function (pantry) {
						t.same(pantry.path, path.resolve('simple-pantry', 'notPantry'), 'pantry path is updated');
						t.same(
							_.keys(pantry.ingredients).sort(),
							[],
							'no ingredients are found in non-existent directory'
						);
					})
					.finally(restoreMockFS);
			});

			t.test('each value is an Ingredient instance', function (t) {
				mockfs({
					'simple-pantry': {
						one: {
							'ingredient.md': ''
						},
						two: {
							'ingredient.md': ''
						},
						path: {
							to: {
								three: {
									'ingredient.md': ''
								}
							}
						}
					}
				});

				return initialize(
					{
						path: path.resolve('simple-pantry'),
						name: 'simple-pantry'
					})
					.then(function (pantry) {
						return t.ok(_.every(pantry.ingredients, function (ingredient) {
							return ingredient instanceof Ingredient;
						}), 'all ingredients should Ingredient instances');
					})
					.finally(restoreMockFS);
			});

			t.test('Pantry.ingredients[i].entryPoints', function (t) {
				t.autoend();

				t.test('is an object', function (t) {
					mockfs({
						'simple-pantry': {
							one: {
								'ingredient.md': ''
							},
							two: {
								'ingredient.md': ''
							},
							path: {
								to: {
									three: {
										'ingredient.md': ''
									}
								}
							}
						}
					});

					return initialize(
						{
							path: path.resolve('simple-pantry'),
							name: 'simple-pantry'
						})
						.then(function (pantry) {
							return t.ok(_.every(pantry.ingredients, function (ingredient) {
								return typeof ingredient.entryPoints === 'object';
							}), 'Pantry.ingredients[i].entryPoints should be an object');
						})
						.finally(restoreMockFS);
				});

				t.test('Pantry.ingredients[i].entryPoints.javaScript', function (t) {
					mockfs({
						'entrypoints-pantry': {
							'js-only': {
								'ingredient.md': '',
								'index.js': ''
							},
							'sass-only': {
								'ingredient.md': '',
								'index.scss': ''
							}
						}
					});

					return initialize(
						{
							path: path.resolve('entrypoints-pantry'),
							name: 'entrypoints-pantry'
						})
						.then(function (pantry) {
							t.strictSame(
								pantry.ingredients['js-only'].entryPoints.javaScript,
								{
									filename: 'index.js'
								},
								'is an object if ingredient has a JS entrypoint'
							);

							t.equal(
								pantry.ingredients['sass-only'].entryPoints.javaScript,
								null,
								'null if ingredient does not have a JS entrypoint'
							);
						})
						.finally(restoreMockFS);
				});

				t.test('Pantry.ingredients[i].entryPoints.sass', function (t) {
					mockfs({
						'entrypoints-pantry': {
							'js-only': {
								'ingredient.md': '',
								'index.js': ''
							},
							'sass-only': {
								'ingredient.md': '',
								'index.scss': ''
							}
						}
					});

					return initialize(
						{
							path: path.resolve('entrypoints-pantry'),
							name: 'entrypoints-pantry'
						})
						.then(function (pantry) {
							t.strictSame(
								pantry.ingredients['sass-only'].entryPoints.sass,
								{
									filename: 'index.scss'
								},
								'is an object if ingredient has a Sass entrypoint'
							);

							t.equal(
								pantry.ingredients['js-only'].entryPoints.sass,
								null,
								'null if ingredient does not have a Sass entrypoint'
							);
						})
						.finally(restoreMockFS);
				});
			});
		});
	});

	t.type(
		parseIngredientPath,
		'function',
		'exports a parseIngredientPath method'
	);

	t.test('parseIngredientPath', function (t) {
		t.autoend();

		t.test('ingredientPath', function (t) {
			_.forEach(
				[
					0,
					123,
					true,
					false,
					null,
					undefined,
					[],
					{}
				],
				function (arg) {
					t.throws(function () {
						parseIngredientPath({
							pantries: arg
						});
					}, 'must be a string');
				});
			t.end();
		});

		t.equal(parseIngredientPath('foo'), null, 'null if <1 slash');

		var expected = 'ingredient';
		try {
			sinon.spy(Ingredient, 'isValidName');
			parseIngredientPath('pantry/ingredient');
			t.ok(
				Ingredient.isValidName.calledWithExactly(expected),
				'the ingredient name is passed to `Ingredient.isValidName`'
			);
			Ingredient.isValidName.reset();
			parseIngredientPath('@namespace/pantry/ingredient');
			t.ok(
				Ingredient.isValidName.calledWithExactly(expected),
				'the ingredient name is passed to `Ingredient.isValidName`'
			);
		} finally {
			Ingredient.isValidName.restore();
		}

		try {
			expected = 'pantry';
			sinon.spy(Pantry, 'isValidName');
			parseIngredientPath('pantry/ingredient');
			t.ok(
				Pantry.isValidName.calledWithExactly(expected),
				'the pantry name is passed to `Pantry.isValidName`'
			);

			Pantry.isValidName.reset();
			expected = '@namespace/pantry';
			parseIngredientPath('@namespace/pantry/ingredient');
			t.ok(
				Pantry.isValidName.calledWithExactly(expected),
				'the pantry name is passed to `Pantry.isValidName`'
			);
		} finally {
			Pantry.isValidName.restore();
		}

		try {
			sinon.stub(Ingredient, 'isValidName');
			sinon.stub(Pantry, 'isValidName');

			Ingredient.isValidName.returns(false);
			Pantry.isValidName.returns(true);
			t.equal(
				parseIngredientPath('pantry/ingredient'),
				null,
				'returns null if ingredient name is invalid'
			);

			Ingredient.isValidName.returns(true);
			Pantry.isValidName.returns(false);
			t.equal(
				parseIngredientPath('pantry/ingredient'),
				null,
				'returns null if pantry name is invalid'
			);

			Ingredient.isValidName.returns(false);
			Pantry.isValidName.returns(false);
			t.equal(
				parseIngredientPath('pantry/ingredient'),
				null,
				'returns null if both names are invalid'
			);

			Ingredient.isValidName.returns(true);
			Pantry.isValidName.returns(true);
			t.same(
				parseIngredientPath('pantry/ingredient'),
				{
					pantry: 'pantry',
					ingredient: 'ingredient'
				},
				'returns parsed name if both are valid'
			);
		} finally {
			Ingredient.isValidName.restore();
			Pantry.isValidName.restore();
		}

		t.same(
			parseIngredientPath('@namespace/pantry/path/to/ingredient'),
			{
				pantry: '@namespace/pantry',
				ingredient: 'path/to/ingredient'
			},
			'parses nested ingredients'
		);
	});

	t.type(normalizeConfig, 'function', 'exports a normalizeConfig method');

	t.test('normalizeConfig', function (t) {
		t.autoend();
		t.test('arguments', function (t) {
			t.autoend();
			testConfigArgValidation(t, 'config', normalizeConfig);
			testConfigArgValidation(t, 'defaults', normalizeConfig.bind(null, undefined));
			t.test('honors verious permutations of {config,defaults}', function (t) {
				t.autoend();
				t.test('new defaults for pantrySearchPaths', function (t) {
					t.autoend();
					var config = undefined;
					var defaults = {
						pantrySearchPaths: ['test/']
					};
					var normalized = normalizeConfig(config, defaults);
					t.same(normalized.pantrySearchPaths, defaults.pantrySearchPaths);
				});
				t.test('config honored over new defaults for pantrySearchPaths', function (t) {
					t.autoend();
					var config = {
						pantrySearchPaths: ['testing/']
					};
					var defaults = {
						pantrySearchPaths: ['test/']
					};
					var normalized = normalizeConfig(config, defaults);
					t.same(normalized.pantrySearchPaths, config.pantrySearchPaths);
				});
				t.test('new defaults for pantries', function (t) {
					t.autoend();
					var config = undefined;
					var defaults = {
						pantrySearchPaths: ['test/']
					};
					var normalized = normalizeConfig(config, defaults);
					t.same(normalized.pantrySearchPaths, defaults.pantrySearchPaths);
				});
				t.test('config honored over new defaults for pantries', function (t) {
					t.autoend();
					var config = {
						pantries: {testing: {}},
					};
					var defaults = {
						pantries: {test: {}},
					};
					var normalized = normalizeConfig(config, defaults);
					t.same(normalized.pantries, config.pantries);
				});
			});
		});
	});

	t.type(resolve, 'function', 'exports a resolve method');

	t.test('resolve', function (t) {
		t.autoend();

		t.test('arguments', function (t) {
			t.autoend();
			t.test('pantry', function (t) {
				t.throws(function () {
					resolve();
				}, 'is required');

				_.forEach(
					[
						0,
						123,
						true,
						false,
						null,
						[],
						{}
					],
					function (arg) {
						t.throws(function () {
							resolve(arg, 'ingredient', 'entryPoint', {});
						}, 'must be a string');
					});

				_.forEach(
					[
						'',
						'@foo',
						'./foo',
						'/foo',
						'../foo/bar',
						'foo:bar'
					],
					function (arg) {
						t.throws(function () {
							resolve(arg);
						}, 'must be a valid npm package name ' + arg);
					});

				t.end();
			});

			t.test('ingredient', function (t) {
				t.doesNotThrow(function () {
					resolve('pantry').catch(_.noop);
				}, 'is optional');

				_.forEach(
					[
						0,
						123,
						true,
						false,
						null,
						[],
						{}
					],
					function (arg) {
						t.throws(function () {
							resolve('pantry', arg, 'entryPoint', {});
						}, 'must be a string, not ' + arg);
					});

				t.end();
			});

			t.test('entryPoint', function (t) {
				t.doesNotThrow(function () {
					resolve('pantry', 'ingredient').catch(_.noop);
				}, 'is optional');

				_.forEach(
					[
						0,
						123,
						true,
						false,
						null,
						[],
						{}
					],
					function (arg) {
						t.throws(function () {
							resolve('pantry', 'ingredient', arg, {});
						}, 'must be a string, not ' + arg);
					});
				t.end();
			});

			t.test('config', function (t) {
				t.doesNotThrow(function () {
					resolve('pantry', 'ingredient', 'entryPoint').catch(_.noop);
				}, 'is optional');

				_.forEach(
					[
						'',
						'foo',
						0,
						123,
						true,
						false
					],
					function (arg) {
						if (!_.isString(arg)) {
							t.throws(function () {
								resolve('pantry', arg);
							}, 'must be an object, not ' + arg);

							t.throws(function () {
								resolve('pantry', 'ingredient', arg);
							}, 'must be an object, not ' + arg);
						}

						t.throws(function () {
							resolve('pantry', 'ingredient', 'entryPoint', arg);
						}, 'must be an object, not ' + arg);
					});

				t.autoend();

				t.test('config.pantries', function (t) {
					t.doesNotThrow(function () {
						resolve('pantry', {}).catch(_.noop);
						resolve('pantry', 'ingredient', {}).catch(_.noop);
						resolve('pantry', 'ingredient', 'entryPoint', {}).catch(_.noop);
					}, 'is optional');

					_.forEach(
						[
							'',
							'foo',
							0,
							123,
							true,
							false
						],
						function (arg) {
							t.throws(function () {
								resolve('pantry', {pantries: arg});
							}, 'must be an object, not ' + arg);

							t.throws(function () {
								resolve('pantry', 'ingredient', {pantries: arg});
							}, 'must be an object, not ' + arg);

							t.throws(function () {
								resolve(
									'pantry', 'ingredient', 'entryPoint', {pantries: arg});
							}, 'must be an object, not ' + arg);
						});

					t.end();
				});

				t.test('config.pantrySearchPaths', function (t) {
					t.doesNotThrow(function () {
						resolve('pantry', {}).catch(_.noop);
						resolve('pantry', 'ingredient', {}).catch(_.noop);
						resolve('pantry', 'ingredient', 'entryPoint', {}).catch(_.noop);
					}, 'is optional');

					_.forEach(
						[
							'',
							'foo',
							0,
							123,
							true,
							false,
							{}
						],
						function (arg) {
							t.throws(function () {
								resolve('pantry', {pantrySearchPaths: arg});
							}, 'must be an array, not ' + arg);

							t.throws(function () {
								resolve('pantry', 'ingredient', {pantrySearchPaths: arg});
							}, 'must be an array, not ' + arg);

							t.throws(function () {
								resolve(
									'pantry',
									'ingredient',
									'entryPoint',
									{
										pantrySearchPaths: arg
									}
								);
							}, 'must be an array, not ' + arg);
						});

					t.autoend();

					t.test('defaults to `["$CWD/node_modules"]`', function (t) {
						mockfs({
							node_modules: {
								pantry: {
									ingredient: {
										'ingredient.md': ''
									}
								}
							}
						});
						var expectedPath = path.resolve('node_modules', 'pantry');

						return resolve('pantry', {})
							.then(function (actual) {
								t.type(actual, Pantry, 'looks up pantry in node_modules');
								t.equal(actual.path, expectedPath);
							})
							.finally(restoreMockFS);
					});
				});
			});
		});

		t.test('returns a promise', function (t) {
			_.forEach(
				[
					resolve('pantry'),
					resolve('pantry', {}),
					resolve('pantry', 'ingredient'),
					resolve('pantry', 'ingredient', {}),
					resolve('pantry', 'ingredient', 'entry point'),
					resolve('pantry', 'ingredient', 'entry point', {})
				],
				function (returnValue) {
					t.type(returnValue.then, 'function', 'return value is a promise');
					returnValue.catch(_.noop);
				});

			t.end();
		});

		t.test('if passed a pantry only', function (t) {
			t.autoend();

			t.test('returns pantry from `config.pantries` if present', function (t) {
				var expected = new Pantry({
					ingredients: {}
				});

				return resolve('pantry', {
					pantries: {
						pantry: expected
					}
				})
				.then(function (actual) {
					t.same(actual, expected, 'resolves to cached pantry');
				});
			});

			t.test('looks up pantry in search paths if not cached', function (t) {
				t.autoend();

				t.test('resolves if found', function (t) {
					mockfs({
						resolve: {
							pantry: {
								ingredient: {
									'ingredient.md': ''
								}
							}
						}
					});

					return resolve('pantry', {
						pantrySearchPaths: [path.resolve('resolve')]
					})
					.then(function (actual) {
						t.type(actual, Pantry, 'looks up pantry in search paths');
					})
					.finally(restoreMockFS);
				});

				t.test('rejects if not found', function (t) {
					mockfs({
						resolve: {}
					});

					return resolve('no-such-pantry', {
						pantrySearchPaths: [path.resolve('resolve')]
					})
					.catch(function (error) {
						t.type(error, Error, 'resolves with an error if not found');
					})
					.finally(restoreMockFS);
				});
			});
		});

		t.test('if passed a string', function (t) {
			t.autoend();

			t.test('initializes to the specified location on the file system', function (t) {
				t.autoend();

				t.test('resolves if found', function (t) {
					mockfs({
						resolve: {
							pantry: {
								ingredient: {
									'ingredient.md': ''
								}
							}
						}
					});

					return resolve('pantry', {
						pantries: {
							pantry: path.resolve('resolve/pantry')
						}
					})
					.then(function (actual) {
						t.type(actual, Pantry, 'resolves string to pantry');
					})
					.finally(restoreMockFS);
				});

				t.test('modifies the pantry', function (t) {
					mockfs({
						resolve: {
							pantry: {
								ingredient: {
									'ingredient.md': ''
								}
							}
						}
					});

					var config = {
						pantries: {
							pantry: path.resolve('resolve/pantry')
						}
					};

					return resolve('pantry', config)
					.then(function (actual) {
						t.type(config.pantries.pantry, Pantry, 'modifies the cache');
						t.same(config.pantries.pantry, actual, 'modifies the cache');
					})
					.finally(restoreMockFS);
				});
			});
		});

		t.test('if passed a pantry and ingredient only', function (t) {
			t.autoend();

			t.test('looks up ingredient in `config.pantries`',
				function (t) {
					var expected = new Pantry({
						ingredients: {
							ingredient: {}
						}
					});

					return resolve('pantry', 'ingredient', {
						pantries: {
							pantry: expected
						}
					})
					.then(function (actual) {
						t.same(
							actual,
							expected.ingredients.ingredient,
							'resolves to ingredient from cached pantry'
						);
					});
				});

			t.test('looks up ingredient in `config.pantrySearchPaths`', function (t) {
				mockfs({
					resolve: {
						pantry: {
							path: {
								to: {
									ingredient: {
										'ingredient.md': ''
									}
								}
							}
						}
					}
				});

				return resolve('pantry', 'path/to/ingredient', {
					pantrySearchPaths: [path.resolve('resolve')]
				})
				.then(function (actual) {
					t.type(actual, Ingredient, 'looks up ingredient in search paths');
				})
				.finally(restoreMockFS);
			});

			t.test('rejects if not found', function (t) {
				mockfs({
					resolve: {
						pantry: {
							ingredient: {
								'ingredient.md': ''
							}
						}
					}
				});

				return resolve('pantry', 'no-such-ingredient', {
					pantrySearchPaths: [path.resolve('resolve')]
				})
				.catch(function (error) {
					t.type(error, Error, 'resolves with an error if not found');
				})
				.finally(restoreMockFS);
			});

			t.test('rejects with PantryDoesNotExistError if the pantry is not found', function (t) {
				mockfs({
					resolve: {
						pantry: {
							ingredient: {
								'ingredient.md': ''
							}
						},
						pantryTwo: {
							ingredient: {
								'ingredient.md': ''
							}
						}
					}
				});

				return resolve('no-such-pantry', 'ingredient', {
					pantrySearchPaths: [path.resolve('resolve')]
				})
				.catch(function (error) {
					t.type(error, pantryErrors.PantryDoesNotExistError, 'rejects with a PantryDoesNotExistError if pantry not found');
				})
				.finally(restoreMockFS);
			});

			t.test('rejects with PantryNotADirectoryError if the pantry is found but not a directory', function (t) {
				mockfs({
					resolve: {
						pantry: 'this is a file'
					}
				});

				return resolve('pantry', 'ingredient', {
					pantrySearchPaths: [path.resolve('resolve')]
				})
				.catch(function (error) {
					t.type(error, pantryErrors.PantryNotADirectoryError, 'rejects with a PantryNotADirectoryError if pantry found but not a directory');
				})
				.finally(restoreMockFS);
			});

			t.test('rejects with IngredientDoesNotExistError if the ingredient is not found', function (t) {
				mockfs({
					resolve: {
						pantry: {
							ingredient: {
								'ingredient.md': ''
							}
						}
					}
				});

				return resolve('pantry', 'no-such-ingredient', {
					pantrySearchPaths: [path.resolve('resolve')]
				})
				.catch(function (error) {
					t.type(error, pantryErrors.IngredientDoesNotExistError, 'rejects with a IngredientDoesNotExistError if ingredient not found');
				})
				.finally(restoreMockFS);
			});

			t.test('rejects with IngredientHasNoSuchEntrypointError if' +
				'ingredient entryPoint not found',
				function (t) {
					mockfs({
						resolve: {
							pantry: {
								ingredient: {
									'ingredient.md': ''
								}
							}
						}
					});

					return resolve('pantry', 'ingredient', 'handlebars', {
						pantrySearchPaths: [path.resolve('resolve')]
					})
					.catch(function (error) {
						t.type(
							error,
							pantryErrors.IngredientHasNoSuchEntrypointError,
							'rejects with a IngredientHasNoSuchEntrypointError if' +
							'the ingredient has no such entrypoint'
						);
					})
					.finally(restoreMockFS);
				}
			);
		});

		t.test('if passed a pantry, ingredient, and entry point', function (t) {
			t.autoend();

			t.test('returns entry point path from `config.pantries` if present',
				function (t) {
					var expected = '/path/to/pantry/and/ingredient/index.foo';

					return resolve('pantry', 'ingredient', 'entryPoint', {
						pantries: {
							pantry: new Pantry({
								ingredients: {
									ingredient: {
										path: '/path/to/pantry/and/ingredient',
										entryPoints: {
											entryPoint: {
												filename: 'index.foo'
											}
										}
									}
								}
							})
						}
					})
					.then(function (actual) {
						t.same(
							actual,
							expected,
							'resolves to the entry point from the cached pantry'
						);
					});
				});

			t.test('looks up entry point in `config.pantrySearchPaths`',
				function (t) {
					mockfs({
						resolve: {
							pantry: {
								ingredient: {
									'ingredient.md': '',
									'index.js': ''
								}
							}
						}
					});

					var expected =
						path.resolve('resolve', 'pantry', 'ingredient', 'index.js');

					return resolve('pantry', 'ingredient', 'javaScript', {
						pantrySearchPaths: [path.resolve('resolve')]
					})
					.then(function (actual) {
						t.equal(actual, expected, 'looks up entry point in search paths');
					})
					.finally(restoreMockFS);
				});

			t.test('rejects if not found', function (t) {
				mockfs({
					resolve: {
						pantry: {
							ingredient: {
								'ingredient.md': ''
							}
						}
					}
				});

				return resolve('pantry', 'ingredient', 'no-such-entry-point', {
					pantrySearchPaths: [path.resolve('resolve')]
				})
				.catch(function (error) {
					t.type(error, Error, 'resolves with an error if not found');
				})
				.finally(restoreMockFS);
			});
		});
	});
});

tap.test('Ingredient', function (t) {
	t.autoend();

	t.type(
		Ingredient.isValidName,
		'function',
		'provides a static `isValidName` method'
	);

	t.test('Ingredient.isValidName', function (t) {
		t.autoend();
		var Ingredient = require('../lib/ingredient');

		t.ok(Ingredient.isValidName('ingredient'));
		t.ok(Ingredient.isValidName('ingredient2'));
		t.ok(Ingredient.isValidName('ingredient_Two'));
		t.ok(Ingredient.isValidName('ingredient-two'));
		t.ok(Ingredient.isValidName('ingredient-two_3Four'));
		t.ok(Ingredient.isValidName('ingredient/one-1/Two_2/3'));

		t.notOk(Ingredient.isValidName('@ingredient'));
		t.notOk(Ingredient.isValidName('an ingredient'));
	});
});

tap.test('Pantry', function (t) {
	t.autoend();

	t.type(
		Pantry.isValidName,
		'function',
		'provides a static `isValidName` method'
	);

	t.test('Pantry.isValidName', function (t) {
		mockery.enable({
			useCleanCache: true,
			warnOnUnregistered: false
		});

		mockery.registerMock('validate-npm-package-name', sinon.stub().returns({
			validForOldPackages: false,
			validForNewPackages: true
		}));
		var mockValidateNpmPackageName = require('validate-npm-package-name');
		var Pantry = require('../lib/pantry');

		var expected = 'ingredient-name';
		try {
			Pantry.isValidName(expected);
			t.ok(
				mockValidateNpmPackageName.calledWithExactly(expected),
				'delegates to `validate-npm-package-name`'
			);

			mockValidateNpmPackageName.returns({
				validForOldPackages: false,
				validForNewPackages: true
			});
			t.equal(
				Pantry.isValidName(expected),
				true,
				'returns the `validForNewPackages` property value from the result of ' +
					'calling `validate-npm-package-name`'
			);

			mockValidateNpmPackageName.returns({
				validForOldPackages: true,
				validForNewPackages: false
			});
			t.equal(
				Pantry.isValidName(expected),
				false,
				'returns the `validForNewPackages` property value from the result of ' +
					'calling `validate-npm-package-name`'
			);
		} finally {
			mockery.deregisterMock('validate-npm-package-name');
			mockery.disable();
			t.end();
		}
	});

	t.type(
		Pantry.isPantry,
		'function',
		'provides a static `isPantry` method'
	);

	t.test('Pantry.isPantry', function (t) {
		t.notOk(Pantry.isPantry('foo'));
		t.notOk(Pantry.isPantry(1));
		t.notOk(Pantry.isPantry(null));
		t.notOk(Pantry.isPantry({}));
		t.notOk(Pantry.isPantry(function () {}));

		t.ok(Pantry.isPantry(new Pantry({})));
		t.end();
	});
});

function testConfigArgValidation(t, argName, methodToTest) {
	t.test(argName, function (t) {
		t.autoend();

		t.test('does not mutate the original argument', function (t) {
			t.autoend();
			var obj = {};
			methodToTest(obj);
			t.same(obj, {});
		});

		_.forEach(
			[
				'',
				'foo',
				0,
				123,
				true,
				false
			],
			function (arg) {
				t.throws(function () {
					methodToTest(arg);
				}, 'must be an object, not ' + arg);
			});

		t.test(argName + '.pantries', function (t) {
			t.doesNotThrow(function () {
				methodToTest({});
			}, 'is optional');

			_.forEach(
				[
					'',
					'foo',
					0,
					123,
					true,
					false
				],
				function (arg) {
					t.throws(function () {
						methodToTest({pantries: arg});
					}, 'must be an object, not ' + arg);
				});

			t.end();
		});

		t.test(argName + '.pantrySearchPaths', function (t) {
			t.autoend();

			t.doesNotThrow(function () {
				methodToTest({});
			}, 'is optional');

			_.forEach(
				[
					'',
					'foo',
					0,
					123,
					true,
					false,
					{}
				],
				function (arg) {
					t.throws(function () {
						methodToTest({pantrySearchPaths: arg});
					}, 'must be an array, not ' + arg);
				});

			t.test('defaults to `["$CWD/node_modules"]`', function (t) {
				t.autoend();
				var expectedPath = path.resolve('node_modules');
				var normalized = methodToTest({});
				t.equal(normalized.pantrySearchPaths[0], expectedPath);
			});
		});
	});
}
