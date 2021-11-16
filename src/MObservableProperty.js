/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var CascadingEvent = require("@frontgear/events/CascadingEvent");
var MObservableTarget = require("@frontgear/events/MObservableTarget");
var Class = require("@frontgear/lang/Class");
var ErrorUtil = require("@frontgear/lang/ErrorUtil");
var FunctionUtil = require("@frontgear/lang/FunctionUtil");
var Set = require("@frontgear/lang/Set");
var PropertyEventData = require("./PropertyEventData");

module.exports = Class("@frontgear/properties/MObservableProperty", function(MObservableProperty)
{

	// Public Events

	this.changed = null;

	// Public Properties

	this.isObservableProperty = true;

	// Private Properties

	this._changeComparator = null;
	this._onChanged = null;

	// Public Accessor Methods

	this.changeComparator = function(value)
	{
		if (!arguments.length)
			return this._changeComparator;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter changeComparator must be of type Function.");

		this._changeComparator = value || null;

		return this;
	};

	this.onChanged = function(value)
	{
		if (!arguments.length)
			return this._onChanged;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter onChanged must be of type Function.");

		this._onChanged = value || null;

		return this;
	};

	// Protected Methods

	this.initChangedEvent = function()
	{
		this.changed = new PropertyChangedEvent(this);
	};

	this.setupDependencySupport = function(context)
	{
		context._dependencyList = null;
		context._dependencyChangingSet = null;
		context._dependencyChangedHandler = null;
	};

	this.teardownDependencySupport = function(context)
	{
		this.teardownDependencyChangedHandler(context);

		context._dependencyChangingSet = null;
		context._dependencyChangedHandler = null;
	};

	this.setupDependencyChangedHandler = function(context, dependencyList)
	{
		if (context._dependencyList || (dependencyList.length === 0))
			return;

		var target = context.target;
		if (!target.isEventTarget || !target.isListenerTarget)
			return;

		dependencyList = context._dependencyList = dependencyList.concat();

		if (!context._dependencyChangingSet)
			context._dependencyChangingSet = new Set();

		var dependencyChangedHandler = context._dependencyChangedHandler;
		if (!dependencyChangedHandler)
			dependencyChangedHandler = context._dependencyChangedHandler = FunctionUtil.bind(this.dependencyChangedHandler, this, context);

		var dependencyInfo;
		for (var i = 0, l = dependencyList.length; i < l; i++)
		{
			dependencyInfo = dependencyList[i];
			target.listenOn(dependencyInfo.target, dependencyInfo.event, dependencyChangedHandler, this, -Infinity);
		}
	};

	this.teardownDependencyChangedHandler = function(context)
	{
		var dependencyList = context._dependencyList;
		if (!dependencyList)
			return;

		var target = context.target;
		var dependencyChangedHandler = context._dependencyChangedHandler;
		var dependencyInfo;
		for (var i = dependencyList.length - 1; i >= 0; i--)
		{
			dependencyInfo = dependencyList[i];
			target.listenOff(dependencyInfo.target, dependencyInfo.event, dependencyChangedHandler, this);
		}

		context._dependencyList = null;
	};

	this.dependencyChangedHandler = function(context, eventData)
	{
		if (context.isWriting || eventData.isPropagationStopped())
			return;

		var dependencyChangingSet = context._dependencyChangingSet;
		if (dependencyChangingSet.has(eventData))
			return;

		try
		{
			dependencyChangingSet.add(eventData);

			context.target.fire(this.changed, eventData);
		}
		finally
		{
			dependencyChangingSet.del(eventData);
		}
	};

	this.notifyChanged = function(context, oldValue, newValue)
	{
		var target = context.target;
		if (target.isEventTarget)
			target.fire(this.changed, new PropertyEventData(this, oldValue, newValue));
	};

	this.hasChange = function(context, oldValue, newValue)
	{
		if (this._changeComparator)
			return this._changeComparator.call(context.target, oldValue, newValue) ? true : false;

		// default comparison that handles NaN
		return ((oldValue !== newValue) && ((oldValue === oldValue) || (newValue === newValue)));
	};

	// Private Nested Classes

	var PropertyChangedEvent = Class(CascadingEvent, function(PropertyChangedEvent, base)
	{

		// Private Properties

		this._property = null;

		// Constructor

		this.constructor = function(property)
		{
			base.constructor.call(this, property.name() + ".changed", MObservableTarget.changed);

			this._property = property;
		};

		// Public Methods

		this.notifyListeners = function(target, eventData)
		{
			// manually invoke the property onChanged handler to avoid the performance and
			// memory overhead of adding it as an actual listener

			var onChanged = this._property._onChanged;
			if (onChanged)
			{
				var originalCurrentEvent = eventData.currentEvent;
				var originalCurrentTarget = eventData.currentTarget;

				eventData.currentEvent = this;
				eventData.currentTarget = target;

				try
				{
					onChanged.call(target, eventData);
				}
				catch (e)
				{
					ErrorUtil.nonBlockingThrow(e);
				}

				eventData.currentEvent = originalCurrentEvent;
				eventData.currentTarget = originalCurrentTarget;

				if (eventData.isImmediatePropagationStopped())
					return;
			}

			base.notifyListeners.call(this, target, eventData);
		};

	});

});
