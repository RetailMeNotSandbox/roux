'use strict';

var _ = require('lodash');
var validateNpmPackageName = require('validate-npm-package-name');

/**
 * Interface to a pantry of Roux ingredients
 *
 * @param {Object} config - Pantry configuration
 * @param {string} config.path - the path to the pantry
 * @param {string} config.name - the name of the pantry
 * @param {Ingredient} config.ingredients - the ingredients in the pantry
 */
function Pantry(config) {
	this.name = config.name;
	this.path = config.path;

	this.ingredients = _.clone(config.ingredients);
}

Pantry.isValidName = function isValidName(name) {
	return validateNpmPackageName(name).validForNewPackages;
};

/**
 * Determine whether `obj` is an instance of `Pantry`.
 *
 * @param {*} obj - object to check
 * @returns {Boolean}
 */
Pantry.isPantry = function isPantry(obj) {
	while (obj != null) {
		if (obj.constructor.name === 'Pantry') {
			return true;
		}
		obj = Object.getPrototypeOf(obj);
	}
	return false;
};

module.exports = Pantry;
