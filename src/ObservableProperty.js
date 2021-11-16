/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var Class = require("@frontgear/lang/Class");
var MObservableProperty = require("./MObservableProperty");
var Property = require("./Property");

module.exports = Class("@frontgear/properties/ObservableProperty", Property, function(ObservableProperty, base)
{

	Class.mixin(this, MObservableProperty);

	// Constructor

	this.constructor = function(name, type, defaultValue)
	{
		if (!(this instanceof ObservableProperty))
			return new ObservableProperty(name, type, defaultValue);

		base.constructor.call(this, name, type, defaultValue);

		this.initChangedEvent();
	};

	// Protected Methods

	this.setupContext = function(context)
	{
		base.setupContext.call(this, context);

		this.setupDependencySupport(context);
	};

	this.teardownContext = function(context)
	{
		this.teardownDependencySupport(context);

		base.teardownContext.call(this, context);
	};

	this.writeValue = function(context, value)
	{
		var oldValue = context.value;

		this.teardownDependencyChangedHandler(context);

		base.writeValue.call(this, context, value);

		if ((value != null) && value.isEventTarget && value.isObservableTarget && (value !== this.defaultValue()))
			this.setupDependencyChangedHandler(context, [ { target: value, event: value.changed } ]);

		this.notifyChanged(context, oldValue, value);
	};

	this.needsWrite = function(context, value)
	{
		return this.hasChange(context, context.value, value);
	};

});
