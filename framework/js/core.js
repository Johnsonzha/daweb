/*!
 * framework.js
 * @author jiashun.z@gmail.com
 */

//define module js
var define, require;
(function(root, log, undefined) {
    var module_config = {
        //default module's url to load
        module_url : assets_base_url + '/js/b5m.{module}.js?v=' + buildno,
        getModuleUrl : function(module) {
            return this.module_url.replace(/\{module\}/g, module);
        },
        paths : {
            'jquery' : {
                path : 'http://ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.min.js',
                _export : function() {
                    return jQuery.noConflict(true);
                }
            }
        }
    };
    var hasOwn = Object.prototype.hasOwnProperty,
        op = Object.prototype,
        ostring = op.toString,
        _modules = {},      //modules loaded
        waitDepends = [],       //depends wait to load
        _waitDepends = {},  //depends has add to queue  
        waitModules = [],       //modules wait to load
        _waitModules = {},
        waitRequires = [],      //requires wait to load
        loading = false,
        executing = false;
        
    (function(){
        //jquery
        if (typeof jQuery != 'undefined' && jQuery().jquery > '1.4.3' && typeof(jQuery.ajax) != 'undefined') {
            _modules['jquery'] = jQuery || $;
        }
    })();
    
    function hasProp(obj, prop) {
            return hasOwn.call(obj, prop);
        }
    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }
    function loadScript(uri, callback) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement("script");
        script.type = 'text/javascript';
        script.async = true;
        if (uri.indexOf('http://') !== 0) uri = server + uri;
        script.src = uri;
        script.onload = script.onreadystatechange = function() {
            if (!script.readyState || script.readyState === 'loaded' || script.readyState === 'complete') {
                script.onload = script.onreadystatechange = null;
                if (callback) {
                    callback();
                }
            }
        };
        head.appendChild(script);
    };

    function hasDependencies(ds) {
        for (var i = 0, l = ds.length; i < l; i++) {
            if (!hasProp(_modules, ds[i])) {
                return false;
            }
        }
        return true;
    };
    function putDepends(d) {
        if (!d) return;
        if (typeof d == 'string') d = [d];
        for (var i = 0, l = d.length; i < l; i++) {
            if (hasProp(_waitDepends, d[i]) || hasProp(_modules, d[i])) continue;
            _waitDepends[d[i]] = true;
            waitDepends.push(d[i]);
            setTimeout(function() { loadDepends(); }, 1);
        }
    };
    function parseModule(m) {
        var ds = m.dependencies || [], args = [];
        for (var i = 0, l = ds.length; i < l; i++) {
            args.push(_modules[ds[i]]);
        }
        addModule(m.name, m.fn.apply(root, args));
        //execute require
        setTimeout(function() {
            executeWaitRequires();
        }, 1);
        return true;
    };
    function addModule(name, module) {
        _modules[name] = module;
        executeWaitModules();
        executeWaitRequires();
    };
    function putWaitModule(module) {
        if (!module) return;
        var name = module.name;
        if (hasProp(_waitModules, name)) return;
        _waitModules[name] = true;
        waitModules.push(module);
    };
    function loadDepends(waits) {
        if (loading) return;
        loading = true;
        if (typeof waits === 'undefined' || !waits) {
            waits = waitDepends;
        }
        var depend = waits.shift();
        if (!depend) {
            loading = false;
            return;
        }
        var path = module_config.paths[depend] || module_config.getModuleUrl(depend), _export;
        if (typeof path === 'object') {
            _export = path._export;
            path = path.path;
        }
        //the config path is the not a module stand by amd
        if (path) {
            loadScript(path, function() {
                        if (typeof _export == 'function')
                            addModule(depend, _export());
                    });
        } else {
            log("module[" + depend + "] wait to export");
        }
        loading = false;
        loadDepends(waits);
    };


    function executeWaitModules(waits) {
        if (typeof waits === 'undefined' || !waits) {
            waits = waitModules;
        }
        var i = -1, m;
        while (++i < waits.length) {
            m = waits[i];
            if (!m) continue;
            if (hasProp(_modules, m.name)) {
                waits[i] = null;
                continue;
            }
            if (hasDependencies(m.dependencies)) {
                parseModule(m);
                waits[i] = null;
            }
        }
    };
    function parseRequire(r) {
        var ds = r.dependencies || [], args = [];
        for (var i = 0, l = ds.length; i < l; i++) {
            args.push(_modules[ds[i]]);
        }
        r.fn.apply(root,args);
        return true;

    };

    function executeWaitRequires(requires){
        if (typeof requires === 'undefined' || !requires) {
            requires = waitRequires;
        }
        if(requires.length === 0) return;
        var i = -1, r;
        while (++i < requires.length) {
            r = requires[i];
            if (!r) continue;
            if (hasDependencies(r.dependencies)) {
                parseRequire(r);
                requires[i] = null;
            }
        }
    };

    function putWaitRequire(r){
        waitRequires.push(r);
    };
    /**
     * @param name:             module's name
     * @param dependencies:     module's dependencies
     * @param fn:               module function
     */
    define = function(name, dependencies, fn, options) {
        if (hasProp(_modules, name) && !(options && options.force)) return;
        if (typeof dependencies === 'function' || isArray(dependencies) && dependencies.length === 0) {
            addModule(name, dependencies());
            return;
        }
        var module = { name : name, dependencies : dependencies, fn : fn };
        var ds = module.dependencies;
        if (!hasDependencies(ds)) {
            putDepends(ds);
            putWaitModule(module);
            return;
        } else {
            parseModule(module);
        }
    };

    /**
     * @param dependencies:     dependencies
     * @param fn:               function
     */
    require = function(dependencies,fn){
        if (arguments.length === 0) return;
        if (typeof dependencies === 'function' && arguments.length === 1) {
            fn();
            return;
        }
        var r = { dependencies : dependencies, fn : fn };
        var ds = r.dependencies;
        if (!hasDependencies(ds)) {
            putDepends(ds);
            putWaitRequire(r);
            return;
        } else {
            parseRequire(r);
        }
    };
    
})(this, function(msg) { window.console && console.log(msg) });

// some utils
define('_', function() {
    var _ = {};
    var ArrayProto = Array.prototype, 
        ObjProto = Object.prototype, 
        FuncProto = Function.prototype;

    // Create quick reference variables for speed access to core prototypes.
    var push = ArrayProto.push, 
        slice = ArrayProto.slice, 
        concat = ArrayProto.concat, 
        toString = ObjProto.toString, 
        hasOwnProperty = ObjProto.hasOwnProperty;
    var
        nativeForEach      = ArrayProto.forEach,
        nativeIsArray      = Array.isArray,
        nativeKeys         = Object.keys,
        nativeBind         = FuncProto.bind;
    _.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
    };
    
    //extend 
    _.extend = function(obj) {
        var args = slice.call(arguments, 1);
        var source;
        for (var i = 0; i < args.length; i++) {
            source = args[i];
            if (source) {
                for (var prop in source) {
                    obj[prop] = source[prop];
                }
            }
        }
        return obj;
    };
    
    //generate id
    var idCounter = 0;
    _.uniqueId = function(prefix) {
        var id = '' + ++idCounter;
        return prefix ? prefix + id : id;
    };
    
    
    var each = _.each = _.forEach = function(obj, iterator, context) {
        if (obj == null)
            return;
        if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                iterator.call(context, obj[i], i, obj);
            }
        } else {
            for (var key in obj) {
                if (_.has(obj, key)) {
                    iterator.call(context, obj[key], key, obj);
                }
            }
        }
    };
    var ctor=function(){};
    _.extend(_, {
                // is function
                isFunction : function(obj) {
                    return typeof obj === 'function';
                },
                // is array
                isArray : nativeIsArray || function(obj) {
                    return toString.call(obj) == '[object Array]';
                },
                // is object
                isObject : function(obj) {
                    return obj === Object(obj);
                },
                keys : function(obj) {
                    var keys = [];
                    for (var key in obj) {
                        if (_.has(obj, key))
                            keys[keys.length] = key;
                    }
                    return keys;
                },
                result : function(object, property) {
                    if (object == null)
                        return null;
                    var value = object[property];
                    return _.isFunction(value) ? value.call(object) : value;
                },
                defaults : function(obj) {
                    each(slice.call(arguments, 1), function(source) {
                                if (source) {
                                    for (var prop in source) {
                                        if (obj[prop] == null)
                                            obj[prop] = source[prop];
                                    }
                                }
                            });
                    return obj;
                },
                clone:function(obj){
                    if (!_.isObject(obj)) return obj;
                    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
                },
                bind : function() {
                    var args, bound;
                    if (func.bind === nativeBind && nativeBind)
                        return nativeBind.apply(func, slice.call(arguments, 1));
                    if (!_.isFunction(func)) throw new TypeError;
                    args = slice.call(arguments, 2);
                    return bound = function() {
                        if (!(this instanceof bound)) return func.apply(context, args.concat(slice .call(arguments)));
                        ctor.prototype = func.prototype;
                        var self = new ctor;
                        ctor.prototype = null;
                        var result = func.apply(self, args.concat(slice .call(arguments)));
                        if (Object(result) === result) return result;
                        return self;
                    };
                },
                pick : function(obj) {
                    var copy = {};
                    var keys = concat.apply(ArrayProto, slice .call(arguments, 1));
                    each(keys, function(key) {
                                if (key in obj) copy[key] = obj[key];
                            });
                    return copy;
                }
            });
    return _;
});

// mvc
define('mvc', ['_', 'jquery'], function(_, $) {
    var root = this;
    var array = [];
    var push = array.push;
    var slice = array.slice;
    var splice = array.splice;
    var mvc = {};
    var eventSplitter = /\s+/;
    
    // compatible some event api
    var eventsApi = function(obj, action, name, rest) {
        if (!name)
            return true;
        if (typeof name === 'object') {
            for (var key in name) {
                obj[action].apply(obj, [key, name[key]].concat(rest));
            }
        } else if (eventSplitter.test(name)) {
            var names = name.split(eventSplitter);
            for (var i = 0, l = names.length; i < l; i++) {
                obj[action].apply(obj, [names[i]].concat(rest));
            }
        } else {
            return true;
        }
    };
    var triggerEvents = function(obj, events, args) {
        var ev, i = -1, l = events.length;
        switch (args.length) {
            case 0 :
                while (++i < l) (ev = events[i]).callback.call(ev.ctx);
                return;
            case 1 :
                while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0]);
                return;
            case 2 :
                while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1]);
                return;
            case 3 :
                while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1], args[2]);
                return;
            default :
                while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
        }
    };
    var Events = mvc.Events = {
        on : function(name, callback, context) {
            if (!(eventsApi(this, 'on', name, [callback, context]) && callback))
                return this;
            this._events || (this._events = {});
            var list = this._events[name] || (this._events[name] = []);
            list.push({ callback : callback, context : context, ctx : context || this });
            return this;
        },

        off : function(name, callback, context) {
            var list, ev, events, names, i, l, j, k;
            if (!this._events || !eventsApi(this, 'off', name, [callback, context]))
                return this;
            if (!name && !callback && !context) {
                this._events = {};
                return this;
            }

            names = name ? [name] : _.keys(this._events);
            for (i = 0, l = names.length; i < l; i++) {
                name = names[i];
                if (list = this._events[name]) {
                    events = [];
                    if (callback || context) {
                        for (j = 0, k = list.length; j < k; j++) {
                            ev = list[j];
                            if ((callback && callback !== (ev.callback._callback || ev.callback)) || (context && context !== ev.context)) {
                                events.push(ev);
                            }
                        }
                    }
                    this._events[name] = events;
                }
            }

            return this;
        },

        trigger : function(name) {
            if (!this._events)
                return this;
            var args = slice.call(arguments, 1);
            if (!eventsApi(this, 'trigger', name, args))
                return this;
            var events = this._events[name];
            var allEvents = this._events.all;
            if (events) triggerEvents(this, events, args);
            //trigger 'all' event
            if (allEvents) triggerEvents(this, allEvents, arguments);
            return this;
        },

        listenTo : function(object, events, callback) {
            var listeners = this._listeners || (this._listeners = {});
            var id = object._listenerId || (object._listenerId = _.uniqueId('l'));
            listeners[id] = object;
            object.on(events, callback || this, this);
            return this;
        },

        stopListening : function(object, events, callback) {
            var listeners = this._listeners;
            if (!listeners)
                return;
            if (object) {
                object.off(events, callback, this);
                if (!events && !callback)
                    delete listeners[object._listenerId];
            } else {
                for (var id in listeners) {
                    listeners[id].off(null, null, this);
                }
                this._listeners = {};
            }
            return this;
        }
    };
    Events.bind = Events.on;
    Events.unbind = Events.off;
    // Model
    var Model = mvc.Model = function(attributes, options) {
        var defaults;
        var attrs = attributes || {};
        this.cid = _.uniqueId('c');
        this.attributes = {};
        if (options && options.collection)
            this.collection = options.collection;
        if (options && options.parse)
            attrs = this.parse(attrs, options) || {};
        if (defaults = _.result(this, 'defaults')) {
            attrs = _.defaults({}, attrs, defaults);
        }
        this.set(attrs, options);
        this.changed = {};
        this.initialize.apply(this, arguments);
    };
    _.extend(Model.prototype, Events, {
                changed : null,
                idAttribute : 'id',
                initialize : function() {
                },
                get : function(attr) {
                    return this.attributes[attr];
                },
                has : function(attr) {
                    return this.get(attr) != null;
                },
                set : function(key, val, options) {
                    var attr, attrs, unset, changes, silent, changing, prev, current;
                    if (key == null)
                        return this;

                    // Handle both `"key", value` and `{key: value}` -style
                    // arguments.
                    if (typeof key === 'object') {
                        attrs = key;
                        options = val;
                    } else {
                        (attrs = {})[key] = val;
                    }

                    options || (options = {});

                    // Run validation.
                    if (!this._validate(attrs, options))
                        return false;

                    // Extract attributes and options.
                    unset = options.unset;
                    silent = options.silent;
                    changes = [];
                    changing = this._changing;
                    this._changing = true;

                    if (!changing) {
                        this._previousAttributes = _.clone(this.attributes);
                        this.changed = {};
                    }
                    current = this.attributes, prev = this._previousAttributes;

                    // Check for changes of `id`.
                    if (this.idAttribute in attrs)
                        this.id = attrs[this.idAttribute];

                    // For each `set` attribute, update or delete the current
                    // value.
                    for (attr in attrs) {
                        val = attrs[attr];
                        if (current[attr]!==val)
                            changes.push(attr);
                        if (prev[attr]!==val) {
                            this.changed[attr] = val;
                        } else {
                            delete this.changed[attr];
                        }
                        unset ? delete current[attr] : current[attr] = val;
                    }

                    // Trigger all relevant attribute changes.
                    if (!silent) {
                        if (changes.length)
                            this._pending = true;
                        for (var i = 0, l = changes.length; i < l; i++) {
                            this.trigger('change:' + changes[i], this,
                                    current[changes[i]], options);
                        }
                    }

                    if (changing)
                        return this;
                    if (!silent) {
                        while (this._pending) {
                            this._pending = false;
                            this.trigger('change', this, options);
                        }
                    }
                    this._pending = false;
                    this._changing = false;
                    return this;
                },
                parse : function(resp, options) {
                    return resp;
                },
                isValid : function(options) {
                    return !this.validate
                            || !this.validate(this.attributes, options);
                },
                _validate : function(attrs, options) {
                    if (!options.validate || !this.validate)
                        return true;
                    attrs = _.extend({}, this.attributes, attrs);
                    var error = this.validationError = this.validate(attrs,
                            options)
                            || null;
                    if (!error)
                        return true;
                    this.trigger('invalid', this, error, options || {});
                    return false;
                },
                toJSON : function() {
                    return _.clone(this.attributes);
                }
            });
    // collections
    var Collection = mvc.Collection = function(models, options) {
        options || (options = {});
        if (options.model)
            this.model = options.model;
        this.models = [];
        this._reset();
        this.initialize.apply(this, arguments);
        if (models)
            this.reset(models, _.extend({ silent : true }, options));
    };
    _.extend(Collection.prototype, Events, {
                at : function(index) {
                    return this.models[index];
                },
                add : function(models, options) {
                    models = _.isArray(models) ? models.slice() : [models];
                    options || (options = {});
                    var i, l, model, attrs, add = [], at, existing;
                    for (i = 0, l = models.length; i < l; i++) {
                        if (!(model = this._prepareModel(attrs = models[i],
                                options))) {
                            continue;
                        }
                        add.push(model);
                        // trigger add remove event from model's any event
                        model.on('all', this._onModelEvent, this);
                        this._byId[model.cid] = model;
                        if (model.id != null)
                            this._byId[model.id] = model;
                    }
                    if (add.length) {
                        this.length += add.length;
                        if (at != null) {
                            splice.apply(this.models, [at, 0].concat(add));
                        } else {
                            push.apply(this.models, add);
                        }
                    }
                    if (options.silent)
                        return this;
                    // Trigger `add` events.
                    for (i = 0, l = add.length; i < l; i++) {
                        (model = add[i]).trigger('add', model, this, options);
                    }
                    return this;
                },
                remove : function(models, options) {
                    models = _.isArray(models) ? models.slice() : [models];
                    options || (options = {});
                    var i, l, index, model;
                    for (i = 0, l = models.length; i < l; i++) {
                        model = this.get(models[i]);
                        if (!model)
                            continue;
                        delete this._byId[model.id];
                        delete this._byId[model.cid];
                        index = this.indexOf(model);
                        this.models.splice(index, 1);
                        this.length--;
                        if (!options.silent) {
                            options.index = index;
                            model.trigger('remove', model, this, options);
                        }
                        this._removeReference(model);
                    }
                    return this;
                },
                shift : function(options) {
                    var model = this.at(0);
                    this.remove(model, options);
                    return model;
                },
                unshift : function(model, options) {
                    model = this._prepareModel(model, options);
                    this.add(model, _.extend({
                                        at : 0
                                    }, options));
                    return model;
                },
                push : function(model, options) {
                    model = this._prepareModel(model, options);
                    this.add(model, _.extend({
                                        at : this.length
                                    }, options));
                    return model;
                },
                pop : function(options) {
                    var model = this.at(this.length - 1);
                    this.remove(model, options);
                    return model;
                },
                slice : function(begin, end) {
                    return this.models.slice(begin, end);
                },
                indexOf : function(model) {
                    var models = this.models;
                    if (models == null)
                        return -1;
                    var i = 0, l = models.length;
                    for (; i < l; i++)
                        if (models[i] === model)
                            return i;
                    return -1;
                },
                get : function(obj) {
                    if (obj == null) return void 0;
                    this._idAttr || (this._idAttr = this.model.prototype.idAttribute);
                    return this._byId[obj.id || obj.cid || obj[this._idAttr] || obj];
                },
                _removeReference : function(model) {
                    if (this === model.collection)
                        delete model.collection;
                    model.off('all', this._onModelEvent, this);
                },
                _reset : function() {
                    this.length = 0;
                    this.models = [];
                    this._byId = {};
                },
                //reset all models 
                 reset : function(models, options) {
                    options || (options = {});
                    if (options.parse)
                        models = this.parse(models, options);
                    for (var i = 0, l = this.models.length; i < l; i++) {
                        this._removeReference(this.models[i]);
                    }
                    options.previousModels = this.models.slice();
                    this._reset();
                    if (models)
                        this.add(models, _.extend({ silent : true }, options));
                    if (!options.silent)
                        this.trigger('reset', this, options);
                    return this;
                },
                parse : function(resp, options) {
                    return resp;
                },
                _prepareModel : function(attrs, options) {
                    // set a ref to model,when trigger from model's any event
                    if (attrs instanceof Model) {
                        if (!attrs.collection)
                            attrs.collection = this;
                        return attrs;
                    }
                    options || (options = {});
                    options.collection = this;
                    var model = new this.model(attrs, options);
                    return model;
                },
                _onModelEvent : function(event, model, collection, options) {
                    if ((event === 'add' || event === 'remove') && collection !== this) return;
                    if (event === 'destroy') this.remove(model, options);
                    // trigger events bind on collections,any change:attr event
                    this.trigger.apply(this, arguments);
                },
                toJSON:function(){
                    var a=[];
                    for(var i=0,l=this.models.length;i<l;i++){
                        a.push(this.models[i].toJSON());
                    }
                    return a;
                },
                each : function() {
                    var args = slice.call(arguments);
                    args.unshift(this.models);
                    return _.each.apply(_, args);
                }
            });
    //view
    var View = mvc.View = function(options) {
        this.cid = _.uniqueId('view');
        this._configure(options || {});
        this._ensureElement();
        this.initialize.apply(this, arguments);
        this.delegateEvents();
    };
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

    // List of view options to be merged as properties.
    var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

    _.extend(View.prototype, Events, {
                tagName : 'div',
                $ : function(selector) {
                    return this.$el.find(selector);
                },
                initialize : function() {
                },
                render : function() {
                    return this;
                },
                remove : function() {
                    this.$el.remove();
                    this.stopListening();
                    return this;
                },
                setElement : function(element, delegate) {
                    if (this.$el) this.undelegateEvents();
                    this.$el = element instanceof $ ? element : $(element);
                    this.el = this.$el[0];
                    if (delegate !== false) this.delegateEvents();
                    return this;
                },
                _ensureElement : function() {
                    if (!this.el) {
                        var attrs = _.extend({}, _.result(this, 'attributes'));
                        if (this.id) attrs.id = _.result(this, 'id');
                        if (this.className) attrs['class'] = _.result(this, 'className');
                        var $el = $('<' + _.result(this, 'tagName') + '>') .attr(attrs);
                        this.setElement($el, false);
                    } else {
                        this.setElement(_.result(this, 'el'), false);
                    }
                },
                undelegateEvents : function() {
                    this.$el.off('.delegateEvents' + this.cid);
                },
                delegateEvents : function(events) {
                    if (!(events || (events = _.result(this, 'events')))) return;
                    this.undelegateEvents();
                    for (var key in events) {
                        var method = events[key];
                        if (!_.isFunction(method)) method = this[events[key]];
                        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
                        var match = key.match(delegateEventSplitter);
                        var eventName = match[1], selector = match[2];
                        method = _.bind(method, this);
                        eventName += '.delegateEvents' + this.cid;
                        if (selector === '') {
                            this.$el.on(eventName, method);
                        } else {
                            this.$el.on(eventName, selector, method);
                        }
                    }
                },
                _configure : function(options) {
                    if (this.options)
                        options = _.extend({}, _.result(this, 'options'), options);
                    _.extend(this, _.pick(options, viewOptions));
                    this.options = options;
                }
            });
    var extend = function(protoProps, staticProps) {
        var parent = this;
        var child;
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                parent.apply(this, arguments);
            };
        }

        _.extend(child, parent, staticProps);

        var Surrogate = function() {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        if (protoProps)
            _.extend(child.prototype, protoProps);

        child.__super__ = parent.prototype;

        return child;
    };

    Model.extend = Collection.extend = View.extend = extend;
    return mvc;
});
