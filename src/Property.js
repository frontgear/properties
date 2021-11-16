/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var Class = require("@frontgear/lang/Class");
var Map = require("@frontgear/lang/Map");
var ObjectUtil = require("@frontgear/lang/ObjectUtil");
var UID = require("@frontgear/lang/UID");
var WeakMap = require("@frontgear/lang/WeakMap");

module.exports = Class("@frontgear/properties/Property", Object, function(Property, base)
{

	// Private Static Constants

	var _DEBUG_KEY = "__DEBUG_PROPERTIES__";

	// Public Static Properties

	Property.debug = false;

	// Private Static Properties

	var _contextMaps = new WeakMap();

	// Public Static Methods

	Property.resolve = function(target, property, strict)
	{
		if (target == null)
			throw new Error("Parameter target must be non-null.");
		if (property == null)
			throw new Error("Parameter property must be non-null.");

		// resolve fast if property is already a Property instance
		if (property instanceof Property)
			return property;

		// otherwise, search by name
		var propertyName = property;
		if (!Class.isString(propertyName))
			throw new Error("Parameter property must be of type String or " + Class.getName(Property) + ".");

		// first look directly on target
		property = _resolveByName(target, propertyName);
		if ((property != null) && (property instanceof Property))
			return property;

		// then look directly on target class (if target is not already a class and checked above)
		var targetClass = target;
		if (!Class.isFunction(targetClass))
		{
			targetClass = target.constructor;

			// handle edge case where constructor doesn't exist
			if ((targetClass == null) || !Class.isFunction(targetClass))
			{
				// throw error if not found in strict mode
				if (strict !== false)
					throw new Error("Unknown property \"" + propertyName + "\".");

				return null;
			}

			property = _resolveByName(targetClass, propertyName);
			if ((property != null) && (property instanceof Property))
				return property;
		}

		// otherwise, search for class members up the inheritance chain
		var baseClass = Class.getBaseClass(targetClass);
		while (baseClass)
		{
			property = _resolveByName(baseClass, propertyName);
			if ((property != null) && (property instanceof Property))
			{
				// copy property to target class if no conflict for quicker access next time
				var rootName = propertyName.split(".")[0];
				if (!ObjectUtil.has(targetClass, rootName))
					targetClass[rootName] = baseClass[rootName];

				return property;
			}

			baseClass = Class.getBaseClass(baseClass);
		}

		// throw error if not found in strict mode
		if (strict !== false)
			throw new Error("Unknown property \"" + propertyName + "\".");

		return null;
	};

	// Private Static Methods

	var _resolveByName = function(target, propertyName)
	{
		if (propertyName.indexOf(".") < 0)
			return target[propertyName];

		var propertyPath = propertyName.split(".");
		for (var i = 0, l = propertyPath.length; i < l; i++)
		{
			target = target[propertyPath[i]];
			if (target == null)
				return null;
		}

		return target;
	};

	var _debug = function(context)
	{
		var target = context.target;
		var debugMap = ObjectUtil.get(target, _DEBUG_KEY);
		if (!debugMap)
			debugMap = target[_DEBUG_KEY] = {};

		var property = context.property;
		var debugPropertyKey = property.name() + " #" + UID.get(property);
		debugMap[debugPropertyKey] = context.value;
	};

	// Private Properties

	this._name = null;
	this._type = null;
	this._typeChecker = null;
	this._nullValue = null;
	this._defaultValue = null;
	this._readOnly = false;
	this._internalReadKey = null;
	this._internalWriteKey = null;
	this._getter = null;
	this._setter = null;
	this._readFilter = null;
	this._writeFilter = null;
	this._onRead = null;
	this._onWrite = null;

	// Constructor

	this.constructor = function(name, type, defaultValue)
	{
		if (!(this instanceof Property))
			return new Property(name, type, defaultValue);

		if (name == null)
			throw new Error("Parameter name must be non-null.");
		if (!Class.isString(name))
			throw new Error("Parameter name must be of type String.");
		if ((type != null) && !Class.isFunction(type))
			throw new Error("Parameter type must be of type Function.");

		this._name = name;
		this._type = type || null;
		this._typeChecker = type ? Class.getTypeChecker(type) : null;

		if (type === Number)
			this._nullValue = NaN;
		else if (type === Boolean)
			this._nullValue = false;
		else if (type === String)
			this._nullValue = "";
		else
			this._nullValue = null;

		if (defaultValue == null)
			defaultValue = this._nullValue;

		if (!this.isValidType(defaultValue))
			throw new Error("Parameter defaultValue must be of type " + this.getTypeName() + ".");

		this._defaultValue = defaultValue;
	};

	// Public Accessor Methods

	this.name = function()
	{
		return this._name;
	};

	this.type = function()
	{
		return this._type;
	};

	this.defaultValue = function()
	{
		return this._defaultValue;
	};

	this.readOnly = function(value)
	{
		if (!arguments.length)
			return this._readOnly;

		this._readOnly = !!value;  // truthy/falsy values converted to true/false

		if (value && (value !== true))
			this.allowInternalWrite(value);
		else if (!value)
			this.allowInternalWrite(false);

		return this;
	};

	this.allowInternalAccess = function(value)
	{
		if (!arguments.length)
			return (this.allowInternalRead() && this.allowInternalWrite());

		this.allowInternalRead(value);
		this.allowInternalWrite(value);

		return this;
	};

	this.allowInternalRead = function(value)
	{
		if (!arguments.length)
			return (this._internalReadKey != null);

		this._internalReadKey = value || null;  // falsy values converted to null

		return this;
	};

	this.allowInternalWrite = function(value)
	{
		if (!arguments.length)
			return (this._internalWriteKey != null);

		this._internalWriteKey = value || null;  // falsy values converted to null

		return this;
	};

	this.getter = function(value)
	{
		if (!arguments.length)
			return this._getter;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter getter must be of type Function.");

		this._getter = value || null;

		return this;
	};

	this.setter = function(value)
	{
		if (!arguments.length)
			return this._setter;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter setter must be of type Function.");

		this._setter = value || null;

		return this;
	};

	this.readFilter = function(value)
	{
		if (!arguments.length)
			return this._readFilter;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter readFilter must be of type Function.");

		this._readFilter = value || null;

		return this;
	};

	this.writeFilter = function(value)
	{
		if (!arguments.length)
			return this._writeFilter;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter writeFilter must be of type Function.");

		this._writeFilter = value || null;

		return this;
	};

	this.onRead = function(value)
	{
		if (!arguments.length)
			return this._onRead;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter onRead must be of type Function.");

		this._onRead = value || null;

		return this;
	};

	this.onWrite = function(value)
	{
		if (!arguments.length)
			return this._onWrite;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter onWrite must be of type Function.");

		this._onWrite = value || null;

		return this;
	};

	// Public Methods

	this.get = function(target)
	{
		if (this._onRead)
			this._onRead.call(target);

		var value = this.getInternal(target);

		if (this._readFilter)
		{
			var filterValue = this._readFilter.call(target, value);
			if (filterValue !== value)
			{
				if (!this.isValidType(filterValue))
					throw new Error("Value returned from readFilter for property \"" + this.name() + "\" must be of type " + this.getTypeName() + ".");

				value = filterValue;
			}
		}

		if (value == null)
			value = this._nullValue;

		return value;
	};

	this.set = function(target, value)
	{
		if (value == null)
			value = this._nullValue;

		if (this._writeFilter)
		{
			var filterValue = this._writeFilter.call(target, value);
			if (filterValue !== value)
			{
				if (!this.isValidType(filterValue))
					throw new Error("Value returned from writeFilter for property \"" + this.name() + "\" must be of type " + this.getTypeName() + ".");

				value = filterValue;
			}
		}

		if (!this.setInternal(target, value))
			return;

		if (this._onWrite)
			this._onWrite.call(target);
	};

	this.getInternal = function(target)
	{
		if (this._getter)
		{
			var value = this._getter.call(target);
			if (!this.isValidType(value))
				throw new Error("Value returned from getter for property \"" + this.name() + "\" must be of type " + this.getTypeName() + ".");

			return value;
		}

		var context = this.getContext(target, false);
		if (context)
			return this.readValue(context);

		return this._defaultValue;
	};

	this.setInternal = function(target, value)
	{
		if (this._getter)
		{
			if (this._setter)
				this._setter.call(target, value);

			return true;
		}

		var context = this.getContext(target);
		if (context.isWriting)
			return false;

		try
		{
			context.isWriting = true;

			if (this.needsWrite(context, value))
			{
				if (this._setter)
					this._setter.call(target, value);

				this.writeValue(context, value);
			}
		}
		finally
		{
			context.isWriting = false;
		}

		return true;
	};

	this.canReadInternal = function(internalReadKey)
	{
		return ((this._internalReadKey != null) && (this._internalReadKey === internalReadKey));
	};

	this.canWriteInternal = function(internalWriteKey)
	{
		return ((this._internalWriteKey != null) && (this._internalWriteKey === internalWriteKey));
	};

	this.getTypeName = function()
	{
		return this._type ? (Class.getName(this._type) || (this._name + ".type")) : "*";
	};

	this.isValidType = function(value)
	{
		return ((value == null) || !this._typeChecker || this._typeChecker(value));
	};

	// Protected Methods

	this.getContext = function(target, create)
	{
		var contextMap = _contextMaps.get(target);
		if (!contextMap)
		{
			if (create === false)
				return null;

			contextMap = new Map();
			_contextMaps.set(target, contextMap);
		}

		var context = contextMap.get(this);
		if (!context)
		{
			if (create === false)
				return null;

			context = { target: target, property: this };
			contextMap.set(this, context);

			this.setupContext(context);
		}

		return context;
	};

	this.delContext = function(target)
	{
		var contextMap = _contextMaps.get(target);
		if (!contextMap)
			return;

		var context = contextMap.get(this);
		if (!context)
			return;

		contextMap.del(this);
		if (contextMap.size() === 0)
			_contextMaps.del(target);

		this.teardownContext(context);
	};

	this.setupContext = function(context)
	{
		context.value = this._defaultValue;
		context.isWriting = false;
	};

	this.teardownContext = function(context)
	{
		context.value = null;
	};

	this.readValue = function(context)
	{
		return context.value;
	};

	this.writeValue = function(context, value)
	{
		context.value = value;

		if (Property.debug)
			_debug(context);
	};

	this.needsWrite = function(context, value)
	{
		return true;
	};

});
