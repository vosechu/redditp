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

var Redditp = {};
Redditp.Events = {};
Redditp.Images = {};
Redditp.Urls = {};

$(function () {
  Redditp.Events.bindAll();
  Redditp.Events.collapseControls();
  Redditp.Images.init();
});

Redditp.Events = (function () {
  var keys = {
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
    d_key: 68
  };

  // @public
  var bindAll = function () {
    bindClicks();
    bindSwipe();
    bindKeys();
  };

  // @public
  var collapseControls = function () {
    $('.collapser').trigger('click');
  };

  // Control clicking of the next/prev buttons
  var bindClicks = function () {
    $('#prevButton').bind("click", Redditp.Images.prevSlide);
    $('#nextButton').bind("click", Redditp.Images.nextSlide);
    $('.collapser').bind("click", toggleCollapse);
  };

  // Control swiping on mobile devices
  var bindSwipe = function () {
    $("#pictureSlider").touchwipe({
      wipeLeft: function () {
        Redditp.Images.nextSlide();
      },
      wipeRight: function () {
        Redditp.Images.prevSlide();
      },
      wipeUp: function () {
        Redditp.Images.nextSlide();
      },
      wipeDown: function () {
        Redditp.Images.prevSlide();
      },
      min_move_x: 20,
      min_move_y: 20,
      preventDefaultEvents: false
    });
  };

  // Control key presses
  var bindKeys = function () {
    $(document).keyup(function (e) {
      // More info: http://stackoverflow.com/questions/302122/jquery-event-keypress-which-key-was-pressed
      // http://stackoverflow.com/questions/1402698/binding-arrow-keys-in-js-jquery
      var code = (e.keyCode ? e.keyCode : e.which);

      switch (code) {
        case keys.c_key:
          toggleCollapse();
          break;
        case keys.pageup:
        case keys.left:
        case keys.up:
          return Redditp.Images.prevSlide();
        case keys.pagedown:
        case keys.right:
        case keys.down:
        case keys.space:
          return Redditp.Images.nextSlide();
        case keys.d_key:
          downloadImage();
          break;
      }
    });
  };

  // Download the image currently being shown
  var downloadImage = function () {
    // create a new mouse event
    var evt = document.createEvent("MouseEvents");

    // initialize all the parameters of the event
    evt.initMouseEvent("click", true, true, window,
      0, 0, 0, 0, 0,
      false, true, false, false,  // ctrl, alt, shift, meta
      0, null);

    $('#navboxLink')[0].dispatchEvent(evt);
  };

  var toggleCollapse = function () {
    var $this = $(this);
    var state = $this.data('openstate');
    if (state === "open" || typeof(state) === "undefined") {
      $this.text("+");
      // move to the left just enough so the collapser arrow is visible
      var arrowLeftPoint = $this.position().left;
      $this.parent().animate({
        left: "-" + arrowLeftPoint + "px"
      });
      $this.data('openstate', "closed");
    } else {
      $this.text("-");
      $this.parent().animate({
        left: "0px"
      });
      $this.data('openstate', "open");
    }
  };

  return {
    bindAll: bindAll,
    collapseControls: collapseControls
  };
})();

Redditp.Images = (function () {
  // Speed of the animation
  var animationSpeed = 1000;

  // Variable to store the images we need to set as background
  // which also includes some text and url's.
  var photos = [];
  var cache = [];

  // 0-based index to set which picture to show first
  // init to -1 until the first image is loaded
  var activeIndex = -1;

  // Flags to handle repeated async calls
  var loadingNextImages = false;
  var isAnimating = false;
  var foundOneImage = false;

  // @public
  var nextSlide = function() {
    if (isLastImage(activeIndex) && !loadingNextImages) {
      // the only reason we got here and there aren't more pictures yet
      // is because there are no more images to load, start over
      return startAnimation(0);
    }
    startAnimation(activeIndex + 1);
  };
  // @public
  var prevSlide = function() {
    startAnimation(activeIndex - 1);
  };
  // @public
  var init = function () {
    getNextImages();
  };

  // Starts the animation, based on the image index
  var startAnimation = function (imageIndex) {
    // If the same number has been chosen, or the index is outside the
    // photos range, or we're already animating, do nothing
    if (activeIndex == imageIndex || imageIndex > photos.length - 1 || imageIndex < 0 || isAnimating || photos.length === 0) {
      return;
    }

    isAnimating = true;
    animateNavigationBox(imageIndex);
    slideBackgroundPhoto(imageIndex);

    // Set the active index to the used image index
    activeIndex = imageIndex;

    if (isLastImage(activeIndex)) {
      getNextImages();
    }
  };

  // Animate the navigation box
  var animateNavigationBox = function (imageIndex) {
    var photo = photos[imageIndex];

    $('#navboxLink').attr('href', photo.url).attr('title', photo.title);
    $('#navboxCommentsLink').attr('href', photo.commentsLink).attr('title', "Comments on reddit");

    toggleNumberButton(activeIndex, false);
    toggleNumberButton(imageIndex, true);
  };

  var toggleNumberButton = function (imageIndex, turnOn) {
    var numberButton = $('#numberButton' + (imageIndex + 1));
    if (turnOn) {
      numberButton.addClass('active');
    } else {
      numberButton.removeClass('active');
    }
  };

  // Slides the background photos
  var slideBackgroundPhoto = function (imageIndex) {
    // Retrieve the accompanying photo based on the index
    var photo = photos[imageIndex];

    // Create a new div and apply the CSS
    var cssMap = {};
    cssMap['display'] = "none";
    cssMap['background-image'] = "url(" + photo.image + ")";
    cssMap['background-repeat'] = "no-repeat";
    cssMap['background-size'] = "contain";
    cssMap['background-position'] = "center";

    //var imgNode = $("<img />").attr("src", photo.image).css({opacity:"0", width: "100%", height:"100%"});
    var divNode = $("<div />").css(cssMap).addClass(photo.cssclass);
    //imgNode.appendTo(divNode);
    divNode.prependTo("#pictureSlider");

    $("#pictureSlider div").fadeIn(animationSpeed);
    var oldDiv = $("#pictureSlider div:not(:first)");
    oldDiv.fadeOut(animationSpeed, function () {
      oldDiv.remove();
      isAnimating = false;
    });
  };

  var isLastImage = function(imageIndex) {
    return(imageIndex === photos.length - 1);
  };

  var getNextImages = function () {
    this.loadingNextImages = true;

    $.ajax({
      url: nextImageUrl(),
      dataType: 'json',
      success: handleData,
      error: failedAjax
    });
  };

  var nextImageUrl = function () {
    return Redditp.Urls.jsonUrl();
  };

  var failedAjax = function (data) {
    console.log("Failed ajax, maybe a bad url? Sorry about that :(");
  };

  var handleData = function (data) {
    redditData = data;
    // NOTE: if data.data.after is null then this causes us to start
    // from the top on the next getNextImages which is fine.
    Redditp.Urls.after = "&after=" + data.data.after;

    if (data.data.children.length === 0) {
      console.log("No data from this url :(");
      return;
    }

    $.each(data.data.children, function (i, item) {
      var imgUrl = item.data.url;
      var title = item.data.title;
      var over18 = item.data.over_18;
      var commentsUrl = "http://www.reddit.com" + item.data.permalink;
      var goodImageUrl = Redditp.Urls.validateImageUrl(imgUrl);

      if (goodImageUrl !== '') {
        foundOneImage = true;
        addImageSlide(goodImageUrl, title, commentsUrl, over18);
      }
    });

    if (!foundOneImage) {
      console.log("Sorry, no displayable images found in that url :(");
    }

    // show the first image
    if (activeIndex == -1) {
      startAnimation(0);
    }

    if (data.data.after === null) {
      console.log("No more pages to load from this subreddit, reloading the start");

      // Show the user we're starting from the top
      var numberButton = $("<span />").addClass("numberButton").text("-");
      addNumberButton(numberButton);
    }

    loadingNextImages = false;
  };

  var addImageSlide = function (url, title, commentsLink, over18) {
    var pic = {
      "title": title,
      "cssclass": "clouds",
      "image": url,
      "text": "",
      "url": url,
      "urltext": 'View picture',
      "commentsLink": commentsLink,
      "over18": over18
    };

    preLoadImages(pic.url);
    photos.push(pic);

    var i = photos.length - 1;
    var numberButton = $("<a />").html(i + 1)
      .data("index", i)
      .attr("title", photos[i].title)
      .attr("id", "numberButton" + (i + 1));

    if(over18) {
      numberButton.addClass("over18");
    }

    numberButton.bind('click', function () {
      showImage($(this));
    });
    numberButton.addClass("numberButton");
    addNumberButton(numberButton);
  };

  // maybe checkout http://engineeredweb.com/blog/09/12/preloading-images-jquery-and-javascript/ for implementing the old precache
  // Arguments are image paths relative to the current page.
  var preLoadImages = function () {
    var args_len = arguments.length;
    for (var i = args_len; i--;) {
      var cacheImage = document.createElement('img');
      cacheImage.src = arguments[i];
      cache.push(cacheImage);
    }
  };

  // Shows an image and plays the animation
  var showImage = function (docElem) {
    startAnimation(docElem.data('index'));
  };

  var addNumberButton = function (numberButton) {
    var navboxUls = $(".navbox ul");
    var thisNavboxUl = navboxUls[navboxUls.length - 1];

    var newListItem = $("<li />").appendTo(thisNavboxUl);
    numberButton.appendTo(newListItem);

    // so li's have a space between them and can word-wrap in the box
    navboxUls.append(document.createTextNode(' '));
  };

  return {
    init: init,
    prevSlide: prevSlide,
    nextSlide: nextSlide
  };
})();

Redditp.Urls = (function () {
  // @public
  var after = "";

  var goodExtensions = ['.jpg', '.jpeg', '.bmp', '.png'];

  // @public
  var jsonUrl = function () {
    var redditBaseUrl = "http://www.reddit.com";
    var urlData = getRestOfUrl();
    var subredditUrl = urlData[0];
    var getVars = urlData[1];

    if (subredditUrl === "") {
      subredditUrl = "/";
    }

    return redditBaseUrl + subredditUrl + ".json?jsonp=?" + this.after + "&" + getVars;
  };

  // @public
  var validateImageUrl = function (imgUrl) {
    // ignore albums and things that don't seem like image files
    var goodImageUrl = '';
    if (isImageExtension(imgUrl)) {
      goodImageUrl = imgUrl;
    } else {
      goodImageUrl = tryConvertUrl(imgUrl);
    }

    return goodImageUrl;
  };

  var tryConvertUrl = function (url) {
    if (url.indexOf('imgur.com') >= 0) {
      if (url.indexOf('/a/') >= 0) {
        // albums aren't supported yet
        return '';
      }
      // imgur is really nice and serves the image with whatever extension
      // you give it. '.jpg' is arbitrary
      // regexp removes /r/<sub>/ prefix if it exists
      // E.g. http://imgur.com/r/aww/x9q6yW9
      if (url === url.replace(/r\/[^ \/]+\/(\w+)/, '$1')) {
        return '';
      } else {
        return url.replace(/r\/[^ \/]+\/(\w+)/, '$1') + '.jpg';
      }
    }

    return '';
  };

  var isImageExtension = function (url) {
    var dotLocation = url.lastIndexOf('.');
    if (dotLocation < 0) {
      console.log("skipped no dot: " + url);
      return false;
    }
    var extension = url.substring(dotLocation);

    if (goodExtensions.indexOf(extension) >= 0) {
      return true;
    } else {
      return false;
    }
  };

  var decodeUrl = function (url) {
    return decodeURIComponent(url.replace(/\+/g, " "));
  };
  var getRestOfUrl = function () {
    var regexS = "(/(?:(?:r)|(?:user)|(?:domain))/[^&#?]*)[?]?(.*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results === null) {
      return ["", ""];
    } else {
      return [results[1], decodeUrl(results[2])];
    }
  };

  return {
    jsonUrl: jsonUrl,
    validateImageUrl: validateImageUrl,
    after: after
  };
})();