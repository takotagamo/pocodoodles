import Game from "./tin-engine/core/game.es6";
import graphics from "./tin-engine/core/graphic.es6";
import mouse from "./tin-engine/core/mouse.es6";
import V2 from "./tin-engine/geo/v2.es6";
import Entity from "./tin-engine/basic/entity.es6";
import ImageEntity from "./tin-engine/basic/image.es6";
import Scene from "./tin-engine/lib/scene.es6";


export let pocodoodles = {
    imageBaseUrl: "image/",
    game: null,
    scenes: {},

    assetUrl(name) {
        return this.imageBaseUrl + name;
    },

    loadAssets(images) {
        return new Promise((resolve) => {
            for (let image of images) {
                graphics.add(this.assetUrl(image));
            }

            graphics.load(function() {
                resolve(this);
            });
        });
    },

    init(w, h) {
        this.game = new Game({
            screen: { w: w, h: h }
        });
    },

    loadScenes(script) {
        return Promise.all(script.map(i => ScriptedScene.loadScene(i, this)));
    },

    /** for any other tin scene */
    start() {
        this.game.goto(this.scenes["start"]);
    },

    /** for standalone use */
    run() {
        mouse.init(this.game);
        this.game.run(this.scenes["start"]);
    }
}

export class ImageButton extends ImageEntity {
    constructor(script, env) {
        env = env || pocodoodles;
        super(new V2(script.x, script.y), env.assetUrl(script.image));

        this.env = env;
        this.next = "next" in script ? script.next : null;
    }

    onMouseUp(pos) {
        if (this.next) this.env.game.goto(this.env.scenes[this.next]);

        return true;
    }
}

class Button extends Entity {
    constructor(script, env) {
        env = env || pocodoodles;
        super(new V2(script.x, script.y), new V2(script.w, script.h));

        this.env = env;
        this.next = "next" in script ? script.next : null;
    }

    onMouseUp(pos) {
        if (this.next)  this.env.game.goto(this.env.scenes[this.next]);
        
        return true;
    }
}

export class ScriptedScene extends Scene {
    /**
     * do not instantiate directry
     */
    constructor(bg, areas, env) {
        super();

        this.bg = bg;

        for (let i of areas) this.add(i);
    }

    static loadScene(script, env) {
        env = env || pocodoodles;

        const imageButtons = (script.buttons || []).filter(i => "image" in i);
        const images = (script.images || []).concat(imageButtons);
        const buttons = (script.buttons || []).filter(i => !("image" in i));
        const imageUrls = [script.bg].concat(images.map(i => i.image));

        return env.loadAssets(imageUrls)
            .then(() => {
                const bg = env.assetUrl(script.bg);
                let areas = [];

                for (let i of images) areas.push(new ImageButton(i, env));
                for (let i of buttons) areas.push(new Button(i, env));

                let scene = new ScriptedScene(bg, areas, env);

                env.scenes[script.name] = scene;

                return scene;
            });
    }
}
