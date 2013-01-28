/*!
 * framework.js
 * @author jiashun.z@gmail.com
 */
if ( !com ) var com = {};
if ( !com.b5m ) com.b5m = {};
if ( !com.b5m.shoppingassist ) com.b5m.shoppingassist = {};
/**
 * define
 */
(function(S,log,undefined){
	var config={
		server:'http://localhost:8080/comb5mpluginserver',
		paths:{
			'jquery':{
				path:'/js/jquery-1.7.1.js',
				parse:function(){
					return jQuery.noConflict(true);
				}
			},
			'rule':{
				path:'/js/b5m.v3.rule.js?v='+new Date().getTime(),
				parse:function(){
					return S.rule;
				}
			}
		}
	};
	
	var hasOwn=Object.prototype.hasOwnProperty,
		slice=Array.prototype.slice,
		splice=Array.prototype.splice,
		op = Object.prototype,
        ostring = op.toString,
		modules={},
		waitModules=[],
		//the module has put
		_waitModules={},
		waitDependencies=[],
		//the dependence has put
		_waitDependencies={};
		
	(function(){
		//jquery
		if (typeof jQuery != 'undefined'&&jQuery().jquery>'1.4.3' && typeof (jQuery.ajax) != 'undefined'){
			modules['jquery']=jQuery||$;
		}
		//rule
		if(S.rule){
			modules['rule']=S.rule;
		}
	})();
	
	function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }
    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }
	function loadScript(uri,callback){
		uri=config.path[uri]||uri;
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement("script");
		script.type = 'text/javascript';
		script.src = config.server + uri;
		script.onload = script.onreadystatechange = function() {
			if (!script.readyState || script.readyState === 'loaded' || script.readyState === 'complete') {
				if (callback) {
					callback();
				}
				script.onload = script.onreadystatechange = null;
			}
		};
		head.appendChild(script);
	};
	/**
	 * @param name:				module's name
	 * @param dependencies:		module's dependencies
	 * @param fn:				module function
	 */
	S.define=function(name,dependencies,fn,options){
		if(hasProp(modules,name)&&!(options&&options.force))return;
		if(typeof dependencies==='function'||isArray(dependencies)&&dependencies.length===0){
			addModule(name,dependencies());
			return;
		}
		var module={name:name,dependencies:dependencies,fn:fn};
		var ds=module.dependencies;
		if(!hasDependencies(ds)){
			putDepends(ds)
			putWaitModule(module);
			return;
		}else{
			parseModule(module);
		}
	};
	var _modules={},		//modules loaded
		waitDepends=[],		//depends wait to load
		_waitDepends={},	//depends has add to queue	
		waitModules=[],		//modules wait to load
		_waitModules={},
		loading=false,
		executing=false;	//modules has add to queue
		
	function hasDependencies(ds){
		for(var i=0,l=ds.length;i<l;i++){
			if(!hasProp(_modules,ds[i])){
				return false;
			}
		}
		return true;
	};
	function putDepends(d){
		if(!d)return;
		if(typeof d=='string')d=[d];
		for(var i=0,l=d.length;i<l;i++){
			if(hasProp(_waitDepends,d[i]))continue;
			_waitDepends[d[i]]=true;
			waitDepends.push(d[i]);
			setTimeout(function(){
				loadDepends();
			},13);
		}
	};
	function parseModule(m){
		var ds=m.dependencies||[],args=[];
		for(var i=0,l=ds.length;i<l;i++){
			args.push(_modules[ds[i]]);
		}
		addModule(m.name,m.fn.apply(window,args));
		return true;
	};
	function addModule(name,module){
		_modules[name]=module;
		executeWaitModules();
	};
	function putWaitModule(module){
		if(!module)return;
		var name=module.name;
		if(hasProp(_waitModules,name))return;
		_waitModules[name]=true;
		waitModules.push(module);
	};
	/**
	 * 
	 */
	function loadDepends(waits){
		if(loading)return;
		loading=true;
		if(typeof waits==='undefined'||!waits){
			waits=waitDepends;
		}
		var depend=waits.shift();
		if(!depend){
			loading=false;
			return;
		}
		var path=config.paths[depend],parse;
		if(typeof path==='object'){
			parse=path.parse;
			path=path.path;
		}
		if(path){
			loadScript(path,function(){
//				var p=parse;
//				var name=depend;
				if(typeof parse=='function')addModule(depend,parse());
			});
		}else{
			log("module["+depend+"] wait to parse");
		}
		loading=false;
		loadDepends(waits);
	};
	/**
	 * 
	 */
	function executeWaitModules(waits){
		if(executing)return;
		executing=true;
		if(typeof waits==='undefined'||!waits){
			waits=waitModules;
		}
		var i=-1,m;
		while(++i<waits.length){
			m=waits[i];
			if(!m)continue;
			if(hasProp(_modules,m.name)){
				waits[i]=null;
				continue;
			}
			if(hasDependencies(m.dependencies)){
				parseModule(m);
				waits[i]=null;
			}
		}
		executing=false;
	};
	
})(com.b5m.shoppingassis,function (msg) {window.console && console.log(msg)});
