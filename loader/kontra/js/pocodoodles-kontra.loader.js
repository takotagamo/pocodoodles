let pocodoodles = (function() {
    let imageBaseUrl = "image/";

    let exit = () => {};
    let scenes = [];
    let sprites = [];

    function clearArray(a) {
        while (a.length) a.pop();
    }

    function activateScene(sceneName) {
        if (sprites.length > 0) kontra.untrack(sprites);

        clearArray(sprites);

        let scene = scenes.find(i => i.name == sceneName);

        if (scene === undefined) {
            exit(sceneName);

            return;
        }

        let imageUrls = [{ image: scene.bg }]
            .concat(scene.images || [])
            .concat(scene.buttons || [])
            .filter(i => "image" in i)
            .map(i => imageBaseUrl + i.image);

        kontra.load(...imageUrls).then(assets => {
            const findAsset = name => assets.find(i => i.src.endsWith("/" + name))

            let bg = kontra.Sprite({
                x: 0, y: 0,
                image: findAsset(scene.bg)
            });

            clearArray(sprites);
            sprites.push(bg);

            for (let i of scene.images || []) {
                let sprite = kontra.Sprite({
                    x: i.x,
                    y: i.y,
                    image: findAsset(i.image),
                    onUp: !("next" in i)
                        ? () => {}
                        : () => activateScene(i.next)
                })

                kontra.track(sprite);
                sprites.push(sprite);
            }

            for (let i of scene.buttons || []) {
                let partial = "image" in i
                    ? {
                        image: findAsset(i.image)
                    }
                    : {
                        width: i.w,
                        height: i.h,
                        color: "rgba(0,0,0,0)"
                    };

                let sprite = kontra.Sprite({
                    x: i.x,
                    y: i.y,
                    ...partial,
                    onUp: () => activateScene(i.next)
                });

                kontra.track(sprite);
                sprites.push(sprite);
            }


            // if scene has no button
            if (sprites.length <= 1) {
                exit("");
            }
        });
    }

    return {
        setImageBaseUrl(url) {
            imageBaseUrl = url + (url.endsWith("/") ? "" : "/");
        },

        /**
         * @param {object[]|string} script script object or json url
         * @returns {Promise<string>}  returncode is name of next scene in outer world
         */
        start(script) {
            if (typeof script == "string") {
                return fetch(script)
                    .then(data => data.json())
                    .then(i => this.start(i));    
            }

            scenes = script;

            activateScene("start");

            return new Promise((resolve, reject) => {
                let loop = kontra.GameLoop({
                    update: () => sprites.forEach(i => i.update()),
                    render: () => sprites.forEach(i => i.render())
                });

                exit = (scene) => {
                    loop.stop();
                    loop = undefined;
                    exit = () => {};

                    resolve(scene);
                };
                
                loop.start();
        
                kontra.initPointer();    
            });
        }
    };
})();
