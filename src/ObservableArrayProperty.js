/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var Class = require("@frontgear/lang/Class");
var Set = require("@frontgear/lang/Set");
var ArrayProperty = require("./ArrayProperty");
var MObservableProperty = require("./MObservableProperty");

module.exports = Class("@frontgear/properties/ObservableArrayProperty", ArrayProperty, function(ObservableArrayProperty, base)
{

	Class.mixin(this, MObservableProperty);

	// Private Properties

	this._defaultValueSet = null;
	this._itemChangeComparator = null;

	// Constructor

	this.constructor = function(name, itemType, defaultValue)
	{
		if (!(this instanceof ObservableArrayProperty))
			return new ObservableArrayProperty(name, itemType, defaultValue);

		base.constructor.call(this, name, itemType, defaultValue);

		var defaultValueSet = this._defaultValueSet = new Set();
		if (defaultValue)
		{
			for (var i = 0, l = defaultValue.length; i < l; i++)
				defaultValueSet.add(defaultValue[i]);
		}

		this.initChangedEvent();
	};

	// Public Accessor Methods

	this.itemChangeComparator = function(value)
	{
		if (!arguments.length)
			return this._itemChangeComparator;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter itemChangeComparator must be of type Function.");

		this._itemChangeComparator = value || null;

		return this;
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

		if ((value != null) && (value.length > 0))
		{
			var dependencyList = [];
			var defaultValueSet = this._defaultValueSet;
			var itemValue;
			for (var i = 0, l = value.length; i < l; i++)
			{
				itemValue = value[i];
				if ((itemValue != null) && itemValue.isEventTarget && itemValue.isObservableTarget && !defaultValueSet.has(itemValue))
					dependencyList.push({ target: itemValue, event: itemValue.changed });
			}
			if (dependencyList.length > 0)
				this.setupDependencyChangedHandler(context, dependencyList);
		}

		this.notifyChanged(context, oldValue, value);
	};

	this.needsWrite = function(context, value)
	{
		return this.hasChange(context, context.value, value);
	};

	this.hasChange = function(context, oldValue, newValue)
	{
		var changeComparator = this.changeComparator();
		if (changeComparator)
			return changeComparator.call(context.target, oldValue, newValue) ? true : false;

		if (oldValue === newValue)
			return false;

		if ((oldValue == null) || (newValue == null))
			return true;

		var length = oldValue.length;
		if (length !== newValue.length)
			return true;

		for (var i = 0; i < length; i++)
		{
			if (this.hasItemChange(context, oldValue[i], newValue[i]))
				return true;
		}

		return false;
	};

	this.hasItemChange = function(context, oldValue, newValue)
	{
		if (this._itemChangeComparator)
			return this._itemChangeComparator.call(context.target, oldValue, newValue) ? true : false;

		// default comparison that handles NaN
		return ((oldValue !== newValue) && ((oldValue === oldValue) || (newValue === newValue)));
	};

});
