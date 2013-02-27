define('console',function(){
	return {
		debug:function(s){
				try{
					console.debug(this.msg(s));
				}catch(e){
//					this.ieDebug(s);
				}
			},
			msg:function(s){
				var date=new Date();
				var pad = function(aNumber) {
	                return ((aNumber < 10) ? "0" : "") + aNumber;
	            };
				s = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " "
                + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds())
                + " [DEBUG] [B5M] " + s;
                return s;
			}
	};
	
});

require(['mvc','jquery','console'],function(mvc,$,console){
	var inputItem=mvc.Model.extend({
		defaults:function(){
			return {
				keyword:'',
				seleted:-1
			}
		}
	});
	var inputItems=mvc.Collection.extend({
		model:inputItem,
		initialize:function(){
			this.selected=-1;
		},
		prev:function(){
			if(this.selected==-1&&!this.length)return;
			if(this.selected!=-1&&this.selected!=0)this.at(this.selected).set('selected',false,{silent:true});
			this.selected=Math.max(0,this.selected-1);
			this.at(this.selected).set('selected',true);
			
		},
		next:function(){
			if(this.selected==-1&&!this.length)return;
			if(this.selected!=-1&&this.selected!=this.length)this.at(this.selected).set('selected',false,{silent:true});
			this.selected=Math.min(this.selected+1,this.length-1);
			this.at(this.selected).set('selected',true);
		}
	});
	//datas
	var items=new inputItems;
	var AcView=mvc.View.extend({
		el:$('#test_wrap'),
		initialize:function(){
			this.listenTo(items, 'all', this.render);
		},
		render:function(){
			console.debug('render')
			var html=[];
			items.each(function(it){
				html.push('<li'+(it.get('selected')?' class="selected"':'')+'>'+it.get('keyword')+'</li>');
			});
			this.$el.html(html.join('')).show();
		}
	});
	var AcInput=mvc.View.extend({
		el:$('#test_input'),
		initialize:function(){
			this.bindEvents();
		},
		bindEvents:function(){
			this.$el.keydown(function(e){
				switch(e.which){
					case 13://enter
						items.add({keyword:$(this).val()});
						return false;
					case 38://up
						items.prev();
						console.debug(items.selected)
						return false;
					break;
					case 40://down
						items.next();
						console.debug(items.selected)
						return false;
					break;
				}
			});
			
		}
	});
	new AcInput;
	new AcView;
});

require(['jquery'],function($){
	alert($().jquery)
})


