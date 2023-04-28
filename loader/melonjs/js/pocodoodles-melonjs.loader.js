
let pocodoodles = (function() {
    /**
     * asset url = melonJS's baseUrl + pocodoodles's baseUrl + fileName
     */
    let baseUrl = "image/";

    let stages = {};

    /**
     * used when returns to external stages.  
     * state becomes externalCompatibleState and stage is any of externalCompatibleStages.  
     * every stage for state will be changed to any of externalStagesByState.
     */
    let externalCompatibleState = me.state.DEFAULT;
    let externalCompatibleStages = {};
    // can not contain me.state.LOADING
    let externalStageByState = {};

    const changeStage = function(name) {
        if (name in stages) {
            // internal
            me.state.change(me.state.LOADING, true);
            me.state.set(me.state.DEFAULT, stages[name]);
            me.state.change(me.state.DEFAULT, true);
        } else if (name in externalCompatibleStages) {
            // external
            me.state.change(me.state.LOADING, true);

            const stageByState = externalStageByState;
            const targetState = externalCompatibleState;
            const targetStage = externalCompatibleStages[name];

            externalStageByState = {};
            externalCompatibleStages = {};
            externalCompatibleState = me.state.DEFAULT;

            for (let state in stageByState) {
                me.state.set(state, stageByState[state]);
            }

            me.state.set(targetState, targetStage);

            me.state.change(targetState, true);
        }
    }

    const resName = function(name) {
        return me.utils.file.getBasename(name);
    }

    // resource name is basename of file. it is a bug of melonJS about unbalanced sanitization.
    const getImage = function(name) {
        return me.loader.getImage(resName(name));
    }

    const loadImage = function(src) {
        return new Promise((resolve, reject) => {
                me.loader.load({
                    type: "image",
                    name: resName(src),
                    src: baseUrl + src
                }, function() {
                    resolve(this)
                }, reject)
            });
    }

    const loadImageForArea = function(script) {
        return !("image" in script) || getImage(script.image) !== null
            ? Promise.resolve(getImage(script.image))
            : loadImage(script.image);
    }

    const pocodoodles_Background = me.GUI_Object.extend({
        init: function(bgImage) {
            const img = getImage(bgImage);

            const options = {
                image: resName(bgImage),
                framewidth: img.width,
                frameheight: img.height
            }

            this._super(me.GUI_Object, "init", [0, 0, options]);

            this.anchorPoint.set(0, 0);
            this.areas = [];
        },

        /**
         * @param pair { script: pocodoodles_AreaScript, entity: Sprite }
         */
        addArea: function(pair) {
            if ("next" in pair.script) this.areas.push(pair);
        },

        onRelease: function() {
            for (let i of this.areas) {
                if (i.entity.contains(me.input.pointer)) changeStage(i.script.next);
            }

            return false;
        }
    });

    /**
     * if script should be sprite, this method adds sprite to me.game.world
     * @returns Promise<me.Sprite | me.Rect>
     */
    const createArea = function(script) {
        if ("image" in script) {
            return loadImageForArea(script)
                .then(img => {
                    const sprite = new me.Sprite(script.x, script.y, {
                        image: img,
                        framewidth: img.width,
                        frameheight: img.height
                    });

                    sprite.anchorPoint.set(0, 0)

                    me.game.world.addChild(sprite);

                    return sprite;
                });
        } else {
            return Promise.resolve(new me.Rect(script.x, script.y, script.w, script.h));
        }
    }

    const pocodoodles_Stage = me.Stage.extend({
        init: function(script) {
            this._super(me.Stage, "init", []);

            this.script = script;
        },

        onResetEvent: function(bg) {
            const script = this.script;

            loadImage(script.bg)
            .then(img => {
                const bg = new pocodoodles_Background(script.bg);
                const areas = (script.images || []).concat(script.buttons || []);

                let z = 0;

                me.game.world.addChild(bg, z++);

                return Promise.all(areas.map(i => {
                        return createArea(i, z++)
                            .then(j => {
                                bg.addArea({ script: i, entity: j });
                            });
                    }));
            });
        }
    });


    const createStages = function(script) {
        return script.map(i => {
            stages[i.name] = new pocodoodles_Stage(i);
        });
    }


    return {
        setBaseURL: function(url) {
            baseUrl = url;
        },

        /**
         * @param stateToStage mapping(stateId -> stage) for click adventure.
         * @param externalStates mapping(stateId -> stage). when exited, every stage assigned to state.
         * @param exitState when exited from click adventure, state will be this value.
         * @param externalStages when exited, stage will be any of this value.
         */
        start: function(jsonUrl, stateToStage, externalStates, exitState, externalStages) {
            fetch(jsonUrl)
            .then(data => data.json())
            .then(script => {
                externalStageByState = externalStates || {};
                externalCompatibleStages = externalStages || {};
                externalCompatibleState = exitState || me.state.DEFAULT;

                for (let state in stateToStage) {
                    me.state.set(state, stateToStage[state]);
                }


                createStages(script);

                changeStage("start");
            });
        }
    }
})();
