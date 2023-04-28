/**
 * enchant.js version
 * 
 * usage:
 * 
 *   pocodoodles.createScenes(game, scenes, script);
 *     game: Core
 *     scenes: extensible table of scenes. they are visible in script
 *     script: parsed json
 *     result: array of scenes
 */


let pocodoodles = {
    imageBaseDir: "image/",

    /** default instance of Core */
    game: null,

    /** default scene table */
    scenes: {},

    imagesFromSceneScript: function(sceneScript) {
        const buttons = (sceneScript.buttons || []).filter(i => "image" in i);
        
        return (sceneScript.images || []).concat(buttons);
    },

    invisibleButtonsFromSceneScript: function(sceneScript) {
        return (sceneScript.buttons || []).filter(i => !("image" in i));
    },

    /**
     * loads scenes
     * 
     * @argument sceneScript: script object | array of script object | url of json
     * @argument scenes: (optional inout) table of scenes. will be modified
     * @argument game: (optional) Core
     * @returns Promise<enchant.Scene>
     */
    load: function(sceneScript, scenes, game) {
        if (Array.isArray(sceneScript)) {
            return Promise.resolve(sceneScript.map(i => this.load(i, scenes, game)));
        }
    
        if (typeof sceneScript == "string") {
            return fetch(sceneScript)
                .then(data => data.json())
                .then(scene => this.load(scene, scenes, game));
        }

        if (scenes === void 0) scenes = pocodoodles.scenes;
        if (!game) game = pocodoodles.game;

        return new Promise((resolve, reject) => {
            let buttons = this.invisibleButtonsFromSceneScript(sceneScript)
                .reverse();
            let images = this.imagesFromSceneScript(sceneScript);
            let allImages = [{ image: sceneScript.bg, x: 0, y: 0}].concat(images);
            let allAssetNames = [sceneScript.bg].concat(images.map(i => i.image))
                    .map(i => this.imageBaseDir + i);

            game.preload(allAssetNames);

            game.addEventListener(enchant.Event.LOAD, () =>{
                let scene = new enchant.Scene();

                scene.on(enchant.Event.TOUCH_END, (e) => {
                    for (let i of buttons) {
                        if (
                            e.x >= i.x && e.x < i.x + i.w && 
                            e.y >= i.y && e.y < i.y + i.h
                        ) {
                            game.pushScene(scenes[i.next]);

                            break;
                        }
                    }
                });

                allImages.forEach(i => {
                    let element = game.assets[this.imageBaseDir + i.image];

                    let sprite = new enchant.Sprite(element.width, element.height);

                    sprite.image = element;
                    sprite.x = i.x;
                    sprite.y = i.y;
                    sprite.visible = true;

                    if ("next" in i) {
                        sprite.on(enchant.Event.TOUCH_END, () => {
                            game.popScene();
                            game.pushScene(scenes[i.next]);
                        });
                    }

                    scene.addChild(sprite);
                });

                scenes[sceneScript.name] = scene;

                resolve(scene);
            });
        });
    }
}