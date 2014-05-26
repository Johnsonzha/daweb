/*!
 * light requirejs
 * @author jiashun.z@gmail.com
 */

//define module js
var define, require;
(function(root, log, undefined) {
    var module_config = {
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
            if (hasProp(_waitDepends, d[i]) || hasProp(_modules, d[i]) || hasProp(_waitModules, d[i])) continue;
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
        //var path = module_config.paths[depend] || module_config.getModuleUrl(depend), _export;
        var path = module_config.paths[depend], _export;
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
   require.config = module_config; 
})(this, function(msg) { window.console && console.log(msg) });
