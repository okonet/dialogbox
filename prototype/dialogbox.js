// 
//  dialogbox.js
//  
//  Created by Andrey Okonetchnikov on 2010-11-15.
//  Copyright 2010 Andrey Okonetchnikov. All rights reserved.
// 

var DialogBox = {
  
  options: {},
  
  default_options: {
    'width':  600,
    'height': 400
  },
  
  initialize: function(options) {
    if(this.initialized) return this;
    
    this.loader =   new Element('div', { 'className': 'dialogbox_loader', 'rel': 'dialogbox:close' });
    this.overlay =  new Element('div', { 'className': 'dialogbox_overlay', 'rel': 'dialogbox:close' });
    this.box =      new Element('div', { 'className': 'dialogbox_dialog' }).setStyle({'visibilty': 'hidden'});
    this.content =  new Element('div', { 'className': 'dialogbox_dialog_content' });
    this.close =    new Element('div', { 'className': 'dialogbox_close', 'rel': 'dialogbox:close' });

    this.box.insert(this.close);
    this.box.insert(this.content);
    $(document.body).insert(this.overlay);
    $(document.body).insert(this.box);
    $(document.body).insert(this.loader);

    document.observe('click', this.dispatchClick.bindAsEventListener(this));

    // Flash workaround for Gecko on Windows
    if(Prototype.Browser.Gecko && navigator.userAgent.indexOf('Windows') > 0) {
      document.observe('dialogbox:open', function(){
        $$('.swf').each(function(el){
          var flashObject = el.down('object');
          var wmode = flashObject.getAttribute('wmode');
          if(!wmode || wmode != 'transparent') {
            flashObject.setAttribute('wmode', 'transparent');
            flashObject.parentNode.replaceChild(flashObject.cloneNode(true), flashObject);
          }
        });
      });

      document.observe('dialogbox:close', function(){
        $$('.swf').each(function(el){
          var flashObject = el.down('object');
          var wmode = flashObject.getAttribute('wmode');
          // Restore previous wmode setting or remove the attribute
          if(wmode && wmode == 'transparent') {
            flashObject.removeAttribute('wmode');
          }
          flashObject.parentNode.replaceChild(flashObject.cloneNode(true), flashObject);
        });
      });
    }

    // Fix for Webkit inability to animate visibility property.
    if(typeof WebKitTransitionEvent !== 'undefined') {
      document.addEventListener('webkitTransitionEnd', function(e){
        var el = $(e.target);
        if(e.propertyName === 'visibility' && el.hasClassName('dialogbox_dialog') && !el.hasClassName('active'))
          el.setStyle({'visibility': 'hidden'});
      }, false);
    }

    this.initialized = true;
  },
  
  /**
   * DialogBox#resetWebkitTransitions()
   * 
   * Really dirty method to resolve a Webkit bug with CSS transitions when some transitions does not start after another ones.
   * This method and it calls should be removed as Webkit bug disappears.
   * 
   **/
  resetWebkitTransitions: function(){
    var dummy = document.createElement('DIV');
    dummy.style.position = 'fixed';
    dummy.style.width = '1px';
    dummy.style.height = '1px';
    dummy.style.zIndex = 1;
    dummy.style.webkitTransitionProperty = '-webkit-transform';
    dummy.style.webkitTransitionDuration = '.1s';
    dummy.style.webkitTransform = 'scale(1)';
    Element.insert(document.body, dummy);
    (function(){
      dummy.style.webkitTransform = 'scale(0)';
    }).delay(.1);
    (function(){
      Element.remove(dummy);
    }).delay(.2);
  },
  
  dispatchClick: function(event) {
    if (!event) return;
    
    var el = event.findElement('*[rel]');
    if(Object.isUndefined(el)) el = event.findElement('a[class*="image-zoom-actuator"]'); // Backward compatibility to work with classnames too. Deprecated.
    if(Object.isUndefined(el)) return;
    
    // CSS transitions are really buggy in Webkit and Safari. So we'll try to overcome it.
    if(typeof WebKitTransitionEvent !== 'undefined') this.resetWebkitTransitions();
        
    var rel = el.getAttribute('rel');
    if(rel) {
      rel = rel.split('[');
      var action = rel[0];
      var options = rel.length > 1 ? this.parseParams(rel[1].gsub(/]/,'')) : null;
      switch(action) {
        case 'dialogbox:open':
          event.preventDefault();
          this.show(el, options);
          break;
        case 'dialogbox:close':
          event.preventDefault();
          this.hide();
          break;
      }
    } else {
      // Backward compatibility to work with classnames too. Deprecated. 
      if (el.hasClassName('image-zoom-actuator')) {
        event.preventDefault();
        this.show(el);
      }
    }
  },
  
  parseParams: function(params){
    try {
      var options = params.evalJSON(true);
      // Valid options hash is set as params. Eval and return it.
      if(options) return options;
      else return null;
    } catch(e) {
      var vals = params.split(',');
      // Width and height values are set as params. Build options hash and return it.
      if (vals.length == 2) 
        return {
          'width': vals[0],
          'height': vals[1]
        };
      else return null;
    }
  },
  
  show: function(url, options) {
    Object.extend(this.options, this.default_options);
    Object.extend(this.options, options || {});
    
    $$('html')[0].addClassName('dialogbox');
    $$('body')[0].addClassName('dialogbox');    
    this.overlay.addClassName('active');
    document.fire('dialogbox:open');
    
    // Preload content from url
    this.preload(
      url, 
      function(content){
        this.display(content);
      }.bind(this),
      function(request){
        if(typeof console !== 'undefined'){console.error(request.statusText)};
      }
    );
  },
  
  preload: function(url, success, failure){
    this.loader.addClassName('active');
    
    var isImage = new RegExp(/\.jpg|\.png|\.gif\?\d*\Z/i);
    if(url.match(isImage)) {
      Asset.load(url, function(src){
        this.loader.removeClassName('active');
        var image = new Element('img', { 'src': src, 'rel': 'dialogbox:close' });
        this.options.width = image.width;
        this.options.height = image.height;
        if(Object.isFunction(success)) success(image);
      }.bind(this));
    } else {
      new Ajax.Request(url, {
        method: 'get',
        onComplete: function(){
          this.loader.removeClassName('active');
        }.bind(this),
        onSuccess: function(transport){
          if(Object.isFunction(success)) success(transport.responseText);
        },
        onFailure: function(transport){
          if(Object.isFunction(failure)) failure(transport);
        }
      });
    }
  },
  
  display: function(content){
    this.loader.removeClassName('active');
    this.content.update(content);
    this.box.setStyle({
      'marginTop': - Math.round(this.options.height / 2) + 'px',
      'marginLeft': - Math.round(this.options.width / 2) + 'px',
      'width': this.options.width + 'px',
      'height': this.options.height + 'px',
      'visibility': 'visible'
    }).addClassName('active');
  },

  hide: function() {
    this.loader.removeClassName('active');
    this.overlay.removeClassName('active');
    this.box.removeClassName('active');
    
    if(typeof WebKitTransitionEvent !== 'undefined') this.box.setStyle({'visibility': 'visible'}); // Fix for Webkit inability to animate visibility property.
    else this.box.setStyle({'visibility': 'hidden'});
    
    $$('html')[0].removeClassName('dialogbox');
    $$('body')[0].removeClassName('dialogbox');
    document.fire('dialogbox:close');
  }
};

document.on('dom:loaded', function(){
  DialogBox.initialize();
});

/**
 * class Asset
 * 
 * Implements images queue loading on request.
 * Calls callback with loaded image element when loading is completed.
 * 
 **/
var Asset = {
  assets: [],
  
  load: function(url, load) {
    var image = new Image();
    image.src = url;
    this.assets.push({ image: image, onLoad: load || Prototype.emptyFunction });
    this.wait();
  },
  
  wait: function() {
    if (this.interval) return;
    this.interval = setInterval(this.check.bind(this), 10);
  },
  
  check: function() {
    // Filter queue. If loading is completed, call the callback (if defined) and remove asset from queue.
    this.assets = this.assets.map(function(asset) {
      if (asset.image.complete) {
        if (typeof asset.onLoad === 'function') asset.onLoad(asset.image.src);
        return null;
      } else {
        return asset;
      }  
    }).compact();
        
    // No assets left in the queue
    if (this.assets.length == 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};