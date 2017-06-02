'use strict';

var _ = require('lodash');
var assert = require('assert');
var path = require('path');
var pathParse = require('path-parse');
var Promise = require('bluebird');
var util = require('util');
var debug = require('debug')('roux:sdk');

var fs = Promise.promisifyAll(require('fs'));
var globAsync = Promise.promisify(require('glob'));

var Ingredient = require('./lib/ingredient');
var Pantry = require('./lib/pantry');

var defaultPredicates = {
	assets: /^assets$/,
	handlebars: /^index.hbs$/,
	javaScript: /^index.js$/,
	model: /^model.js$/,
	preview: /^preview.hbs$/,
	previewScript: /^preview.js$/,
	sass: /^index.scss$/
};

function IngredientHasNoSuchEntrypointError(pantry, ingredient, entryPoint) {
	this.message = util.format(
		'Ingredient "%s/%s" has no "%s" entry point',
		pantry,
		ingredient,
		entryPoint
	);
}
util.inherits(IngredientHasNoSuchEntrypointError, Error);

function IngredientDoesNotExistError(pantry, ingredient) {
	this.message = util.format(
		'Pantry "%s" has no ingredient "%s"',
		pantry,
		ingredient
	);
}
util.inherits(IngredientDoesNotExistError, Error);

function PantryDoesNotExistError(pantryBasePath) {
	this.message = util.format('Pantry %s does not exist.', pantryBasePath);
}
util.inherits(PantryDoesNotExistError, Error);

function PantryNotADirectoryError(pantryBasePath) {
	this.message = util.format(
		'Invalid pantry "%s", not a directory',
		pantryBasePath
	);
}
util.inherits(PantryNotADirectoryError, Error);

function hasEntryPointAsync(ingredientPath, predicate) {
	if (_.isRegExp(predicate)) {
		predicate = predicate.test.bind(predicate);
	}

	return Promise.try(
		function () {
			return fs.readdirAsync(ingredientPath);
		})
		.then(function (files) {
			var promises = [];

			// We allow the predicate to decide asynchronously for one or more
			// filenames. If the predicate decides synchronously that any file
			// is a valid entrypoint, we immediately resolve to true. We also
			// save any promises of a decision from the predicate in case we
			// need them later.
			var entryPoint = _.find(files, function (file) {
				var result = predicate(file);

				if (result === true) {
					// the file matched the predicate, so we don't need to check
					// further
					return true;
				}

				if (result && _.isFunction(result.then)) {
					// the predicate hasn't decided yet, so save its promise of a
					// decision in case we need it
					promises.push(result.then(function (decision) {
						return decision === true ? file : undefined;
					}));
				}

				return false;
			});

			if (!_.isUndefined(entryPoint)) {
				// predicate decided 'yes' synchronously
				return Promise.resolve({
					filename: entryPoint
				});
			} else if (promises.length < 1) {
				// predicate decided 'no' synchronously
				return Promise.resolve(null);
			}

			// predicate has not decided for all files, so wait for it to do so
			return Promise.all(promises).then(function (results) {
				var entryPoint = _.find(results, _.isString);

				return entryPoint ? {
					filename: entryPoint
				} : null;
			});
		});
}

/**
 * Initialize a Pantry instance for a pantry of ingredients
 *
 * @param {Object} config - configuration for the Pantry
 * @param {string} config.name - the name of the pantry
 * @param {string} config.path - the path to the pantry
 * @param {Object} [config.predicates] - RegExp or Function predicates to decide
 *   if an ingredient contains an entrypoint
 * @param {Function} [callback] - Node.js-style callback for the initialized
 *   Pantry instance or the error if initialization fails
 *
 * @return {Promise} - promise of the initialized Pantry instance
 */
function initialize(config, callback) {
	debug('initializing with config', config);
	assert.ok(_.isObject(config), 'config object is required');
	assert.ok(_.isString(config.name), 'config.name is required');
	assert.ok(_.isString(config.path), 'config.path is required');

	var pantryConfig = {
		name: config.name,
		path: config.path
	};

	config = config || {};
	config.predicates = _.defaults({}, config.predicates, defaultPredicates);

	var pantryBasePath = path.resolve(config.path);
	var pantryPathPrefix = '';
	var promise = Promise.try(function () {
		return fs.statAsync(pantryBasePath)
			.catch(function () {
				throw new PantryDoesNotExistError(pantryBasePath);
			});
	})
	.then(function (pantryStats) {
		if (!pantryStats.isDirectory()) {
			throw new PantryNotADirectoryError(pantryBasePath);
		}
	})
	.then(function () {
		// if package.json exists in the pantry root directory and the
		// roux.pantryRoot key exists, resolve that path from the pantry root to
		// determine the actual directory that ingredients live under.
		var packageJsonPath = path.join(pantryBasePath, 'package.json');
		return fs.readFileAsync(packageJsonPath)
			.then(function (packageJsonBuffer) {
				var packageJson = JSON.parse(packageJsonBuffer);

				if (_.isString(packageJson.roux.pantryRoot)) {
					pantryPathPrefix = packageJson.roux.pantryRoot;
					return path.join(pantryBasePath, pantryPathPrefix);
				}

				return pantryBasePath;
			})
			.catch(function () {
				return pantryBasePath;
			});
	})
	.then(function (pantryPath) {
		pantryConfig.path = pantryPath;
		return globAsync('**/ingredient.md', {
			cwd: pantryPath,
			strict: true
		});
	})
	.then(function (ingredients) {
		var ingredientPaths = [];

		pantryConfig.ingredients = _.chain(ingredients)
			.map(function (ingredient) {
				// we get foo/bar/ingredient.md and need foo/bar
				var ingredientPath = path.resolve(
					pantryBasePath,
					pantryPathPrefix,
					pathParse(ingredient).dir
				);

				// save the path for detecting nested ingredients
				ingredientPaths.push(ingredientPath);

				return ingredientPath;
			})
			.filter(function (ingredientPathToFilter) {
				// to verify that a given ingredient is not nested in any other
				// ingredient, we check that the given ingredient's path does not
				// begin with the path to any other ingredient; we append path.sep to
				// avoid false positives like this: path/to/foo and path/to/foobar
				return _.every(ingredientPaths, function (ingredientPath) {
					return !_.startsWith(
						ingredientPathToFilter,
						ingredientPath + path.sep
					);
				});
			})
			.reduce(function (result, ingredient) {
				var name = path.relative(
					path.join(pantryBasePath, pantryPathPrefix),
					ingredient
				);

				result[name] = new Ingredient({
					name: name,
					path: ingredient,
					pantryName: config.name,
					entryPoints: {}
				});

				return result;
			},
			{})
			.value();

		return Promise.all(
			_.map(pantryConfig.ingredients,
				function (ingredient) {
					// for each predicate, call it with the ingredient path
					return Promise.all(
						_.map(config.predicates, function (predicate, predicateName) {
							return hasEntryPointAsync(ingredient.path, predicate)
								.then(function (result) {
									ingredient.entryPoints[predicateName] = result;
								});
						})
					);
				})
			)
			.then(function () {
				return new Pantry(pantryConfig);
			}
		);
	});

	if (typeof callback === 'function') {
		promise.asCallback(callback);
	}

	return promise;
}

/**
 * @typedef ParsedIngredientPath
 * @type Object
 * @property {string} pantry - the (possibly namespaced) pantry name
 * @property {string} ingredient - the ingredient name
 */

/**
 * Parse the pantry and ingredient names out of an ingredient path
 *
 * If passed a valid Roux ingredient path, this function returns an object with
 * the pantry and ingredient names. If passed a string that is not a valid path,
 * it returns `null`. If passed anything else, it throws an `Error`.
 *
 * @param {string} ingredientPath - the path to parse
 *
 * @return {ParsedIngredientPath} - the parsed ingredient path or null
 */
function parseIngredientPath(ingredientPath) {
	assert(_.isString(ingredientPath), '`ingredientPath` must be a string');

	var split = ingredientPath.split('/');

	var pantry, ingredient;
	if (Pantry.isValidName(split[0])) {
		// the pantry name is not scoped
		pantry = split[0];
		ingredient = split.slice(1).join('/');
	} else {
		// the pantry name is scoped
		pantry = split.slice(0, 2).join('/');
		ingredient = split.slice(2).join('/');
	}

	if (!Pantry.isValidName(pantry) || !Ingredient.isValidName(ingredient)) {
		return null;
	}

	return {
		pantry: pantry,
		ingredient: ingredient
	};
}

/**
 * Resolve a pantry, ingredient or entry point
 *
 * If passed a valid pantry name, this function returns a promise of the
 * corresponding `Pantry` instance. If passed valid names of a pantry and
 * ingredient, it returns a promise of the corresponding `Ingredient` instance.
 * If passed valid names of a pantry, ingredient, and entry point, it returns a
 * promise of the absolute path to the corresponding entry point file.
 *
 * If passed invalid names, it throws an error. If the pantry, ingredient, or
 * entry point cannot be found, the returned promise is rejected with an error.
 *
 * @param {string} pantry - pantry name
 * @param {string} [ingredient] - ingredient name
 * @param {Object} [entryPoint] - entry point name
 * @param {Object} [config] - configuration object
 * @param {Object} config.pantries - a cache of `Pantry` instances. Alternately,
 *   the values here can be file paths. The pantries will be initialized, and
 *   the config.pantries object modified to contain the initialized pantries.
 * @param {string[]} config.pantrySearchPaths - the paths to search for pantries
 *   in if not found in the cache
 *
 * @return {Promise} - promise of the pantry, ingredient, or entry point
 */
function resolve(pantry, ingredient, entryPoint, config) {
	if (!_.isString(pantry)) {
		throw new TypeError('`pantry` must be a string');
	}

	// check for config passed thru ingredient or entryPoint
	if (arguments.length === 2 && _.isObject(ingredient)) {
		config = ingredient;
		ingredient = '';
	} else if (arguments.length === 3 && _.isObject(entryPoint)) {
		config = entryPoint;
		entryPoint = '';
	}

	if (!_.isUndefined(ingredient) && !_.isString(ingredient)) {
		throw new TypeError('`ingredient` must be a string');
	}

	if (!_.isUndefined(entryPoint) && !_.isString(entryPoint)) {
		throw new TypeError('`entryPoint` must be a string');
	}

	if (!Pantry.isValidName(pantry)) {
		throw new Error(util.format('"%s" is not a valid pantry name', pantry));
	}

	if (ingredient && !Ingredient.isValidName(ingredient)) {
		throw new Error(
			util.format('"%s" is not a valid ingredient name', ingredient)
		);
	}

	config = normalizeConfig(config);

	return Promise.try(function () {
		if (pantry in config.pantries) {
			if (_.isString(config.pantries[pantry])) {
				// User passed their own path. Initialize the pantry now.
				return initAndCachePantry(config.pantries, {
					name: pantry,
					path: config.pantries[pantry]
				});
			}

			// return the pantry from the cache
			return config.pantries[pantry];
		}

		// try to find it in one of the provided search paths.
		return Promise.any(config.pantrySearchPaths.map(
			function (searchPath) {
				debug(
					'searching in %s for pantry %s',
					searchPath,
					pantry
				);
				return initAndCachePantry(config.pantries, {
					name: pantry,
					path: path.resolve(searchPath, pantry)
				});
			}));
	})
	.then(function (pantryInstance) {
		assert(
			Pantry.isPantry(pantryInstance),
			util.format(
				'Pantry must be a pantry. Got: %s',
				typeof pantryInstance
			)
		);

		if (!ingredient) {
			// we are resolving a pantry, so we're done
			return pantryInstance;
		}

		if (!pantryInstance.ingredients.hasOwnProperty(ingredient)) {
			throw new IngredientDoesNotExistError(pantry, ingredient);
		}

		var ingredientInstance = pantryInstance.ingredients[ingredient];

		if (!entryPoint) {
			// we are resolving an ingredient, so we're done
			return ingredientInstance;
		}

		if (!ingredientInstance.entryPoints[entryPoint]) {
			throw new IngredientHasNoSuchEntrypointError(
				pantry,
				ingredient,
				entryPoint
			);
		}

		return path.join(
			ingredientInstance.path,
			ingredientInstance.entryPoints[entryPoint].filename
		);
	})
	.catch(function (error) {
		debug('got error', error);
		debug(error.stack);
		if (error instanceof Promise.AggregateError) {
			if (_.every(error, function (e) {
				// Ensure that every error is a PantryDoesNotExistError
				// and if so throw the first instance of that error.
				// Otherwise, just throw the aggregate error.
				return e instanceof PantryDoesNotExistError;
			})) {
				throw error[0];
			} else if (_.every(error, function (e) {
				// Do the same thing for PantryNotADirectoryError
				return e instanceof PantryNotADirectoryError;
			})) {
				throw error[0];
			}
		}
		throw error;
	});
}

/**
 * Proxies to initialize but adds the result to the pantryCache
 * before returning it.
 * @param  {Object} pantryCache cache of pantry objects. The result of
 *   initialize will be stored in pantryCache[config.name]
 * @param  {Object} config      config to be passed to initialize
 * @return {Promise}            promise for the initialized pantry. Once
 *   resolved pantryCache will contain the initialized pantry.
 */
function initAndCachePantry(pantryCache, config) {
	return initialize(config)
	.then(function (initializedPantry) {
		// cache the pantry for next time
		pantryCache[config.name] = initializedPantry;
		return initializedPantry;
	});
}

/**
 * Normalize an config common to a Roux pantry
 *
 * Some modules, such as roux-sass-importer may want to expose a similar api to
 * resolve. This method validates and initializes the configuration accepted by
 * the resolve method.
 *
 * @param {Object} [config] - configuration object
 * @param {Object} config.pantries - a cache of `Pantry` instances
 * @param {string[]} config.pantrySearchPaths - the paths to search for pantries
 * @param {Object} defaults defaults to use when initializing the config
 *
 * @return {Object} valid and initialized config
 */
function normalizeConfig(config, defaults) {
	if (_.isUndefined(config)) {
		config = {};
	}

	if (!_.isObject(config)) {
		throw new TypeError('`config` must be an object');
	}

	if (_.isUndefined(defaults)) {
		defaults = {};
	}

	if (!_.isObject(defaults)) {
		throw new TypeError('`defaults` must be an object');
	}

	config = _.defaults({}, config, defaults, {
		pantries: {},
		pantrySearchPaths: [path.resolve('node_modules')]
	});

	if (!_.isObject(config.pantries)) {
		throw new TypeError('`config.pantries` must be an object');
	}

	if (!_.isArray(config.pantrySearchPaths)) {
		throw new TypeError('`config.pantrySearchPaths` must be an Array');
	}

	return config;
}

module.exports = {
	initialize: initialize,
	parseIngredientPath: parseIngredientPath,
	resolve: resolve,
	normalizeConfig: normalizeConfig,
	errors: {
		PantryDoesNotExistError: PantryDoesNotExistError,
		PantryNotADirectoryError: PantryNotADirectoryError,
		IngredientDoesNotExistError: IngredientDoesNotExistError,
		IngredientHasNoSuchEntrypointError: IngredientHasNoSuchEntrypointError
	},
	Ingredient: Ingredient,
	Pantry: Pantry
};
