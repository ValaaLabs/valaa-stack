() => {
  const PIXI = this.PIXI[Media.immediateContent]({ mime: "application/javascript" });
  console.info(PIXI);

  /////////////////////////////////
  // DOUBLE-INITIALIZATION GUARD //
  /////////////////////////////////
  const containerDiv = document.getElementById("canvas_goes_here");
  if (containerDiv.childNodes.length > 0) {
    window.alert("TODO: handle the case where the user is initializing PIXI stuff multiple times");
    return;
  }

  ////////////////////////
  // SETUP DOM ELEMENTS //
  ////////////////////////
  const renderer = PIXI.autoDetectRenderer(704, 352,
    { antialias: false, transparent: false, resolution: 1 });
  containerDiv.appendChild(renderer.view);

  ///////////////////////////
  // MAIN RENDER CODE HERE //
  ///////////////////////////
  const loadProgressHandler = resource => console.log("loaded", resource);
  const setup = () => {
    console.log("setup()");

    // Grab the json data
    const json_string = this["spritesheet.json"][Media.immediateContent]({ mime: "text/plain" });
    const json_data = JSON.parse(json_string);
    
    // Assign aliases to PIXI loader resources
    const image_data = PIXI.loader.resources["spritesheet.png"];

    // Debug resources
    console.log("  image_data: ", image_data);
    console.log("  json_data:  ", json_data);

    //
    // This block does the work that PIXI would normally do automatically
    // when you requested its loader to load a spritesheet JSON file, but
    // since we loaded our JSON using ValaaScript instead, we must explicitly
    // create the spritesheet and request it to parse its JSON-fed data
    //
    const spritesheet = new PIXI.Spritesheet(
        image_data.texture.baseTexture,
        json_data,
        image_data.url);
    spritesheet.parse(() => console.log("spritesheet parsed!"));
    console.log("  spritesheet:", spritesheet);
    //
    // Block end
    //

    // Find the animation frames
    const frames = [
        spritesheet.textures["frame_0.png"],
        spritesheet.textures["frame_1.png"],
        spritesheet.textures["frame_2.png"],
        spritesheet.textures["frame_3.png"]];
    console.log("  frames:", frames);
        
    // Create the animated sprite
    const sprite = new PIXI.extras.AnimatedSprite(frames);
    sprite.animationSpeed = 0.1;
    sprite.position.set(128, 128);
    sprite.play();
    
    // Draw the sprite
    const stage = new PIXI.Container();
    stage.addChild(sprite);

    const update = () => {
      renderer.render(stage);
    };
  
    // Auto-tick
    console.info("  starting the ticker");
    PIXI.ticker.shared.add(update);
    PIXI.ticker.shared.start();
  };


  //////////////////////
  // RESOURCE LOADING //
  //////////////////////

  const needsLoading = [];
  // Don't load the texture atlas image multiple times
  if (!PIXI.loader.resources["spritesheet.png"]) {
    console.log("spritesheet.png hasn't been loaded yet");
    needsLoading.push("spritesheet.png");
  }

  // Don't load the texture atlas json here, because PIXI won't be able to handle
  // image and json on different origins from each other
  // if (!PIXI.loader.resources["spritesheet.json"]) {
  //   console.log("spritesheet.json hasn't been loaded yet");
  //   needsLoading.push("spritesheet.json");
  // }
  
  // Source 1 for the options below:
  //   https://github.com/englercj/resource-loader/blob/master/src/Resource.js
  //   ctrl+f "LOAD_TYPE"
  //   ctrl+f "XHR_RESPONSE_TYPE"
  //
  // Source 2 for the options below:
  //   https://stackoverflow.com/questions/35747209/pixi-js-png-image-resource-is-not-loaded-as-image-texture-mime-type-set-but

  const loadImageOptions = {
    loadType: PIXI.loaders.Resource.LOAD_TYPE.IMAGE,
    xhrType:  PIXI.loaders.Resource.XHR_RESPONSE_TYPE.BLOB,
  };

  const loadJsonOptions = {
    loadType: PIXI.loaders.Resource.LOAD_TYPE.XHR,
    xhrType:  PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON,
  };

  // IF we have resources that need loading THEN
  if (needsLoading.length) {
    const urls = [];

    // 1) Request all their URLS
    for (let i=0; i < needsLoading.length; i++) {
      const propertyName = needsLoading[i];
      urls.push(this[propertyName][Media.getURL]());
    }

    // 2) Accumulate their promised responses, and trigger next step when they all resolve
    Promise.all(urls).then(results => {
      // 3) Add each resolved URL to the loader
      for (let i=0; i < results.length; i++) {
        let options;
        if (needsLoading[i].indexOf(".json") !== -1) {
          options = loadJsonOptions;
        } else {
          options = loadImageOptions;
        }
        PIXI.loader.add(needsLoading[i], results[i], options);
      }

      // 4) Set load progress function and load completion function (render)
      PIXI.loader.on("progress", loadProgressHandler);
      PIXI.loader.load(setup);
    });
  } else {
    // ELSE we have no resources that need loading, immediately call render
    setup();
  }
};