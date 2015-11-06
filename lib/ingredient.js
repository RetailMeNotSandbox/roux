'use strict';

var _ = require('lodash');

/**
 * Interface to a Roux ingredient
 *
 * @param {Object} config - Ingredient configuration
 * @param {string} config.path - the path to the ingredient
 * @param {string} config.name - the name of the ingredient
 * @param {string} config.pantryName - the name of the pantry
 * @param {boolean[]} config.entryPoints - the entryPoints the ingredient
 *   provides
 */
function Ingredient(config) {
	this.name = config.name;
	this.path = config.path;
	this.pantryName = config.pantryName;
	this.entryPoints = _.clone(config.entryPoints);
}

var INGREDIENT_TOKEN_REGEX = /^[\w-]+$/;
Ingredient.isValidName = function isValidName(name) {
	var tokens = name.split('/');

	return _.every(tokens, function (token) {
		return INGREDIENT_TOKEN_REGEX.test(token);
	});
};

module.exports = Ingredient;
