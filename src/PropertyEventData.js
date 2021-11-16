/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var EventData = require("@frontgear/events/EventData");
var Class = require("@frontgear/lang/Class");

module.exports = Class("@frontgear/properties/PropertyEventData", EventData, function(PropertyEventData, base)
{

	// Public Properties

	this.property = null;
	this.oldValue = null;
	this.newValue = null;

	// Constructor

	this.constructor = function(property, oldValue, newValue)
	{
		this.property = property;
		this.oldValue = oldValue;
		this.newValue = newValue;
	};

});
