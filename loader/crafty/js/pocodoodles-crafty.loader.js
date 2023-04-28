
let pocodoodles = {
    imageBaseUrl: "image/",

    type: "Canvas",

    initialized: false,

    initComponents() {
        if (this.initialized) return;

        Crafty.c("Pocodoodles.Bg", {
            init: function() {
                this.requires("2D", "Image");
    
                this.image(pocodoodles.imageBaseUrl + this.script.bg);
                this.x = 0;
                this.y = 0;
            }
        });
    
        Crafty.c("Pocodoodles.Area", {
            init: function() {
                let components = ["2D"];
    
                if ("image" in this.script) {
                    components.push("Image");
                } else {
                    // components.push("Color");
                }
                if ("next" in this.script) components.push("Mouse");
    
                this.requires(components.join(","));
    
                this.x = this.script.x;
                this.y = this.script.y;
    
                if ("image" in this.script) {
                    this.image(imageBaseUrl + this.script.image);
                } else {
                    this.w = this.script.w;
                    this.h = this.script.h;
    
                    // this.color("rgba(0,0,0,0)");
                }
    
                if ("next" in this.script) {
                    this.bind("MouseUp", function() {
                        Crafty.scene(this.script.next);
                    });
                }
            }
        });

        this.initialized = true;
    },

    /** scenes: url of json | parsed json */
    load(scenes) {
        if (typeof scenes == "string") {
            return fetch(scenes)
                .then(data => data.json())
                .then(scenes => {
                    this.load(scenes);
                });
        }

        this.initComponents();

        for (let scene of scenes) {
            Crafty.scene(scene.name, function() {
                const areas = (scene.images || []).concat(scene.buttons || [])

                Crafty.e(pocodoodles.type)
                    .attr({ script: scene })
                    .addComponent("Pocodoodles.Bg");

                for (let i = 0; i < areas.length; ++i) {
                    Crafty.e(pocodoodles.type)
                        .attr({ script: areas[i], z: i })
                        .addComponent("Pocodoodles.Area");
                }
            });
        }

        return Promise.resolve();
    }
}
