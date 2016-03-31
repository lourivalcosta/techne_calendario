/****
* Inmediate Function scopes the Application to prevent variable pollution 
* @param: {Object} global , Reference of the global object
* @param: {Obejct} FWK , Custom framework
*/
;(function (global, FWK, Node) {
  'use strict';

	// Definindo constantes globais
	FWK.const('INTERVALO_MINUTOS'	, 720); // Range minutes from 0 to 720 
	FWK.const('HORA_INICIO'		, {hour : 9, minutes : 0, period : "AM"}); // Inicio do tempo
	FWK.const('GRID_HEIGHT'		, 720); // Grid height that match with the Rage of minutes
	FWK.const('GRID_WIDTH'		, 600);	// Grid width
	FWK.const('NUMERO_MAXIMO_EVENTOS'	, 100);	// Maximo  de eventos na chamada 
	
	// Calendar View Module
	var CalendarView = function () {
		var 
			TIME_UNITS			= [],
			TIME_GRID_RENDERED	= false,
			// DOM ELEMENTS
			TIME_GRID           = FWK.$("#time-grid"),
            EVENTS_GRID         = FWK.$("#events-grid"),
            // TEMPLATES
            EVENTS_GRID_TMPL    = FWK.$("#events_grid_tmpl").innerHTML,
            TIME_GRID_TMPL      = FWK.$("#time_grid_tmpl").innerHTML,
            // Collection of Event items
            EVENTS = {};

		return {

			/**
			* @method: build
			* @description: This method builds the UI 
			*/
			build: function () {
				var end_time = FWK.const('INTERVALO_MINUTOS'),
                    start_time = FWK.const('HORA_INICIO'),
                    i;

                for (i = 0; i <= end_time; i+=30) {
                    TIME_UNITS.push(FWK.minutesTo12Hours(i, start_time));
                }    
                this.render();
			},

			/**
			* @method : render 
			* @description :  This method renders templates and appends to the defined container
			*/
			render : function () {
				var temporalContainer = document.createElement("div"),
					node,
					eventElement,
					elements = [], length, i,
					events_grid_parent = EVENTS_GRID.parentNode; 

                // Render time grid if is not defined
                if (!TIME_GRID_RENDERED) {
                    TIME_GRID.innerHTML = FWK.tmpl(TIME_GRID_TMPL, { hours: TIME_UNITS });
                    TIME_GRID_RENDERED = true;
                }
                // Clears the container contents 
                EVENTS_GRID.innerHTML = "";

                // Traverses the EVENTS collection and sets the CSS position
                if (EVENTS) {
                	for (var id in EVENTS) {
                		node = EVENTS[id];
                		temporalContainer.innerHTML = FWK.tmpl(EVENTS_GRID_TMPL, {id: node.item.id});
                		eventElement = FWK.$("#" + node.item.id, temporalContainer);
                		temporalContainer.removeChild(eventElement);
                		this.setElementPosition(eventElement , {
                			start: node.attribute("start"),
                			end: node.attribute("end"),
                			width: node.attribute("width"),
                			left: node.attribute("left")
                		});
                		elements.push(eventElement);
                	}
                }

                length = elements.length;
                // Removes the container from its Parent DOM Element 
                EVENTS_GRID.parentNode.removeChild(EVENTS_GRID);
                // Appends each Event DOM element
                for (i = 0; i < length;i++) {
                    EVENTS_GRID.appendChild(elements[i]);
                }
                events_grid_parent.appendChild(EVENTS_GRID);
			},

			setElementPosition : function (element, obj) {
                var top 			= obj.start,
                    height 			= obj.end - top,
                    width 			= obj.width || FWK.const('GRID_WIDTH'),
                    element_style 	= element.style;

                //Setting styles
                element_style.top = top + "px";
                element_style.height = height + "px";
                element_style.width = width + "px";
                element_style.marginLeft = obj.left + "px";
            },
            // Sets the events 
			setEvents: function (nodes) {
				EVENTS = nodes;
			}
		};
	};

	// Calendar App Mudule
	var CalendarApp = function () {
		var _pub 			= {},					// Public object to return
			VIEW 			= CalendarView(),		// View for rendering the events
			EVENTS 			= [],					// Events Array
			EVENTS_COUNTER  = 0,					// Events counter 	
			ROOT;									// ROOT Node container

		/**
		* @method: _pub.init
		* @description: this method launchs the calendar app
		*/
		_pub.init = function () {
			// Build Calendar Interface
			VIEW.build();
		};

		/**
		* @method: _pub.layOutDay accesable from global object as layOutDay
		* @param: {Array} events , Array of events with this structure {start: {Integer}, end: {Integer}}
		* @description: this method would be part of the global object, 
		* it can be invoked for adding new event.
		*/
		_pub.layOutDay = function (events) {
			var length = events.length,
				i, event , 
				failed = true;
			// Traverse array of events
			for (i = 0; i < length; i++) {
				event = events[i];
				// validate time range
				if (event.start < FWK.const('INTERVALO_MINUTOS') && 
					event.end 	<= FWK.const('INTERVALO_MINUTOS') &&
					event.end 	> 0 &&
					event.start >= 0 &&
 					event.start < event.end) {

					if (EVENTS_COUNTER <= FWK.const('NUMERO_MAXIMO_EVENTOS')) {
						// Generating an ID	
						event.id = "event-" + EVENTS_COUNTER;
						// Setting Default Properties
						event.collided = false;
						// Adding item to the EVENTS Array
						EVENTS.push(event);
						// Total Events counters
						EVENTS_COUNTER ++;

						failed = false;
					} else {
						FWK.debug("Maximum 100");
					}
				}	
			}
			// Just in case no event was added
			if (failed) return;

			// Detect which Events Collide with the ROOT_EVENTS
			_pub.findCollidingEvents();

			// Arrange Events Node Size and Position
			var nodes = _pub.arrangeNodes();

			// Set Events data
			VIEW.setEvents(nodes);

			// Render View 
			VIEW.render();
		};

		/**
		* @method: _pub.findCollidingEvents
		* @description: 
		*/
		_pub.findCollidingEvents = function () {

			var length 		 = EVENTS.length, 
				event,
				collides 	 = false, 	// Flag to determine if doesn't collide with no event
				notRootChild = [];		// Array for storing temporally the Nodes that collide!
				ROOT = ROOT || Node();	// If root Node doesn't exist creates new one

			// Traverse the added Events Array
				// Has dynamic length did not cached it
			while (EVENTS.length > 0) {

				collides = false;
				event = EVENTS.shift(); //Do not remove this or will loop infinetlly
				event.collideCounter = 0;
				if (ROOT.hasNodes()) {
					ROOT.iterateH(function (node, index, level, parent, stop, topNode) {
						node.clearAttributes();
						if (event.id != node.item.id) {
							if (_pub.collides(node.item, event)) {
								event.collideCounter++;
								Node(event, node);
								collides = true;
								notRootChild.push(event);
							}
						} else return true;

					});

					if (!collides) {
						Node(event, ROOT);
						if (notRootChild.length > 0) {
							for (var x = 0; x < notRootChild.length; x++) {
								EVENTS.push(notRootChild[x]);
							}
						}
					} else {

					}

				} else {
					Node(event, ROOT);
				}
			}
		};

		/**
		* @method: _pub.arrangeNodes .
		* @description: Organizes the size and position from each Node
		*/
		_pub.arrangeNodes = function () {
		
			if (ROOT.hasNodes()) {
				var countNodes = 0,
					nodes 	= {};
				// Debug
				/*ROOT.iterate(function (node, index, level, parent) {
					console.log(new Array(level).join("|_"), node.item.id);
				});*/
				ROOT.iterate(function (node, index, level, parent) {
					// Add each one to the stack 
					if (!nodes[node.item.id]) {
						if (node.level > 1) 
						if (nodes[parent.item.id] && !parent.hasAttribute("width")) {
							return;
						}

						 // Determine width
						if (node.nodes.length > 0) {
							if (!parent.attribute("width")) {
								node.attribute("width", (FWK.const('GRID_WIDTH')/(node.nodes.length + 1)));
								var nextNode = node.nodes[0];
								if (nextNode) {
									nextNode = nodes[nextNode.item.id];
									if (nextNode)
									if (nextNode.hasAttribute("width")) {
										node.attribute("width", nextNode.attribute("width"));
									}
								}
							} else {
								node.attribute("width", parent.attribute("width"));
							}
						} else {
							if (parent.hasAttribute("width")) {
								node.attribute("width", parent.attribute("width"));
							} else {
								node.attribute("width", FWK.const('GRID_WIDTH'));
							}
						}
						// Start position 
						if (parent.hasAttribute("left")) {
							node.attribute("left", (parent.attribute("width") + parent.attribute("left")));
						} else {
							node.attribute("left", 0);
						}

						node.attribute("start", node.item.start);
						node.attribute("end", node.item.end);

						var difference = (FWK.const('GRID_WIDTH')-node.attribute("left"));
						if (difference > 0) {
							nodes[node.item.id] = node;
							//
						} else node.clearAttributes();
					}
				}); 
				return nodes;
			}	
			return false;
		};

		/**
		* @method: _pub.collides
		* @description: Determines if the events ranges collide 
		* @param: {Object} eventA
		* @param: {Object} eventB
		*/
		_pub.collides = function (event_a, event_b) {
			var start_a = event_a.start,
				end_a 	= event_a.end,
				start_b = event_b.start, 
				end_b 	= event_b.end;

			if (start_a == start_b && end_a == end_b) {
				return true;
			} 

            if (start_a <= end_b && start_b <= end_a) {
                return true;
            }
            return false;
        };

		return _pub;
	};


	/************************************************
	* RUNS HERE * RUNS HERE * RUNS HERE * RUNS HERE *
	*************************************************/
	// Checking if the global method layOutDay exists
	if (!("layOutDay" in global)) {
		var calendar = CalendarApp();
		// Attaching the layOutDay as global method
        global["layOutDay"] = calendar.layOutDay;
        // Starting the CalendarApp upon the DOM is ready
		FWK.ready(function () {
			// Initializing the CalendarApp
			calendar.init(); 
			// Adding Events 
			// Starts with this Events loaded 
			global.layOutDay([ 
                {start: 30, end: 150}, 
                {start: 540, end: 600}, 
                {start: 560, end: 620}, 
                {start: 610, end: 670} 
            ]);
		});
	}

}(this, 

	/**
	* CUSTOM FRAMEWORK
	* This framework comes just with a few functions
	*/
	(function () {
		var CONSTANTS = {};
		return {

			/**
			* constant is a function to define constant variables or getting its value
			* * set mode
			* @param {String}
			* @param {Mixed}  
			* * get mode
			* @param {String} arguments[0]
			*/
			const : function () {
				var value = arguments[1],
					key	  = arguments[0];

				if (typeof value === 'undefined') {
					return CONSTANTS[key];
				} else {
					if (!(key in CONSTANTS)) {
						CONSTANTS[key] = value;
						return true;
					} 
				}
				return false;
			},

			/**
			* $ is just a shortcut for querySelector a built-in method 
			* @param {String} selector
			* @param {Object} el
			*/
			$ : function (selector, el) {
                if (!el) {
                	el = document;
               	}
                return el.querySelector(selector);
            },

            /** 
            * ready is a function that callsback a function when the DOM is ready
            * @param {Function} fn
			*/
			ready : function (fn) {

				var done = false, top = true, win = window,

				doc = win.document, root = doc.documentElement,

				add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
				rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
				pre = doc.addEventListener ? '' : 'on',

				init = function(e) {
					if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
					(e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
					if (!done && (done = true)) fn.call(win, e.type || e);
				},

				poll = function() {
					try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
					init('poll');
				};

				if (doc.readyState == 'complete') fn.call(win, 'lazy');
				else {
					if (doc.createEventObject && root.doScroll) {
						try { top = !win.frameElement; } catch(e) { }
						if (top) poll();
					}
					doc[add](pre + 'DOMContentLoaded', init, false);
					doc[add](pre + 'readystatechange', init, false);
					win[add](pre + 'load', init, false);
				}
			},

			//Proxying the console.log in case of disabling all debugs
			debug : function () {
				var disable = false;
				try {
					if (!disable) {
						console.log.apply(console, arguments);
					}
				} catch(e) {}
			},

			minutesTo12Hours : function (minutes, start_time) {    
                var initial_hour = start_time.hour,
                    initial_minutes = start_time.minutes,
                    initial_perdiod = start_time.perdiod; //Default

                //Minutes to hours
                var hours_left   = 0,
                    minutes_left = 0,
                    format = {},
                    period = "AM";

                hours_left = Math.floor(minutes / 60)                    
                minutes_left = minutes - (hours_left * 60);
                hours_left += initial_hour;

                if (hours_left > 12) {
                    hours_left = hours_left - 12
                    period = "PM";
                }

                //format hours
                format.hours = hours_left;
               

                //format minutes
                if (minutes_left < 10) {
                    format.minutes = "0" + minutes_left;
                } else {
                    format.minutes = minutes_left;
                }
                format.period = period;
                return format;
            },

             /**
             * @param {Object} str
             * @param {Object} data
             */
            tmpl : function (str, data) {
                // Figure out if we're getting a template, or if we need to
                // load the template - and be sure to cache the result.
                var fn = !/\W/.test(str) ?
                  cache[str] = cache[str] ||
                    tmpl(document.getElementById(str).innerHTML) :
                 
                  // Generate a reusable function that will serve as a template
                  // generator (and which will be cached).
                 new Function("obj",
                "var p=[],print=function(){p.push.apply(p,arguments);};" +
                   
                    // Introduce the data as local variables using with(){}
                "with(obj){p.push('" +
                   
                    // Convert the template into pure JavaScript
                str
                  .replace(/[\r\t\n]/g, " ")
                  .split("<%").join("\t")
                  .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                  .replace(/\t=(.*?)%>/g, "',$1,'")
                  .split("\t").join("');")
                  .split("%>").join("p.push('")
                  .split("\r").join("\\'")
                  + "');}return p.join('');");
                   
                    // Provide some basic currying to the user
                    return data ? fn( data ) : fn;
            } 
		};
	}())
,(function () {
	/***
	* Node contstructor for parent-child mapping 
	*/
	function Node (object, parent) {
		if (!(this instanceof Node)) {
	 		return new Node(object, parent);
		} 
		if (!object&&!parent) this.root= true;
		this.item = object;
		this.nodes = []; 
		this.parent = parent || null;
		this.level = 0;
		this.attributes = {};
		this.lastIndex = 0; 
		this.topNode = null;

		if (this.parent) {
			parent.add.apply(parent,[this]);
		}
	};

	Node.prototype.attribute = function () {
		var value = arguments[1],
			key	  = arguments[0];

		if (typeof value === 'undefined') {
			return this.attributes[key];
		} else {
			this.attributes[key] = value;
			return true;
		}
		return false;
	};

	Node.prototype.clearAttributes = function () {
		this.attributes = {};
	};

	Node.prototype.hasAttribute = function (key) {
		return (key in this.attributes);
	};

	Node.prototype.add = function (node) {
		if (!node.parent.hasNode(node)) {	 
			node.parent = this;
			node.level = this.level + 1;
			if (!this.root && this.level == 1) {
				this.topNode = this;
			}
				
			this.nodes.push(node);
		}
		return node;
	};

	Node.prototype.hasNode = function (node) {
		var  i = this.nodes.length;
		while (i--) {
			if (this.nodes[i].item == node.item)  {
				return true;
			}
		}
		return false;
	};

	/**
	* Iterates every node child
	*/
	Node.prototype.iterate = function (fn) {
		var length = this.nodes.length, 
			i;
		if (length < 1)	{
			return false;
		}
		for (i = 0; i < length; i++) {
			// Callback
			fn (this.nodes[i], 			// Node
				i, 						// Nodes index
				this.nodes[i].level, 	// Node Level
				this.nodes[i].parent); 	// Parent Node

			if (this.nodes[i].hasNodes()) {
				this.nodes[i].iterate(fn);
			}
		}	
		return true;
	};

	/**
	*	Iterates the same level node then every child node 
	*/
	Node.prototype.iterateH = function (fn, topNode) {
		var length = this.nodes.length, 
			i 			= 0, 
			that 		= this,
			nodes 		= this.nodes,
			cached 		= [],
			callReturn, 
			topNode, 
			node;


		//This time I didn't cached the length since the this.nodes.length can change
		for (i; i < this.nodes.length; i++) {
			// Callback
			node = this.nodes[i];
			if (this.topNode) {
				topNode = this.topNode;
				//this.topNode = node;
			}
			//console.log(i);
			//console.log(node);
			fn (node, 			// Node
				i, 						// Nodes index
				node.level, 	// Node Level
				node.parent,
				function () {
					i = that.nodes.length-1;
				}, topNode); 	// Parent Node
			if (this.nodes[i].hasNodes()) {
				cached.push(function(){
					that.nodes[i].iterateH(fn, topNode);
				});
			}
			length = nodes.length;
		}	

		i = 0;length = cached.length;
		for (; i < length; i++) {
			cached[i]();
		}
	};
	/**
	* Iterate Backwards
	*/
	Node.prototype.iterateHB = function (fn, topNode) {
		var length 		= this.lastIndex || this.nodes.length, 
			i 			= 0, 
			that 		= this,
			nodes 		= this.nodes,
			cached 		= [],
			callReturn, 
			topNode, 
			node,
			stop 		= false;		

		var i = that.lastIndex || this.nodes.length;
		while (i--) {
						// Callback
			node = this.nodes[i];
			if (this.topNode) {
				topNode = this.topNode;
			}
			if (fn (node, 		// Node
				i, 				// Nodes index
				node.level, 	// Node Level
				node.parent,
				function () {
					that.lastIndex = i;
					
				}, topNode)) {
				stop = true;
			} 	// Parent Node
			if (this.nodes[i].hasNodes()) {
				cached.push(function(){
					that.nodes[i].iterateH(fn, topNode);
				});
			}
			if (nodes.length !== length) {
				i = nodes.length-i;
			}

			if (stop) {
				stop = false;
				return;
			}
		}

		i = 0;length = cached.length;
		for (; i < length; i++) {
			cached[i]();
		}
	};

	Node.prototype.getNodes = function () {
		return this.nodes;
	};


	Node.prototype.hasNodes = function () {
		return this.nodes.length > 0;
	};

	return Node;
}())));
