() => {
  const PIXI = this.PIXI[Media.immediateContent]({ mime: "application/javascript" });

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
  const render = () => {
    console.log("render()");

    // Debug resources
    console.log("  tileset_image:", PIXI.loader.resources.tileset_image);
    console.log("  tileset_json: ", PIXI.loader.resources.tileset_json);
    console.log("  tilemap_json: ", PIXI.loader.resources.tilemap_json);

    // Assign aliases
    const tileset_image = PIXI.loader.resources.tileset_image.texture;
    const tileset_json  = PIXI.loader.resources.tileset_json.data;
    const tilemap_json  = PIXI.loader.resources.tilemap_json.data;

    //
    // Tile extraction function
    //
    const tiles = [];
    const extractTiles = () => {
      const width  = tileset_json.tilewidth;
      const height = tileset_json.tileheight;
      for (let id = 0; id < tileset_json.tilecount; id++) {
        const tile = new PIXI.Texture(tileset_image.baseTexture);
        const x = (id % tileset_json.columns)
        const y = Math.floor(id / tileset_json.columns);

        tile.frame = new PIXI.Rectangle(x * width, y * height, width, height);
        tiles[id] = tile;
      }
    }

    //
    // Tile drawing function
    //
    const drawTile = (layer, gid, x, y) => {
      // Tiled starts counting EXISTING tiles from 1, reserving 0 to mean 'no tile'
      if (gid === 0) return;
      const id = gid - 1;
          
      // Creates and position the new sprite onto the given layer
      const tile = new PIXI.Sprite(tiles[id]);
      tile.position.set(x * tileset_json.tilewidth, y * tileset_json.tileheight);
      layer.addChild(tile);
    };

    //
    // Layer drawing function
    // returns layer
    //
    const drawLayer = (layer_json) => {
      console.log("Data:", layer_json);
      const layer = new PIXI.Container();
      for (let y=0; y < layer_json.height; y++) {
        for (let x=0; x < layer_json.width; x++) {
          const index = y * layer_json.width + x;
          drawTile(layer, layer_json.data[index], x, y);
        }
      }
      return layer;
    };

    // Draw the map
    const stage = new PIXI.Container();

    extractTiles();
    for (let l=0; l < tilemap_json.layers.length; l++) {
      console.log("Layer #" + l);
      stage.addChild(drawLayer(tilemap_json.layers[l]));
    };

    // Render the scene
    renderer.render(stage);
  };

  //////////////////////
  // RESOURCE LOADING //
  //////////////////////

  const needsLoading = [];
  // Don't load the tileset image multiple times
  if (!PIXI.loader.resources.tileset_image) {
    console.log("tileset_image hasn't been loaded yet");
    needsLoading.push("tileset_image");
  }

  // Don't load the tileset json multiple times
  if (!PIXI.loader.resources.tileset_json) {
    console.log("tileset_json hasn't been loaded yet");
    needsLoading.push("tileset_json");
  }

  // Don't load the tilemap json multiple times
  if (!PIXI.loader.resources.tilemap_json) {
    console.log("tilemap_json hasn't been loaded yet");
    needsLoading.push("tilemap_json");
  }

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
        if (needsLoading[i].indexOf("_json") !== -1) {
          options = loadJsonOptions;
        } else {
          options = loadImageOptions;
        }
        PIXI.loader.add(needsLoading[i], results[i], options);
      }

      // 4) Set load progress function and load completion function (render)
      PIXI.loader.on("progress", loadProgressHandler);
      PIXI.loader.load(render);
    });
  } else {
    // ELSE we have no resources that need loading, immediately call render
    render();
  }
};