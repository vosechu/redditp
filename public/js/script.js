// # RedditP
// ## a one-page, full-screen image viewer for Reddit.com

// Documentation & Examples at bottom

$(function () {

  // The `PhotoCollection` is responsible for holding a pointer to the currently
  // displayed photo as well as managing background loading of images
  window.photos = new Redditp.PhotoCollection();

  // The `mainView` is responsible for bootstrapping all the views and
  // watchers as well as kicking off the initial fetch when all the
  // views are in place
  window.mainView = new Redditp.WindowView({collection: window.photos});

});

var Redditp = {};

Redditp.Photo = Backbone.Model.extend({});

Redditp.PhotoCollection = Backbone.Collection.extend({

  model: Redditp.Photo,
  nextPageId: '',
  currentPhotoIndex: -1,
  postUrls: [],

  // `url` and `getQueryString` inspect the current document to determine
  // which subreddit(s) you want to look at. In addition, we store the
  // value that Reddit sends back for the next page which is not a simple
  // sequential number.
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

  // `activePhoto` is the getter for the photo model currently being displayed.
  // It also
  activePhoto: function () {
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
  // TODO: Switch to using cid as the index instead of currentPhotoIndex
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

    // Throw out any posts that are duplicates
    posts = _.reject(posts, function (post) {
      if (!_.contains(this.postUrls, post.url)) {
        this.postUrls.push(post.url);
        return false;
      }
      return true;
    }, this);

    // Throw out any posts that don't look like images
    posts =  _.filter(posts, function (post) {
      return this.probablyImage(post.url);
    }, this);

    // Add extension to links to force them to download as image from imgur
    posts = _.map(posts, function (post) {
      if (this.hasImgurDomain(post.url)) {
        if (this.hasNoImageExtension(post.url)) {
          post.url += '.jpg';
        }
      }
      return post;
    }, this);

    return posts;
  },
  probablyImage: function (url) {
    return (typeof(url) !== 'undefined' &&
      url !== '' &&
      this.hasImageExtension(url));
  },
  hasImageExtension: function (url) {
    return !!(/(jpg|png|jpeg)$/).exec(url);
  },
  hasImgurDomain: function (url) {
    if (!!(/imgur.com\//).exec(url)) {
      return !(/imgur.com\/a\//).exec(url);
    }
  },
  hasNoImageExtension: function (url) {
    return !(/\..{3,4}$/).exec(url);
  }

});

Redditp.WindowView = Backbone.View.extend({

  el: 'body',

  initialize: function () {
    // Setup all views and start all the watchers
    this.photoView = new Redditp.PhotoView({collection: this.collection});
    this.navControlsView = new Redditp.NavControlsView({collection: this.collection});
    this.arrowsView = new Redditp.ArrowsView({collection: this.collection});
    this.keysController = new Redditp.KeysController({collection: this.collection});

    // When the first load is finished, call reset. This will tell the
    // collection to load up the first image
    this.listenTo(this.collection, "reset", this.showFirstImage);
    this.collection.fetch({remove: false, reset: true});
  },

  showFirstImage: function () {
    this.collection.next();
  }

});

Redditp.PhotoView = Backbone.View.extend({

  fadeInSpeed: 1000,
  el: '#pictureSlider',
  template: _.template("<div class=\"photo\" id=\"photo-<%= cid %>\"><img src=\"<%= imageUrl %>\"></div>"),

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
    var divNode = $(this.template({cid: photo.cid, imageUrl: photo.get('url')}));

    this.$el.append(divNode);
  },

  change: function () {
    var photo = this.collection.activePhoto();
    var oldPhoto = $('.photo.active');

    oldPhoto.removeClass('active').hide();
    $("#photo-" + photo.cid).addClass('active').fadeIn(this.fadeInSpeed);
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

//
// Backbone version - redditp-replacement.herokuapp.com
//
// Original version - redditp.com
//
// Backbone Rewrite Author: Chuck Lauer Vose (http://github.com/vosechu)
//
// Original Author: Yuval Greenfield (http://uberpython.wordpress.com)
//
// Favicon by Double-J designs http://www.iconfinder.com/icondetails/68600/64/_icon
//
// HTML based on http://demo.marcofolio.net/fullscreen_image_slider/
//
// Author of slideshow base :      Marco Kuiper (http://www.marcofolio.net/)
//
// ## Examples
//
// http://redditp-replacement.herokuapp.com/r/funny
// http://redditp-replacement.herokuapp.com/r/funny+science+arresteddevelopment
//
// ## Hotkeys
//
// | Hotkey | Action                  |
// | ------ | ----------------------- |
// | arrows | navigation              |
// | c      | collapse/expand nav bar |
// | d/v    | download current image  |
//
//
// ## Rationale for rewrite
//
// Rewrites and forks are never a pretty affair. I chose to rewrite after
// making some attempts to get pull requests accepted. But my functionality
// was deemed sufficiently unique to me that I should fork.
//
// After that was done, I started tailoring the app to my needs; one of
// which was to understand the code. Trying to add features was a bear
// and the code was very complex. It's still complex, but it's less than
// 50% as long and feels at least twice as fast.
//
// ## Groking the code
//
// If you want to grok the code, please start with the WindowView and the
// PhotoView before moving on to the PhotoCollection. WindowView kicks off
// the whole process, including the initial fetch and adding the other
// views to the page. Views in this app are used mostly for coordination,
// they do not maintain most of the HTML except for a few templates.
//
// The core concept is that the collection has two sets of events, one
// for changing the currently displayed photo, and one set for downloading
// and rendering new photos. `change:currentPhotoIndex` is about changing
// the currently displayed photo. The fairly standard `add` and `reset`
// remain for updating the collection. Having these two sets of events
// allows the UI to remain separate from the activity of downloading
// images in the background.
//
// ## TODO
//
// * Big number bar across the bottom
// * URL at hatsnpants.com
// * Add Gif button back in
// * Inspect mime-type, not extension
// * Switch to using cid instead of positioning
// * Tests
// * Documentation
// * Thumbnails along bottom with spinners for photos still loading
// * Make landing page with links to good subreddits
// * Paste a reddit url and we'll extract the subreddit and whatnot
// * Have an auto-complete for subreddit entry w/ activity
// * Plus button to add multiple subreddits (and minus button)
// * Graphical download button