/*
 * Original Author: Yuval Greenfield (http://uberpython.wordpress.com)
 * Rewrite Author: Chuck Lauer Vose (http://github.com/vosechu)
 *
 * Favicon by Double-J designs http://www.iconfinder.com/icondetails/68600/64/_icon
 * HTML based on http://demo.marcofolio.net/fullscreen_image_slider/
 * Author of slideshow base :      Marco Kuiper (http://www.marcofolio.net/)
 */

$(function () {

  window.photos = new Redditp.PhotoCollection();
  window.mainView = new Redditp.WindowView({collection: window.photos});

});

var Redditp = {};

Redditp.Photo = Backbone.Model.extend({});

Redditp.PhotoCollection = Backbone.Collection.extend({

  model: Redditp.Photo,
  nextPageId: '',
  currentPhotoIndex: -1,

  url: function () {
    var redditBaseUrl = "http://www.reddit.com";
    var urlData = this.getQueryString();
    var subredditUrl = urlData[0];
    var urlOptions = urlData[1];

    if (subredditUrl === "") {
      subredditUrl = "/";
    }
    return redditBaseUrl + subredditUrl + ".json?jsonp=?&after=" + this.nextPageId + "&" + urlOptions;
  },
  getQueryString: function () {
    var regexS = "(/(?:(?:r)|(?:user)|(?:domain))/[^&#?]*)[?]?(.*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results === null) {
      return ["", ""];
    } else {
      return [results[1], decodeURIComponent(results[2].replace(/\+/g, " "))];
    }
  },

  activePhoto: function () {
    // Pre-emptively go out and fetch new models
    if (this.currentPhotoIndex > (this.models.length - 5)) {
      this.fetch({remove: false});
    }
    return this.models[this.currentPhotoIndex];
  },

  seek: function (index) {
    this.currentPhotoIndex = index;
    this.trigger('change:currentPhotoIndex');
  },
  next: function () {
    this.seek(this.currentPhotoIndex + 1);
  },
  prev: function () {
    this.seek(this.currentPhotoIndex - 1);
  },
  seekByCid: function (cid) {
    var id;
    _.each(this.models, function (model, index) {
      if (model.cid === cid) {
        id = index;
      }
    });
    this.seek(id);
  },

  parse: function (response, options) {
    // Store the next page in the collection object
    this.nextPageId = response.data.after;

    // Create array of model attributes
    var posts = this.postsWithImages(response);

    return posts;
  },
  postsWithImages: function (response) {
    // Pull the child data into an array
    var posts = _.map(response.data.children, function (post) {
      return post.data;
    }, this);

    // Throw out any posts that don't look like images
    var postsWithImages =  _.filter(posts, function (post) {
      return this.probablyImage(post.url);
    }, this);

    // Add extension to links to force them to download as image from imgur
    // FIXME: cleanup to only add when needed and from imgur
    postsWithImages = _.map(posts, function(post) {
      post.url += '.jpg';
      return post;
    }, this);

    return postsWithImages;
  },
  probablyImage: function (url) {
    return (typeof(url) !== 'undefined' &&
      url !== '' &&
      ( this.hasImageExtension(url) ||
        this.hasImgurDomain(url)));
  },
  hasImageExtension: function (url) {
    return !!(/(jpg|png|jpeg|bmp)$/).exec(url);
  },
  hasImgurDomain: function (url) {
    if (!!(/imgur.com\//).exec(url)) {
      return !(/imgur.com\/a\//).exec(url);
    }
  }

});

Redditp.WindowView = Backbone.View.extend({

  el: 'body',

  initialize: function () {
    this.photoView = new Redditp.PhotoView({collection: this.collection});
    this.navControlsView = new Redditp.NavControlsView({collection: this.collection});
    this.arrowsView = new Redditp.ArrowsView({collection: this.collection});
    this.keysController = new Redditp.KeysController({collection: this.collection});

    this.listenTo(this.collection, "reset", this.render);
    this.collection.fetch({remove: false, reset: true});
  },

  render: function () {
    this.collection.next();
  }

});

Redditp.PhotoView = Backbone.View.extend({

  animationSpeed: 1000,
  el: '#pictureSlider',
  template: _.template("<div class=\"photo\" id=\"photo-<%= cid %>\" />"),

  initialize: function() {
    this.listenTo(this.collection, "add", this.addOne);
    this.listenTo(this.collection, "reset", this.addAll);
    this.listenTo(this.collection, "change:currentPhotoIndex", this.change);
  },

  addAll: function () {
    _.each(this.collection.models, function (photo) {
      this.addOne(photo);
    }, this);
  },

  addOne: function(photo) {
    // Create a new div and apply the CSS
    var cssMap = {};
    cssMap['display'] = "none";
    cssMap['background-image'] = "url(" + photo.get('url') + ")";
    cssMap['background-repeat'] = "no-repeat";
    cssMap['background-size'] = "contain";
    cssMap['background-position'] = "center";

    var divNode = $(this.template({cid: photo.cid})).css(cssMap);

    this.$el.append(divNode);
  },

  change: function () {
    var photo = this.collection.activePhoto();
    var oldPhoto = $('.photo.active');

    oldPhoto.removeClass('active').hide();
    $("#photo-" + photo.cid).addClass('active').fadeIn(this.animationSpeed);
  }

});

Redditp.NavControlsView = Backbone.View.extend({

  el: '#controlsDiv',
  template: _.template("<li><a title=\"<%= title %>\" class=\"numberButton\" data-cid=\"<%= cid %>\" id=\"numberButton<%= cid %>\"><%= subcid %></a></li>"),

  events: {
    'click .collapser': 'toggleCollapse',
    'click .numberButton': 'seek'
  },

  initialize: function () {
    this.listenTo(this.collection, "add", this.addOne);
    this.listenTo(this.collection, "reset", this.addAll);
    this.listenTo(this.collection, "change:currentPhotoIndex", this.change);
  },

  addAll: function (collection) {
    _.each(this.collection.models, function (photo) {
      this.addOne(photo);
    }, this);
  },

  addOne: function (model) {
    var newListItem = $(this.template({title: model.get('title'), cid: model.cid, subcid: model.cid.replace(/c/, '')}));
    var navboxUls = $("#allNumberButtons").append(newListItem);
  },

  change: function () {
    photo = this.collection.activePhoto();

    // Remove active from all buttons, add it on the new button
    $('.numberButton').removeClass('active');
    $('#numberButton' + photo.cid).addClass('active');

    // Update the urls for the comment and image link
    $('#navboxLink').attr('href', photo.get('url')).attr('title', photo.get('title'));
    $('#navboxCommentsLink').attr('href', "http://www.reddit.com" + photo.get('permalink')).attr('title', "Comments on reddit");
  },

  seek: function (e) {
    this.collection.seekByCid($(e.currentTarget).data('cid'));
  },

  toggleCollapse: function (e) {
    target = $('#controlsDiv .collapser');
    var state = target.data('openstate');
    if (state === "open" || typeof(state) === "undefined") {
      target.text("+");
      // move to the left just enough so the collapser arrow is visible
      var arrowLeftPoint = target.position().left;
      target.parent().animate({
        left: "-" + arrowLeftPoint + "px"
      });
      target.data('openstate', "closed");
    } else {
      target.text("-");
      target.parent().animate({
        left: "0px"
      });
      target.data('openstate', "open");
    }
  },

  downloadImage: function () {
    // create a new mouse event
    var evt = document.createEvent("MouseEvents");

    // initialize all the parameters of the event
    evt.initMouseEvent("click", true, true, window,
      0, 0, 0, 0, 0,
      false, true, false, false,  // ctrl, alt, shift, meta
      0, null);

    $('#navboxLink')[0].dispatchEvent(evt);
  }

});

Redditp.KeysController = Backbone.View.extend({

  el: document,
  keys: {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    one: 49,
    nine: 57,
    space: 32,
    pageup: 33,
    pagedown: 34,
    enter: 13,
    c_key: 67,
    d_key: 68,
    v_key: 86
  },

  events: {
    keydown: 'respondToKeyPress'
  },

  respondToKeyPress: function (e) {
    var code = (e.keyCode ? e.keyCode : e.which);

    switch (code) {
      case this.keys.c_key:
        mainView.navControlsView.toggleCollapse();
        break;
      case this.keys.pageup:
      case this.keys.left:
      case this.keys.up:
        return this.collection.prev();
      case this.keys.pagedown:
      case this.keys.right:
      case this.keys.down:
      case this.keys.space:
        return this.collection.next();
      case this.keys.v_key:
      case this.keys.d_key:
        mainView.navControlsView.downloadImage();
        break;
    }
  }

});

Redditp.ArrowsView = Backbone.View.extend({

  el: 'body',

  events: {
    'click .prevArrow': 'prev',
    'click .nextArrow': 'next',
  },

  prev: function () {this.collection.prev();},
  next: function () {this.collection.next();}

});