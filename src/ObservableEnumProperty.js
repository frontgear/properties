/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var Class = require("@frontgear/lang/Class");
var EnumProperty = require("./EnumProperty");
var MObservableProperty = require("./MObservableProperty");

module.exports = Class("@frontgear/properties/ObservableEnumProperty", EnumProperty, function(ObservableEnumProperty, base)
{

	Class.mixin(this, MObservableProperty);

	// Constructor

	this.constructor = function(name, type, values, defaultValue)
	{
		if (!(this instanceof ObservableEnumProperty))
			return new ObservableEnumProperty(name, type, values, defaultValue);

		base.constructor.call(this, name, type, values, defaultValue);

		this.initChangedEvent();
	};

	// Protected Methods

	this.writeValue = function(context, value)
	{
		var oldValue = context.value;

		base.writeValue.call(this, context, value);

		this.notifyChanged(context, oldValue, value);
	};

	this.needsWrite = function(context, value)
	{
		return this.hasChange(context, context.value, value);
	};

});
