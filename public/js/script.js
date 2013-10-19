/*
 * Author: Yuval Greenfield (http://uberpython.wordpress.com)
 *
 * Favicon by Double-J designs http://www.iconfinder.com/icondetails/68600/64/_icon
 * HTML based on http://demo.marcofolio.net/fullscreen_image_slider/
 * Author of slideshow base :      Marco Kuiper (http://www.marcofolio.net/)
 */

// Tests
// Keys work for nav?
// Numbers work for nav?
// Clicking 12 loads new photos?

// Objects I'd be inclined to create:
//   DisplayView
//   NavControlsView
//   Events
//   PhotoCollection

var Redditp = {};
// Redditp.Events = {};
// Redditp.Images = {};
// Redditp.Urls = {};

$(function () {
  // Redditp.Events.addEventListenerAll();
  // Redditp.Events.collapseControls();
  // Redditp.Images.init();

  window.photos = new Redditp.PhotoCollection();
  window.mainView = new Redditp.WindowView({collection: window.photos});
});
Redditp.Photo = Backbone.Model.extend({});
Redditp.PhotoCollection = Backbone.Collection.extend({
  model: Redditp.Photo,
  after: '',
  currentPhotoIndex: -1,
  url: function () {
    var redditBaseUrl = "http://www.reddit.com";
    var urlData = this.getQueryString();
    var subredditUrl = urlData[0];
    var urlOptions = urlData[1];

    if (subredditUrl === "") {
      subredditUrl = "/";
    }
    return redditBaseUrl + subredditUrl + ".json?jsonp=?&after=" + this.after + "&" + urlOptions;
  },
  activePhoto: function () {
    return this.models[this.currentPhotoIndex];
  },
  next: function () {
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.models.length;
    this.trigger('change:currentPhotoIndex');
  },
  prev: function () {
    this.currentPhotoIndex = this.currentPhotoIndex - 1;
    this.trigger('change:currentPhotoIndex');
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
  parse: function (response, options) {
    // Store the next page in the collection object
    this.after = response.data.after;

    // Create array of model attributes
    var posts = this.postsWithImages(response);

    return posts;
  },
  postsWithImages: function (response) {
    var posts = _.map(response.data.children, function (post) {
      return post.data;
    }, this);

    // Throw out any posts that don't look like images
    var postsWithImages =  _.filter(posts, function (post) {
      return this.probablyImage(post.url);
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
    this.listenTo(this.collection, "reset", this.render);
    this.collection.fetch({remove: false, reset: true});
  },

  render: function () {
    photoView = new Redditp.PhotoView({collection: this.collection});
    navControlsView = new Redditp.NavControlsView({collection: this.collection});
    arrowsView = new Redditp.ArrowsView({collection: this.collection});
    KeysController = new Redditp.KeysController({collection: this.collection});
    this.collection.next();
  }
});
Redditp.PhotoView = Backbone.View.extend({
  animationSpeed: 1000,
  el: '#pictureSlider',

  initialize: function() {
    this.listenTo(this.collection, "change:currentPhotoIndex", this.render);
  },

  render: function() {
    var photo = this.collection.activePhoto();
    var oldDiv = $("#pictureSlider div");

    // Create a new div and apply the CSS
    var cssMap = {};
    cssMap['display'] = "none";
    cssMap['background-image'] = "url(" + photo.get('url') + ")";
    cssMap['background-repeat'] = "no-repeat";
    cssMap['background-size'] = "contain";
    cssMap['background-position'] = "center";

    var divNode = $("<div />").css(cssMap).addClass(photo.cssclass);

    divNode.prependTo(this.$el);
    $("div", this.$el).fadeIn(this.animationSpeed);

    oldDiv.fadeOut(this.animationSpeed, function () {
      oldDiv.remove();
    });
  }
});

Redditp.NavControlsView = Backbone.View.extend({
  el: '#controlsDiv',

  initialize: function () {
    this.listenTo(this.collection, "add");
  }
});
Redditp.KeysController = Backbone.View.extend({
  el: 'body',
  events: {
    'keydown :input': 'logKey',
    'keypress :input': 'logKey'
  },
  logKey: function(e) {
    console.log(e.type, e.keyCode);
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

// Redditp.Events = (function () {
//   var keys = {
//     left: 37,
//     up: 38,
//     right: 39,
//     down: 40,
//     one: 49,
//     nine: 57,
//     space: 32,
//     pageup: 33,
//     pagedown: 34,
//     enter: 13,
//     d_key: 68
//   };

//   // @public
//   var addEventListenerAll = function () {
//     addEventListenerClicks();
//     addEventListenerSwipe();
//     addEventListenerKeys();
//   };

//   // @public
//   var collapseControls = function () {
//     $('.collapser').trigger('click');
//   };

//   // Control clicking of the next/prev buttons
//   var addEventListenerClicks = function () addEventListener("click", toggleCollapse);//   };

//   // Control swiping on mobile devices
//   var addEventListenerSipe = function () {
//     $("#pictureSlider").touchwipe({
//       wipeLeft: function () {
//         Redditp.Images.nextSlide();
//       },
//       wipeRight: function () {
//         Redditp.Images.prevSlide();
//       },
//       wipeUp: function () {
//         Redditp.Images.nextSlide();
//       },
//       wipeDown: function () {
//         Redditp.Images.prevSlide();
//       },
//       min_move_x: 20,
//       min_move_y: 20,
//       preventDefaultEvents: false
//     });
//   };

//   // Control key presses
//   var addEventListenerKeys = function () addEventListenering-arrow-keys-in-js-jquery
//       var code = (e.keyCode ? e.keyCode : e.which);

//       switch (code) {
//         case keys.c_key:
//           toggleCollapse();
//           break;
//         case keys.pageup:
//         case keys.left:
//         case keys.up:
//           return Redditp.Images.prevSlide();
//         case keys.pagedown:
//         case keys.right:
//         case keys.down:
//         case keys.space:
//           return Redditp.Images.nextSlide();
//         case keys.d_key:
//           downloadImage();
//           break;
//       }
//     });
//   };

//   // Download the image currently being shown
//   var downloadImage = function () {
//     // create a new mouse event
//     var evt = document.createEvent("MouseEvents");

//     // initialize all the parameters of the event
//     evt.initMouseEvent("click", true, true, window,
//       0, 0, 0, 0, 0,
//       false, true, false, false,  // ctrl, alt, shift, meta
//       0, null);

//     $('#navboxLink')[0].dispatchEvent(evt);
//   };

//   // Handle the collapsing of the navControls
//   var toggleCollapse = function () {
//     var $this = $(this);
//     var state = $this.data('openstate');
//     if (state === "open" || typeof(state) === "undefined") {
//       $this.text("+");
//       // move to the left just enough so the collapser arrow is visible
//       var arrowLeftPoint = $this.position().left;
//       $this.parent().animate({
//         left: "-" + arrowLeftPoint + "px"
//       });
//       $this.data('openstate', "closed");
//     } else {
//       $this.text("-");
//       $this.parent().animate({
//         left: "0px"
//       });
//       $this.data('openstate', "open");
//     }
//   };

//   return {
//     addEventListenerAll: addEventListenerAll,
//     collapseControls: collapseControls
//   };
// })();

// Redditp.Images = (function () {
//   // Speed of the animation
//   var animationSpeed = 1000;

//   // Variable to store the images we need to set as background
//   // which also includes some text and url's.
//   var photos = [];
//   var cache = [];

//   // 0-based index to set which picture to show first
//   // init to -1 until the first image is loaded
//   var activeIndex = -1;

//   // Flags to handle repeated async calls
//   var loadingNextImages = false;
//   var isAnimating = false;
//   var foundOneImage = false;

//   // @public
//   var nextSlide = function() {
//     if (noImagesLeft()) {
//       startAnimation(0);
//     }
//     else {
//       startAnimation(activeIndex + 1);
//     }
//   };
//   // @public
//   var prevSlide = function() {
//     startAnimation(activeIndex - 1);
//   };
//   // @public
//   var init = function () {
//     getNextImages();
//   };

//   // We've hit the last image and there's nothing being downloaded,
//   // loop to the front.
//   var noImagesLeft = function () {
//     return(isLastImage(activeIndex) && !loadingNextImages);
//   };

//   // Starts the animation, based on the image index
//   var startAnimation = function (imageIndex) {
//     if (activeIndex == imageIndex) {
//       return;
//     }
//     // Out of bounds request
//     if (imageIndex > photos.length - 1 || imageIndex < 0 || isAnimating || photos.length === 0) {
//       return;
//     }

//     isAnimating = true;
//     updateNavControlInfo(imageIndex);
//     fadeInNewPhoto(imageIndex);

//     // Set the active index to the used image index
//     activeIndex = imageIndex;

//     if (isLastImage(activeIndex)) {
//       getNextImages();
//     }
//   };

//   // Animate the navigation box
//   var updateNavControlInfo = function (imageIndex) {
//     var photo = photos[imageIndex];

//     $('#navboxLink').attr('href', photo.url).attr('title', photo.title);
//     $('#navboxCommentsLink').attr('href', photo.commentsLink).attr('title', "Comments on reddit");

//     highlightNewNumber(activeIndex, imageIndex);
//   };

//   // Switch 'active' class to new image
//   var highlightNewNumber = function (oldImageIndex, newImageIndex) {
//     $('#numberButton' + (oldImageIndex + 1)).toggleClass('active');
//     $('#numberButton' + (newImageIndex + 1)).toggleClass('active');
//   };

//   // Slides the background photos
//   var fadeInNewPhoto = function (imageIndex) {
//     var photo = photos[imageIndex];
//     var oldDiv = $("#pictureSlider div");

//     // Create a new div and apply the CSS
//     var cssMap = {};
//     cssMap['display'] = "none";
//     cssMap['background-image'] = "url(" + photo.image + ")";
//     cssMap['background-repeat'] = "no-repeat";
//     cssMap['background-size'] = "contain";
//     cssMap['background-position'] = "center";

//     var divNode = $("<div />").css(cssMap).addClass(photo.cssclass);
//     divNode.prependTo("#pictureSlider");

//     $("#pictureSlider div").fadeIn(animationSpeed);

//     oldDiv.fadeOut(animationSpeed, function () {
//       oldDiv.remove();
//       isAnimating = false;
//     });
//   };

//   var isLastImage = function(imageIndex) {
//     return(imageIndex === photos.length - 1);
//   };

//   var getNextImages = function () {
//     this.loadingNextImages = true;

//     $.ajax({
//       url: nextImageUrl(),
//       dataType: 'json',
//       success: handleData,
//       error: failedAjax
//     });
//   };

//   var nextImageUrl = function () {
//     return Redditp.Urls.jsonUrl();
//   };

//   var failedAjax = function (data) {
//     console.log("Failed ajax, maybe a bad url? Sorry about that :(");
//   };

//   var handleData = function (data) {
//     Redditp.Urls.nextPage(data.data.after);

//     if (data.data.children.length === 0) {
//       console.log("No data from this url :(");
//       return;
//     }

//     $.each(data.data.children, function (i, item) {
//       var imgUrl = item.data.url;
//       var title = item.data.title;
//       var over18 = item.data.over_18;
//       var commentsUrl = "http://www.reddit.com" + item.data.permalink;
//       var goodImageUrl = Redditp.Urls.validateImageUrl(imgUrl);

//       if (goodImageUrl !== '') {
//         foundOneImage = true;
//         addImageSlide(goodImageUrl, title, commentsUrl, over18);
//       }
//     });

//     if (!foundOneImage) {
//       console.log("Sorry, no displayable images found in that url :(");
//     }

//     // show the first image
//     if (activeIndex == -1) {
//       startAnimation(0);
//     }

//     if (data.data.after === null) {
//       console.log("No more pages to load from this subreddit, reloading the start");

//       // Show the user we're starting from the top
//       var numberButton = $("<span />").addClass("numberButton").text("-");
//       addNumberButton(numberButton);
//     }

//     loadingNextImages = false;
//   };

//   var addImageSlide = function (url, title, commentsLink, over18) addEventListener('click', function () {
//       showImage($(this));
//     });
//     numberButton.addClass("numberButton");
//     addNumberButton(numberButton);
//   };

//   // maybe checkout http://engineeredweb.com/blog/09/12/preloading-images-jquery-and-javascript/ for implementing the old precache
//   // Arguments are image paths relative to the current page.
//   var preLoadImages = function () {
//     var args_len = arguments.length;
//     for (var i = args_len; i--;) {
//       var cacheImage = document.createElement('img');
//       cacheImage.src = arguments[i];
//       cache.push(cacheImage);
//     }
//   };

//   // Shows an image and plays the animation
//   var showImage = function (docElem) {
//     startAnimation(docElem.data('index'));
//   };

//   var addNumberButton = function (numberButton) {
//     var navboxUls = $(".navbox ul");
//     var thisNavboxUl = navboxUls[navboxUls.length - 1];

//     var newListItem = $("<li />").appendTo(thisNavboxUl);
//     numberButton.appendTo(newListItem);

//     // so li's have a space between them and can word-wrap in the box
//     navboxUls.append(document.createTextNode(' '));
//   };

//   return {
//     init: init,
//     prevSlide: prevSlide,
//     nextSlide: nextSlide
//   };
// })();

// Redditp.Urls = (function () {
//   var after = "";
//   var goodExtensions = ['.jpg', '.jpeg', '.bmp', '.png'];

//   // @public
//   var jsonUrl = function () {
//     var redditBaseUrl = "http://www.reddit.com";
//     var urlData = getRestOfUrl();
//     var subredditUrl = urlData[0];
//     var getVars = urlData[1];

//     if (subredditUrl === "") {
//       subredditUrl = "/";
//     }
//     return redditBaseUrl + subredditUrl + ".json?jsonp=?" + after + "&" + getVars;
//   };

//   // @public
//   var validateImageUrl = function (imgUrl) {
//     // ignore albums and things that don't seem like image files
//     var goodImageUrl = '';
//     if (isImageExtension(imgUrl)) {
//       goodImageUrl = imgUrl;
//     } else {
//       goodImageUrl = tryConvertUrl(imgUrl);
//     }

//     return goodImageUrl;
//   };

//   // @public
//   var nextPage = function (newAfter) {
//     after = "&after=" + newAfter;
//   };

//   var tryConvertUrl = function (url) {
//     if (url.indexOf('imgur.com') >= 0) {
//       if (url.indexOf('/a/') >= 0) {
//         // albums aren't supported yet
//         return '';
//       }
//       // imgur is really nice and serves the image with whatever extension
//       // you give it. '.jpg' is arbitrary
//       // regexp removes /r/<sub>/ prefix if it exists
//       // E.g. http://imgur.com/r/aww/x9q6yW9
//       if (url === url.replace(/r\/[^ \/]+\/(\w+)/, '$1')) {
//         return '';
//       } else {
//         return url.replace(/r\/[^ \/]+\/(\w+)/, '$1') + '.jpg';
//       }
//     }

//     return '';
//   };

//   var isImageExtension = function (url) {
//     var dotLocation = url.lastIndexOf('.');
//     if (dotLocation < 0) {
//       console.log("skipped no dot: " + url);
//       return false;
//     }
//     var extension = url.substring(dotLocation);

//     if (goodExtensions.indexOf(extension) >= 0) {
//       return true;
//     } else {
//       return false;
//     }
//   };

//   var decodeUrl = function (url) {
//     return decodeURIComponent(url.replace(/\+/g, " "));
//   };
//   var getRestOfUrl = function () {
//     var regexS = "(/(?:(?:r)|(?:user)|(?:domain))/[^&#?]*)[?]?(.*)";
//     var regex = new RegExp(regexS);
//     var results = regex.exec(window.location.href);
//     if (results === null) {
//       return ["", ""];
//     } else {
//       return [results[1], decodeUrl(results[2])];
//     }
//   };

//   return {
//     jsonUrl: jsonUrl,
//     validateImageUrl: validateImageUrl,
//     nextPage: nextPage
//   };
// })();