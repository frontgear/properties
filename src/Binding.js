/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var MEventTarget = require("@frontgear/events/MEventTarget");
var MListenerTarget = require("@frontgear/events/MListenerTarget");
var Class = require("@frontgear/lang/Class");
var TrieSet = require("@frontgear/lang/TrieSet");
var MObservableProperty = require("./MObservableProperty");
var MPropertyTarget = require("./MPropertyTarget");
var Property = require("./Property");

module.exports = Class("@frontgear/properties/Binding", Object, function(Binding, base)
{

	// Public Static Constants

	Binding.VOID = new String("void");
	Binding.DEFAULT = new String("default");

	// Private Static Properties

	var _slice = Array.prototype.slice;

	// Private Properties

	this._source = null;
	this._sourcePath = null;
	this._sourceRoot = null;
	this._target = null;
	this._targetProperty = null;
	this._twoWay = false;
	this._converter = null;
	this._reverseConverter = null;
	this._bindingChain = null;

	// Constructor

	this.constructor = function(source, sourcePath)
	{
		if (source == null)
			throw new Error("Parameter source must be non-null.");
		if (!source.isPropertyTarget)
			throw new Error("Parameter source must have mixin " + Class.getName(MPropertyTarget) + ".");

		if (sourcePath == null)
			throw new Error("Parameter sourcePath must be non-null.");

		sourcePath = Class.isArray(sourcePath) ? sourcePath.concat() : _slice.call(arguments, 1);
		if (sourcePath.length === 0)
			throw new Error("Parameter sourcePath must be non-empty.");

		var sourceProperty;
		for (var i = 0, l = sourcePath.length; i < l; i++)
		{
			sourceProperty = sourcePath[i];
			if (sourceProperty == null)
				throw new Error("Parameter sourcePath must not contain null.");
			if (!(sourceProperty instanceof Property) && !Class.isString(sourceProperty))
				throw new Error("Parameter sourcePath must be of type String, " + Class.getName(Property) + ", or Array<String|" + Class.getName(Property) + ">.");
		}

		sourceProperty = Property.resolve(source, sourcePath[0], false);
		if (!sourceProperty)
			throw new Error("Unknown sourceProperty \"" + sourcePath[0] + "\".");

		this._source = source;
		this._sourcePath = sourcePath;
		this._sourceRoot = sourceProperty;
	};

	// Public Accessor Methods

	this.source = function()
	{
		return this._source;
	};

	this.sourcePath = function()
	{
		return this._sourcePath.concat();
	};

	this.sourcePathResolved = function()
	{
		var path = [];

		if (this._bindingChain)
			this._bindingChain.getPath(path);

		for (var i = path.length, l = this._sourcePath.length; i < l; i++)
			path.push(null);

		return path;
	};

	this.target = function()
	{
		return this._target;
	};

	this.targetProperty = function()
	{
		return this._targetProperty;
	};

	this.twoWay = function(value)
	{
		if (!arguments.length)
			return this._twoWay;

		if ((value != null) && !Class.isBoolean(value))
			throw new Error("Parameter twoWay must be of type Boolean.");

		value = (value === true);
		if (value === this._twoWay)
			return this;

		if (value && this.isAssigned())
		{
			if (!this._target.isEventTarget)
				throw new Error("Binding target must have mixin " + Class.getName(MEventTarget) + " for two-way binding.");
			if (!this._targetProperty.isObservableProperty)
				throw new Error("Binding targetProperty must have mixin " + Class.getName(MObservableProperty) + " for two-way binding.");
		}

		var wasBound = this.isBound();
		if (wasBound)
			this.unbind();

		this._twoWay = value;

		if (wasBound)
			this.bind();

		return this;
	};

	this.converter = function(value)
	{
		if (!arguments.length)
			return this._converter;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter converter must be of type Function.");

		value = value || null;
		if (value === this._converter)
			return this;

		this._converter = value;

		if (this._bindingChain)
			this._bindingChain.sync();

		return this;
	};

	this.reverseConverter = function(value)
	{
		if (!arguments.length)
			return this._reverseConverter;

		if ((value != null) && !Class.isFunction(value))
			throw new Error("Parameter reverseConverter must be of type Function.");

		value = value || null;
		if (value === this._reverseConverter)
			return this;

		this._reverseConverter = value;

		return this;
	};

	this.isAssigned = function()
	{
		return (this._targetProperty != null);
	};

	this.isBound = function()
	{
		return (this._bindingChain != null);
	};

	// Public Methods

	this.assignTo = function(target, targetProperty)
	{
		if (target == null)
			throw new Error("Parameter target must be non-null.");
		if (!target.isPropertyTarget)
			throw new Error("Parameter target must have mixin " + Class.getName(MPropertyTarget) + ".");
		if (!target.isListenerTarget)
			throw new Error("Parameter target must have mixin " + Class.getName(MListenerTarget) + ".");
		if (this._twoWay && !target.isEventTarget)
			throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + " for two-way binding.");

		if (targetProperty == null)
			throw new Error("Parameter targetProperty must be non-null.");

		if (!(targetProperty instanceof Property))
		{
			if (!Class.isString(targetProperty))
				throw new Error("Parameter targetProperty must be of type String or " + Class.getName(Property) + ".");

			var targetPropertyName = targetProperty;
			targetProperty = Property.resolve(target, targetPropertyName, false);
			if (!targetProperty)
				throw new Error("Unknown targetProperty \"" + targetPropertyName + "\".");
		}

		if (targetProperty.readOnly())
			throw new Error("Parameter targetProperty must NOT be read-only.");
		if (this._twoWay && !targetProperty.isObservableProperty)
			throw new Error("Parameter targetProperty must have mixin " + Class.getName(MObservableProperty) + " for two-way binding.");

		if ((target === this._source) && (targetProperty === this._sourceRoot))
			throw new Error("Cannot bind a property to itself.");

		this.clear();

		this._target = target;
		this._targetProperty = targetProperty;

		this.bind();

		return this;
	};

	this.clear = function()
	{
		if (!this._targetProperty)
			return this;

		this.unbind();

		this._targetProperty = null;
		this._target = null;

		return this;
	};

	this.bind = function()
	{
		if (!this._targetProperty || this._bindingChain)
			return this;

		this._bindingChain = new BindingChain(this, this._source, this._sourceRoot, this._sourcePath.slice(1));
		this._bindingChain.bind();

		return this;
	};

	this.unbind = function()
	{
		if (!this._bindingChain)
			return this;

		this._bindingChain.unbind();
		this._bindingChain = null;

		return this;
	};

	// Private Nested Classes

	var BindingChain = Class(Object, function(BindingChain, base)
	{

		// Private Static Properties

		var _syncingSet = new TrieSet();

		// Private Static Methods

		var _sync = function(target, targetProperty, source, sourceProperty, converter, scope)
		{
			var targetKeys = [ targetProperty, target ];
			if (_syncingSet.has(targetKeys))
				return;

			var sourceKeys = [ sourceProperty, source ];
			var wasSourceSyncing = _syncingSet.has(sourceKeys);

			try
			{
				if (!wasSourceSyncing)
					_syncingSet.add(sourceKeys);
				_syncingSet.add(targetKeys);

				var value = source.get(sourceProperty);
				if (converter)
				{
					value = converter.call(scope, value);
					if (value === Binding.VOID)
						return;

					if (value === Binding.DEFAULT)
						value = targetProperty.defaultValue();
				}

				target.set(targetProperty, value);
			}
			finally
			{
				_syncingSet.del(targetKeys);
				if (!wasSourceSyncing)
					_syncingSet.del(sourceKeys);
			}
		};

		var _syncDefault = function(target, targetProperty, converter, scope)
		{
			var targetKeys = [ targetProperty, target ];
			if (_syncingSet.has(targetKeys))
				return;

			try
			{
				_syncingSet.add(targetKeys);

				var value = Binding.DEFAULT;
				if (converter)
				{
					value = converter.call(scope, void(0));
					if (value === Binding.VOID)
						return;
				}

				if (value === Binding.DEFAULT)
					value = targetProperty.defaultValue();

				target.set(targetProperty, value);
			}
			finally
			{
				_syncingSet.del(targetKeys);
			}
		};

		// Private Properties

		this._binding = null;
		this._source = null;
		this._sourceProperty = null;
		this._subPath = null;
		this._subChain = null;
		this._concurrentCount = 0;
		this._isObservable = false;
		this._isTwoWay = false;

		// Constructor

		this.constructor = function(binding, source, sourceProperty, subPath)
		{
			this._binding = binding;
			this._source = source;
			this._sourceProperty = sourceProperty;
			this._subPath = (subPath && (subPath.length > 0)) ? subPath : null;
			this._isObservable = !!(source.isEventTarget && sourceProperty.isObservableProperty);
			this._isTwoWay = binding._twoWay && !this._subPath && !sourceProperty.readOnly();
		};

		// Public Methods

		this.bind = function()
		{
			var binding = this._binding;
			if (this._isObservable)
				binding._target.listenOn(this._source, this._sourceProperty.changed, this._sourcePropertyChanged, this);

			if (this._isTwoWay)
				binding._target.on(binding._targetProperty.changed, this._targetPropertyChanged, this);

			this._syncTarget();
		};

		this.unbind = function()
		{
			this._concurrentCount++;

			if (this._subChain)
			{
				this._subChain.unbind();
				this._subChain = null;
			}

			var binding = this._binding;
			if (this._isTwoWay)
				binding._target.off(binding._targetProperty.changed, this._targetPropertyChanged, this);

			if (this._isObservable)
				binding._target.listenOff(this._source, this._sourceProperty.changed, this._sourcePropertyChanged, this);
		};

		this.sync = function()
		{
			var binding = this._binding;
			if (this._subChain)
				this._subChain.sync();
			else if (!this._subPath)
				_sync(binding._target, binding._targetProperty, this._source, this._sourceProperty, binding._converter, binding);
			else
				_syncDefault(binding._target, binding._targetProperty, binding._converter, binding);
		};

		this.getPath = function(outPath)
		{
			outPath.push(this._sourceProperty);
			if (this._subChain)
				this._subChain.getPath(outPath);
		};

		// Private Methods

		this._syncTarget = function()
		{
			var binding = this._binding;
			if (!this._subPath)
			{
				_sync(binding._target, binding._targetProperty, this._source, this._sourceProperty, binding._converter, binding);
				return;
			}

			var concurrentCount = (++this._concurrentCount);

			if (this._subChain)
			{
				this._subChain.unbind();
				this._subChain = null;
			}

			var subSource = this._source.get(this._sourceProperty);
			if (this._concurrentCount !== concurrentCount)
				return;

			var subProperty = ((subSource != null) && subSource.isPropertyTarget) ? Property.resolve(subSource, this._subPath[0], false) : null;
			if (!subProperty || ((subSource === binding._target) && (subProperty === binding._targetProperty)))
			{
				_syncDefault(binding._target, binding._targetProperty, binding._converter, binding);
				return;
			}

			this._subChain = new BindingChain(binding, subSource, subProperty, this._subPath.slice(1));
			this._subChain.bind();
		};

		this._syncSource = function()
		{
			var binding = this._binding;
			_sync(this._source, this._sourceProperty, binding._target, binding._targetProperty, binding._reverseConverter, binding);
		};

		this._sourcePropertyChanged = function(e)
		{
			if ((e.target !== this._source) || (e.event !== this._sourceProperty.changed))
				return;

			this._syncTarget();
		};

		this._targetPropertyChanged = function(e)
		{
			var binding = this._binding;
			if ((e.target !== binding._target) || (e.event !== binding._targetProperty.changed))
				return;

			this._syncSource();
		};

	});

});
