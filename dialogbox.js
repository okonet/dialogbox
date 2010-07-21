// 
//  dialogbox.js
//
//  Implements facebook-style dialog boxes based on element IDs.
//
//  Requiers Mootools.
//  
//  license: MIT-style
//
//  Created by Andrey Okonetchnikov on 2010-07-19.
//  Copyright 2010 wollzelle GmbH (http://wollzelle.com). All rights reserved.
// 

(function(){
  var $ = document.id;

  window.Dialogbox = new Class({

    TEXT_CLOSE: 'Close',

    Implements: [Options, Events, Class.Occlude],

    options: {},

    property: 'dialogbox',

    initialize: function(){
      this.element = $(document);
      this.defaultOptions = {
        width       : 800,
        height      : 600,
        onOpen      : $empty,
        onClose     : $empty
      };
  
      // if(typeof console != 'undefined'){console.log(this.defaultOptions)};
  
      if(this.occlude()) {
        return this.occluded;
      } else {
        this.build();
        return this;
      } 
    },

    build: function(){
      this.closeLnk = new Element('a', { 'class': 'dialogbox_close', 'rel': 'dialogbox:close'}).set('text', this.TEXT_CLOSE);
      this.overlay  = new Element('div', { 'class': 'dialogbox_overlay', 'rel': 'dialogbox:close' });
      this.overlay.inject(document.body, 'bottom');
    },

    update: function(){
      this.dialog.setStyles({
        'margin-left' : -(this.options.width  / 2 >> 0),
        'margin-top'  : -(this.options.height / 2 >> 0),
        'width'       : this.options.width,
        'height'      : this.options.height
      }).grab(this.closeLnk, 'top');
      return this;
    },

    open: function(el){
      this.dialog = $(el);    
      this.options = this.dialog.onclick() || {};
      this.update();
      this.dialog.addClass('active');
      document.body.addClass('dialogbox');
      if(typeof this.options.onOpen === 'function') this.options.onOpen();
    },

    close: function(options){
      this.dialog.removeClass('active');
      document.body.removeClass('dialogbox');
      if(typeof this.options.onClose === 'function') this.options.onClose();
      this.options = this.defaultOptions;
    }
  });

  // Global click observer
  document.addEvent('click', function(e){
    var el = $(e.target);
    var action = el.get('rel');
  
    if($defined(action)) e.preventDefault();
  
    switch (action) {
    
      case 'dialogbox:open':
        var id = new URI(el.href).parsed.fragment;
        var content = $(id);
        new Dialogbox().open(content);
      break;
    
      case 'dialogbox:close':
        new Dialogbox().close();
      break;

      default:
      
      break;
    }
  });

  window.addEvent('domready', function(){
    new Dialogbox();
  });

})();