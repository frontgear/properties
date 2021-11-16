/*!
 * Copyright (c) @crzyj
 *
 * Released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

var Class = require("@frontgear/lang/Class");
var Property = require("./Property");

module.exports = Class("@frontgear/properties/MPropertyTarget", function(MPropertyTarget)
{

	// Public Properties

	this.isPropertyTarget = true;

	// Public Methods

	this.get = function(property, internalReadKey)
	{
		property = Property.resolve(this, property);

		if ((internalReadKey != null) && !property.canReadInternal(internalReadKey))
			throw new Error("Cannot get internal value of property \"" + property.name() + "\" using given access key.");

		if (internalReadKey != null)
			return property.getInternal(this);
		else
			return property.get(this);
	};

	this.set = function(property, value, internalWriteKey)
	{
		property = Property.resolve(this, property);

		if ((internalWriteKey == null) && property.readOnly())
			throw new Error("Property \"" + property.name() + "\" is read-only.");
		if ((internalWriteKey != null) && !property.canWriteInternal(internalWriteKey))
			throw new Error("Cannot set internal value of property \"" + property.name() + "\" using given access key.");
		if (!property.isValidType(value))
			throw new Error("Value assigned to property \"" + property.name() + "\" must be of type " + property.getTypeName() + ".");

		if (internalWriteKey != null)
			property.setInternal(this, value);
		else
			property.set(this, value);

		return this;
	};

});
