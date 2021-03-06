(function(global, $, undefined){

	'use strict';

	/**
	*  Responsible for handling the dynamic theme changing
	*  @class CEPExtension
	*  @constructor
	*  @param {String} stylesheet The selector for the style sheet
	*  @param {String} namespace The fullyqualified name of the app e.g., "com.cloudkid.App" 
	*/
	var CEPExtension = function(stylesheet, namespace)
	{
		/**
		*  The stylesheet element
		*  @property {DOM} stylesheet
		*  @private
		*/
		this.stylesheet = $(stylesheet)[0];

		/**
		*  The Adobe app interface 
		*  @property {CSInterface} csInterface
		*/
		this.csInterface = new CSInterface(); 

		/**
		*  If the extension is supported in the context
		*  @property {Boolean} supported
		*  @readOnly
		*/
		this.supported = (global.__adobe_cep__ !== undefined);

		// Check that we can run
		if (!this.supported)
		{
			throw "Extension must run as a CEP Extension inside Adobe applications";
			return;
		}

		/**
		*  The system path to the extension without trailing slash
		*  @property {String} extensionPath
		*  @readOnly
		*/
		this.extensionPath = this.csInterface.getSystemPath(SystemPath.EXTENSION);

		/**
		*  The current settings path
		*  @property {String} settingsPath
		*/
		this.settingsPath = this.csInterface.getSystemPath(SystemPath.USER_DATA) + "/" + namespace;

		// Make the directory if we don't have it
		global.cep.fs.makedir(this.settingsPath);

		/**
		*  The full path to the settings file
		*  @property {String} settingsFile
		*/
		this.settingsFile = this.settingsPath + "/settings.json";

		/**
		*  The current settings
		*  @property {Object|String|Number} settings
		*/
		this.settings = unserialize(global.cep.fs.readFile(this.settingsFile).data) || {};

		/**
		 * The name of the app we're running within (e.g., "PHSP" = Photoshop)
		 * @property {String} appName
		 */
		this.appName = this.csInterface.hostEnvironment.appName;
		
		/**
		*  Are we running in Flash? Flash has a different JS API, using JSFL instead of JSX
		*  @property {Boolean} isFlash
		*/
		this.isFlash = this.appName == "FLPR";

		var self = this;

		// Update the color of the panel when the theme color of the product changed.
		this.csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, function(){

			// Should get a latest HostEnvironment object from application.
			var skinInfo = JSON.parse(global.__adobe_cep__.getHostEnvironment()).appSkinInfo;

			// Gets the style information such as color info from the skinInfo, 
			// and redraw all UI controls of your extension according to the style info.
			self.update(skinInfo);
		});

		// Update the theme right now
		this.update(this.csInterface.hostEnvironment.appSkinInfo);
		
		// Initialize
		this.init();
	};

	// Reference to the prototype
	var p = CEPExtension.prototype = {};

	/**
	*  The name of the plugin
	*  @property {String} name
	*/
	p.name = null;

	/**
	 * Initialize the extension, this is implementation specific
	 * @method init
	 */
	p.init = function()
	{
		// Extend something here
	};
	
	/**
	*  Toggle the theme to something else
	*  @method update
	*  @private
	*  @param {Object} info The App Skin Info from the application interface
	*/
	p.update = function(info)
	{		
		// Get the background color
		var color = info.panelBackgroundColor.color;
		
		this.addRule(
			"body", 
			"color: " + reverseColor(color) + ";"
				+ "font-size:" + info.baseFontSize + "px;"
				+ "background-color:"+ colorToHex(color)
		);
	};

	/**
	*  Save a property that is accessible between settings
	*  @method setProp
	*  @param {String} name The name of the property to set
	*  @param {mixed} value The value of the property
	*/
	p.setProp = function(name, value)
	{
		this.settings[name] = value;
		global.cep.fs.writeFile(this.settingsFile, JSON.stringify(this.settings));
	};

	/**
	*  Get a saved setting
	*  @method loadSettings
	*  @return {mixed} The settings object, string or whatever was saved
	*/
	p.getProp = function(name)
	{
		return this.settings[name] || null;
	};

	/**
	*  Add a rule to the style sheet
	*  @method addRule
	*  @param {String} selector The CSS selector
	*  @param {String} rule The CSS rules
	*/
	p.addRule = function(selector, rule)
	{
		var sheet = this.stylesheet.sheet;

		if (sheet.addRule)
		{
			sheet.addRule(selector, rule);
		} 
		else if (sheet.insertRule)
		{
			sheet.insertRule(selector + ' { ' + rule + ' }', sheet.cssRules.length);
		}
	};

	/**
	*  Reverse a color
	*  @method reverseColor
	*  @private
	*  @param {int} color The color to reverse
	*  @param {Number} delta The amount to reverse by
	*  @return {String}  The hexidecimal color (e.g. "#ffffff")
	*/ 
	var reverseColor = function(color, delta)
	{
		return colorToHex(
			{
				"red" : Math.abs(255 - color.red), 
				"green" : Math.abs(255 - color.green), 
				"blue" : Math.abs(255 - color.blue)
			}, 
			delta
		);
	};

	/**
	*  Convert the Color object to string in hexadecimal format;
	*  @method colorToHex
	*  @private
	*  @param {Object} color The color to select
	*  @param {int} color.red The red color value
	*  @param {int} color.blue The blue color value
	*  @param {int} color.green The green color value
	*  @param {Number} delta The color shift
	*  @return {String} The hexidecimal number (e.g. "#ffffff")
	*/
	var colorToHex = function(color, delta)
	{
		return "#" + valueToHex(color.red, delta) 
		 	+ valueToHex(color.green, delta) 
		 	+ valueToHex(color.blue, delta);
	};

	/**
	*  Compute the value of a color to a hext value
	*  @method colorToHex
	*  @private
	*  @param {int} value A color value from 0 to 255
	*  @param {int} delta The amoutn to shift by
	*  @param {String} The single hex value
	*/
	var valueToHex = function(value, delta)
	{
		var computedValue = !isNaN(delta) ? value + delta : value;
		if (computedValue < 0) {
			computedValue = 0;
		} 
		else if (computedValue > 255)
		{
			computedValue = 255;
		}
		computedValue = Math.round(computedValue).toString(16);
		return computedValue.length == 1 ? "0" + computedValue : computedValue;
	};

	/**
	*  Execute a JSFL command
	*  @method execute
	*  @param {String} script The JSFL command to run or the path to the JSFL file
	*  @param {Object|Array|Function} [args] The optional arguments to pass to the script or the callback function
	*  @param {Function} [callback] Callback function if args is set to an object or array
	*/
	p.execute = function(script, args, callback)
	{
		// second argument can be callback for arguments
		if (typeof args == "function")
		{
			callback = args;
			args = undefined;
		}

		if (this.supported)
		{
			// Check for script paths
			if (/^([\/a-zA-Z0-9\-|_\.\%\?]+\.js(fl|x)?)$/.test(script))
			{
				var self = this;
				$.get(script, function(data)
					{
						self.execute(data, args, callback);
					}
				);
			}
			else
			{
				// Add the arguments to the global window
				if (args !== undefined)
				{
					script = "var args="+JSON.stringify(args)+";\n"+script;
				}

				var self = this;

				this.csInterface.evalScript(
					script, 
					function(response)
					{
						// No callback, so we'll ignore
						if (callback !== undefined)
						{
							// Bind the callback to this extension
							callback.call(self, unserialize(response));
						}						
					}
				);
			}
		}
		else
		{
			Debug.error("Unable to execute command");
		}
	};

	/**
	*  Unserialize a string from an external file
	*  @method unserialize
	*  @private
	*  @param {String} str The input string
	*  @return {String} The unserialized string
	*/
	var unserialize = function(str)
	{
		var result;

		// Check for undefined undefined
		if (str == "undefined")
		{
			result = undefined;
		}
		else
		{
			// Unserialize the response
			try
			{
				result = JSON.parse(str);
			}
			catch(e)
			{
				// Handle syntax error
				result = str;
			}
		}
		return result;
	};

	/**
	*  For debugging purposes
	*  @method toString
	*/
	p.toString = function()
	{
		return "[object CEPExtension(name='"+this.name+"')]";
	};

	// Assign to the parent window
	global.CEPExtension = CEPExtension;

}(window, jQuery));