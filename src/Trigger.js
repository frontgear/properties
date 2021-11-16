/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var Event = require("@frontgear/events/Event");
var MEventTarget = require("@frontgear/events/MEventTarget");
var Class = require("@frontgear/lang/Class");
var FunctionUtil = require("@frontgear/lang/FunctionUtil");
var Property = require("./Property");

module.exports = Class("@frontgear/properties/Trigger", Object, function(Trigger, base)
{

	// Private Static Properties

	var _slice = Array.prototype.slice;

	// Public Static Methods

	Trigger.eventDataParameter = function(eventData)
	{
		return [ eventData ];
	};

	// Private Static Methods

	var _resolveMethod = function(target, method, strict)
	{
		if (target == null)
			throw new Error("Parameter target must be non-null.");
		if (method == null)
			throw new Error("Parameter method must be non-null.");

		if (Class.isFunction(method))
			return FunctionUtil.bind(method, target);

		if (!Class.isString(method))
			throw new Error("Parameter method must be of type String or Function.");

		var methodName = method;
		if (methodName.indexOf(".") < 0)
		{
			method = target[methodName];
		}
		else
		{
			var methodPath = methodName.split(".");
			method = target;
			for (var i = 0, l = methodPath.length; i < l; i++)
			{
				target = method;
				method = target[methodPath[i]];
				if (method == null)
					break;
			}
		}

		if ((method != null) && Class.isFunction(method))
			return FunctionUtil.bind(method, target);

		if (strict !== false)
			throw new Error("Unknown method \"" + methodName + "\".");

		return null;
	};

	// Private Properties

	this._target = null;
	this._targetPath = null;
	this._source = null;
	this._sourceEvent = null;
	this._preventDefault = false;
	this._stopPropagation = false;
	this._stopImmediatePropagation = false;
	this._condition = null;
	this._parameters = null;
	this._isOn = false;

	// Constructor

	this.constructor = function(target, targetPath)
	{
		if (target == null)
			throw new Error("Parameter target must be non-null.");

		if (targetPath == null)
			throw new Error("Parameter targetPath must be non-null.");

		targetPath = Class.isArray(targetPath) ? targetPath.concat() : _slice.call(arguments, 1);
		var targetPathLength = targetPath.length;
		if (targetPathLength === 0)
			throw new Error("Parameter targetPath must be non-empty.");

		var targetPropertyOrMethod;
		for (var i = 0; i < targetPathLength; i++)
		{
			targetPropertyOrMethod = targetPath[i];
			if (targetPropertyOrMethod == null)
				throw new Error("Parameter targetPath must not contain null.");
			if (!(targetPropertyOrMethod instanceof Property) && !Class.isFunction(targetPropertyOrMethod) && !Class.isString(targetPropertyOrMethod))
				throw new Error("Parameter targetPath must be of type String, Function, " + Class.getName(Property) + ", or Array<String|Function|" + Class.getName(Property) + ">.");
			if ((i < (targetPathLength - 1)) && Class.isFunction(targetPropertyOrMethod))
				throw new Error("Parameter targetPath must not contain a Function before the end of the path.");
		}

		this._target = target;
		this._targetPath = targetPath;
	};

	// Public Accessor Methods

	this.target = function()
	{
		return this._target;
	};

	this.targetPath = function()
	{
		return this._targetPath.concat();
	};

	this.targetPathResolved = function()
	{
		var path = [];

		var target = this._target;
		var targetPath = this._targetPath;
		var targetPathLength = targetPath.length;
		var targetPropertyOrMethod;
		var isOn = this._isOn;

		for (var i = 0; i < targetPathLength; i++)
		{
			if (i < (targetPathLength - 1))
				targetPropertyOrMethod = (isOn && (target != null)) ? Property.resolve(target, targetPath[i], false) : null;
			else
				targetPropertyOrMethod = (isOn && (target != null)) ? _resolveMethod(target, targetPath[i], false) : null;

			if (targetPropertyOrMethod)
			{
				path.push(targetPropertyOrMethod);
				if (i < (targetPathLength - 1))
					target = target.isPropertyTarget ? target.get(targetPropertyOrMethod) : null;
			}
			else
			{
				path.push(null);
				target = null;
			}
		}

		return path;
	};

	this.source = function()
	{
		return this._source;
	};

	this.sourceEvent = function()
	{
		return this._sourceEvent;
	};

	this.preventDefault = function(value)
	{
		if (!arguments.length)
			return this._preventDefault;

		if ((value != null) && !Class.isBoolean(value))
			throw new Error("Parameter preventDefault must be of type Boolean.");

		this._preventDefault = (value === true);

		return this;
	};

	this.stopPropagation = function(value)
	{
		if (!arguments.length)
			return this._stopPropagation;

		if ((value != null) && !Class.isBoolean(value))
			throw new Error("Parameter stopPropagation must be of type Boolean.");

		this._stopPropagation = (value === true);

		return this;
	};

	this.stopImmediatePropagation = function(value)
	{
		if (!arguments.length)
			return this._stopImmediatePropagation;

		if ((value != null) && !Class.isBoolean(value))
			throw new Error("Parameter stopImmediatePropagation must be of type Boolean.");

		this._stopImmediatePropagation = (value === true);

		return this;
	};

	this.condition = function(value)
	{
		if (!arguments.length)
			return this._condition;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter condition must be of type Function.");

		this._condition = value || null;

		return this;
	};

	this.parameters = function(value)
	{
		if (!arguments.length)
			return (this._parameters && Class.isArray(this._parameters)) ? this._parameters.concat() : this._parameters;

		if (value != null)
		{
			if (Class.isArray(value))
				value = value.concat();
			else if (!Class.isFunction(value))
				throw new Error("Parameter parameters must be of type Array or Function.");
		}

		this._parameters = value || null;

		return this;
	};

	this.isAttached = function()
	{
		return (this._sourceEvent != null);
	};

	this.isOn = function()
	{
		return this._isOn;
	};

	// Public Methods

	this.attachTo = function(source, sourceEvent)
	{
		if (source == null)
			throw new Error("Parameter source must be non-null.");
		if (!source.isEventTarget)
			throw new Error("Parameter source must have mixin " + Class.getName(MEventTarget) + ".");

		if (sourceEvent == null)
			throw new Error("Parameter sourceEvent must be non-null.");

		if (!(sourceEvent instanceof Event))
		{
			if (!Class.isString(sourceEvent))
				throw new Error("Parameter sourceEvent must be of type String or " + Class.getName(Event) + ".");

			var sourceEventName = sourceEvent;
			sourceEvent = Event.resolve(source, sourceEventName, false);
			if (!sourceEvent)
				throw new Error("Unknown sourceEvent \"" + sourceEventName + "\".");
		}

		this.clear();

		this._source = source;
		this._sourceEvent = sourceEvent;

		this.on();

		return this;
	};

	this.clear = function()
	{
		if (!this._sourceEvent)
			return this;

		this.off();

		this._sourceEvent = null;
		this._source = null;

		return this;
	};

	this.on = function()
	{
		if (!this._sourceEvent || this._isOn)
			return this;

		this._isOn = true;
		this._source.on(this._sourceEvent, this._sourceEventHandler, this);

		return this;
	};

	this.off = function()
	{
		if (!this._isOn)
			return this;

		this._source.off(this._sourceEvent, this._sourceEventHandler, this);
		this._isOn = false;

		return this;
	};

	// Private Methods

	this._sourceEventHandler = function(eventData)
	{
		if (this._preventDefault)
			eventData.preventDefault();
		if (this._stopPropagation)
			eventData.stopPropagation();
		if (this._stopImmediatePropagation)
			eventData.stopImmediatePropagation();

		var targetPathResolved = this.targetPathResolved();
		var targetMethod = targetPathResolved[targetPathResolved.length - 1];
		if (!targetMethod)
			return;

		if (this._condition && !this._condition.call(this, eventData))
			return;

		if (!this._parameters)
		{
			targetMethod();
			return;
		}

		if (Class.isArray(this._parameters))
		{
			targetMethod.apply(null, this._parameters);
			return;
		}

		var params = this._parameters.call(this, eventData);
		if (params == null)
			throw new Error("Value returned from parameters must be non-null.");
		if (!Class.isArray(params))
			throw new Error("Value returned from parameters must be of type Array.");

		targetMethod.apply(null, params);
	};

});
