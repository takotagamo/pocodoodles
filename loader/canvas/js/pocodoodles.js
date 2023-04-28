"use strict";
var Pocodoodle;
(function (Pocodoodle) {
    function saturate(i, min, max) {
        return i <= min ?
            min :
            i >= max ?
                max :
                i;
    }
    Pocodoodle.saturate = saturate;
    function objectEqual(o1, o2) {
        return objectEqualWithMemo(o1, o2);
    }
    Pocodoodle.objectEqual = objectEqual;
    // memo1+memo2: 仮想のDictionary<o1, List<o2>>
    // memo1: o1。keys。
    // memo2: o1と一致したo2。values。
    function objectEqualWithMemo(o1, o2, memo1 = [], memo2 = []) {
        if (o1 === o2)
            return true;
        let memoIdx = memo1.indexOf(o1);
        if (memoIdx == -1) {
            memo1.push(o1);
            memo2.push([]);
            memoIdx = memo1.indexOf(o1);
        }
        let memoForO1 = memo2[memoIdx];
        if (memoForO1.indexOf(o2) != -1)
            return true;
        memoForO1.push(o2);
        let r = true;
        for (let key in o1)
            if (!(key in o2) ||
                o1[key] != o2[key] ||
                typeof o1[key] == "object" &&
                    objectEqualWithMemo(o1[key], o2[key], memo1, memo2)) {
                r = false;
                break;
            }
        return r;
    }
    function zip(f, x, y) {
        let len = Math.min(x.length, y.length);
        let r = new Array(len);
        let i;
        for (i = 0; i < len; ++i) {
            r[i] = f(x[i], y[i]);
        }
        return r;
    }
    Pocodoodle.zip = zip;
    function makeObject(factory) {
        return new Promise((resolve, reject) => {
            try {
                resolve(factory());
            }
            catch (e) {
                reject(e);
            }
        });
    }
    Pocodoodle.makeObject = makeObject;
    function pointInRect(p, pR0, pR1) {
        return saturate(p.x, pR0.x, pR1.x - 1) == p.x &&
            saturate(p.y, pR0.y, pR1.y - 1) == p.y;
    }
    Pocodoodle.pointInRect = pointInRect;
    Pocodoodle.DIRECTION_NONE = { x: 0, y: 0 };
    Pocodoodle.DIRECTION_LEFT = { x: -1, y: 0 };
    Pocodoodle.DIRECTION_RIGHT = { x: 1, y: 0 };
    Pocodoodle.DIRECTION_UP = { x: 0, y: -1 };
    Pocodoodle.DIRECTION_DOWN = { x: 0, y: 1 };
    function lazy(generator) {
        return new Promise((resolve, reject) => {
            resolve(generator);
        });
    }
    Pocodoodle.lazy = lazy;
})(Pocodoodle || (Pocodoodle = {}));
/// <reference path="./misc.ts" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var Pocodoodle;
(function (Pocodoodle) {
    // 全体のイベント発生周期
    Pocodoodle.unit_timeout = 50;
    Pocodoodle.minInterval = 100;
    Pocodoodle.maxInterval = 10000;
    function wait(timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            }, timeout);
        });
    }
    Pocodoodle.wait = wait;
    function getElementById(id, error) {
        const elm = document.getElementById(id);
        if (elm == null) {
            if (typeof error == "undefined") {
                error = "failed to get element " + id;
            }
            throw error;
        }
        return elm;
    }
    Pocodoodle.getElementById = getElementById;
    function loadImage(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let elm = document.createElement("img");
                if (elm == null)
                    reject("failed to crerate image element");
                elm.onload = () => resolve(elm);
                elm.src = "./image/" + uri;
            }).then(elm => {
                elm.width = elm.naturalWidth;
                elm.height = elm.naturalHeight;
                return elm;
            });
        });
    }
    Pocodoodle.loadImage = loadImage;
    function getImageElementById(id, size, error) {
        return __awaiter(this, void 0, void 0, function* () {
            let elm;
            try {
                elm = getElementById(id);
            }
            catch (e) {
                elm = yield loadImage(id);
            }
            if (typeof size != "undefined" &&
                !Pocodoodle.objectEqual(size, { w: elm.width, h: elm.height })) {
                if (typeof error == "undefined") {
                    error = "image element has different size to required";
                }
                throw error;
            }
            return elm;
        });
    }
    Pocodoodle.getImageElementById = getImageElementById;
    Pocodoodle.MODKEY_NONE = 0;
    Pocodoodle.MODKEY_ALT = 1;
    Pocodoodle.MODKEY_CTRL = 2;
    Pocodoodle.MODKEY_SHIFT = 4;
    Pocodoodle.MODKEY_META = 8;
    class Scene {
        oninit(tickets) { return true; }
        onexit() { }
        onstart(tickets) { }
        onstop(tickets) { }
        onkeydown(tickets, key, modkeys, d) { }
        onkeyup(tickets, key, modkeys, d) { }
        onmousedown(tickets, mousePoint, buttons) { }
        onmousemove(tickets, mousePoint, buttons) { }
        onmouseup(tickets, mousePoint, buttons) { }
        onpaint(tickets) { }
        constructor(target, name) {
            this.target = target;
            this.name = name;
            this.initialized = false;
            this.exited = false;
        }
        ;
        static fixTimeout(interval) {
            let max = Math.floor(Pocodoodle.maxInterval / Pocodoodle.minInterval);
            let interval2 = Pocodoodle.saturate(Math.floor(interval), 1, max);
            let timeout = Pocodoodle.saturate(interval - 1, 0, max);
            return {
                interval: interval2,
                timeout: timeout
            };
        }
        invokeStart(tickets) {
            if (this.exited)
                return;
            if (!this.initialized) {
                if (!this.oninit(tickets)) {
                    this.exited = true;
                    return;
                }
                this.initialized = true;
            }
            this.onstart(tickets);
        }
        invokeStop(tickets) {
            if (this.exited)
                return;
            this.onstop(tickets);
        }
        invokeKeydown(tickets, key, modkeys, d) {
            if (this.exited)
                return;
            this.onkeydown(tickets, key, modkeys, d);
        }
        invokeKeyup(tickets, key, modkeys, d) {
            if (this.exited)
                return;
            this.onkeyup(tickets, key, modkeys, d);
        }
        invokeMousedown(tickets, point, buttons) {
            if (this.exited)
                return;
            this.onmousedown(tickets, point, buttons);
        }
        invokeMouseup(tickets, point, buttons) {
            if (this.exited)
                return;
            this.onmouseup(tickets, point, buttons);
        }
        invokeMousepress(tickets, point, buttons) {
            if (this.exited)
                return;
            this.onmousemove(tickets, point, buttons);
        }
        invokeExit() {
            if (!this.exited && this.initialized) {
                this.onexit();
                this.exited = true;
            }
        }
        invokePaint(tickets) {
            this.onpaint(tickets);
        }
    }
    Pocodoodle.Scene = Scene;
    // バレルプロセッサによる疑似スレッド
    class EventManager {
        constructor(target = null, paintInterval = Pocodoodle.minInterval) {
            this.target = target;
            this.paintInterval = paintInterval;
            this.scenes = {};
            this.currentSceneName = "";
            this.currentScene = undefined;
            this.running = false;
            this.keystat = "keyup";
            this.mousestat = "mouseup";
            this.key = "";
            this.modkeys = Pocodoodle.MODKEY_NONE;
            this.buttons = 0;
            this.buttonPoint = { x: -1, y: -1 };
            this.d = Pocodoodle.DIRECTION_NONE;
            this.handle = 0;
            if (target == null)
                target = document.body;
            target.addEventListener("keydown", e => {
                if (this.keystat != "keyup")
                    return;
                this.keystat = "keydown";
                this.key = e.key;
                this.modkeys = Pocodoodle.MODKEY_NONE;
                if (e.altKey)
                    this.modkeys |= Pocodoodle.MODKEY_ALT;
                if (e.ctrlKey)
                    this.modkeys |= Pocodoodle.MODKEY_CTRL;
                if (e.shiftKey)
                    this.modkeys |= Pocodoodle.MODKEY_SHIFT;
                if (e.metaKey)
                    this.modkeys |= Pocodoodle.MODKEY_META;
                switch (this.key) {
                    case "ArrowLeft":
                        this.d = Pocodoodle.DIRECTION_LEFT;
                        break;
                    case "ArrowRight":
                        this.d = Pocodoodle.DIRECTION_RIGHT;
                        break;
                    case "ArrowUp":
                        this.d = Pocodoodle.DIRECTION_UP;
                        break;
                    case "ArrowDown":
                        this.d = Pocodoodle.DIRECTION_DOWN;
                        break;
                    default:
                        return;
                }
            });
            target.addEventListener("keyup", _ => {
                this.keystat = "keyup";
                if (typeof this.currentScene == "undefined")
                    return;
                this.currentScene.invokeKeyup(this, this.key, this.modkeys, this.d);
            });
            target.addEventListener("mousedown", e => {
                if (this.mousestat != "mouseup")
                    return;
                this.mousestat = "mousedown";
                this.buttonPoint = { x: e.clientX, y: e.clientY };
                this.buttons = e.buttons;
                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokeMousedown(this, this.buttonPoint, this.buttons);
            });
            target.addEventListener("mousemove", e => {
                if (this.mousestat != "mousedown")
                    return;
                this.buttonPoint = { x: e.clientX, y: e.clientY };
                this.buttons = e.buttons;
                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokeMousepress(this, this.buttonPoint, this.buttons);
            });
            target.addEventListener("mouseup", _ => {
                if (this.mousestat != "mousedown")
                    return;
                this.mousestat = "mouseup";
                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokeMouseup(this, this.buttonPoint, this.buttons);
            });
            window.setInterval(() => {
                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokePaint(this);
            }, this.paintInterval);
        }
        addScene(scene) {
            if (scene.name in this.scenes)
                return false;
            this.scenes[scene.name] = scene;
            return true;
        }
        ;
        // Tickets
        stop() {
            if (this.handle != 0)
                window.clearInterval(this.handle);
            this.running = false;
            if (typeof this.currentScene != "undefined")
                this.currentScene.invokeExit();
        }
        exit() { this.stop(); }
        changeScene(sceneName) {
            if (typeof this.currentScene != "undefined")
                this.currentScene.invokeStop(this);
            if (!(sceneName in this.scenes)) {
                console.log("error: scene " + sceneName + " is not registered");
                return false;
            }
            if (this.currentSceneName == sceneName) {
                console.log("warrning: claimed to change scene to itself");
                return false;
            }
            if (typeof this.currentScene != "undefined")
                this.currentScene.invokeStop(this);
            this.currentSceneName = sceneName;
            this.currentScene = this.scenes[sceneName];
            this.currentScene.invokeStart(this);
            return true;
        }
        // 中断時に終了処理が要る場合はstopから呼び出せる。
        loop(sceneName) {
            if (this.running)
                return this;
            this.changeScene(sceneName);
            this.running = true;
            return this;
        }
    }
    Pocodoodle.EventManager = EventManager;
})(Pocodoodle || (Pocodoodle = {}));
/// <reference path="./dom_misc.ts" />
var Pocodoodle;
(function (Pocodoodle) {
    ;
    class GameScene extends Pocodoodle.Scene {
        constructor(body, name, bgColor = "black", defaultInterval = Pocodoodle.minInterval) {
            super(body, name);
            this.body = body;
            this.bgColor = bgColor;
            this.defaultInterval = defaultInterval;
            this.paintQueue = [];
            this.paintables = [];
            this.paintableButtons = [];
            this.buttons = [];
            this.onpaint = (tickets) => {
                let queue = this.paintables.
                    concat(this.paintQueue).
                    concat(this.paintableButtons);
                if (queue.length == 0)
                    return true;
                let ctx = this.cv.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = this.bgColor;
                    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                    ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
                    ctx.fill();
                    for (let i = 0; i < queue.length; ++i) {
                        let req = queue[i];
                        if (typeof req.image != "undefined")
                            ctx.drawImage(req.image, req.x, req.y);
                    }
                    this.paintQueue = [];
                }
                return true;
            };
            this.cv = Pocodoodle.getElementById("cv_main");
        }
        static createGameScene(body, name, canvasSize, bg, bgColor, defaultInterval) {
            return __awaiter(this, void 0, void 0, function* () {
                let scene = new GameScene(body, name, bgColor, defaultInterval);
                scene.cv.width = canvasSize.w;
                scene.cv.height = canvasSize.h;
                scene.bg = typeof bg == "string" ?
                    yield Pocodoodle.getImageElementById(bg) :
                    bg;
                if (typeof scene.bg != "undefined") {
                    scene.cv.width = scene.bg.width;
                    scene.cv.height = scene.bg.height;
                    scene.addImage({
                        image: scene.bg,
                        x: 0, y: 0
                    });
                }
                return scene;
            });
        }
        onstart(tickets) {
            this.onpaint(tickets);
        }
        onmouseup(tickets, p, buttons) {
            if (this.buttons.length == 0)
                return true;
            for (let i = this.buttons.length; 0 < i;) {
                let req = this.buttons[--i];
                if (Pocodoodle.pointInRect(p, req, { x: req.x + req.w,
                    y: req.y + req.h })) {
                    if (typeof req.listener != "undefined")
                        req.listener(tickets);
                    if (req.nextName != "") {
                        tickets.changeScene(req.nextName);
                        return;
                    }
                    return;
                }
            }
            return true;
        }
        paint(req) {
            this.paintQueue.push(req);
        }
        addImage(req) {
            this.paintables.push(req);
        }
        addButton(req) {
            this.buttons.push(req);
        }
        addPaintableButton(req) {
            this.paintableButtons.push(req);
            this.buttons.push(req);
        }
        get canvasSize() {
            return { w: this.canvasWidth, h: this.canvasHeight };
        }
        get canvasWidth() {
            return this.cv.width;
        }
        get canvasHeight() {
            return this.cv.height;
        }
        static getCanvasSizeFromScript(script) {
            return __awaiter(this, void 0, void 0, function* () {
                if (typeof script.size != "undefined")
                    return script.size;
                if (typeof script.bg != "undefined") {
                    try {
                        let img = yield Pocodoodle.getImageElementById(script.bg);
                        return { w: img.width, h: img.height };
                    }
                    catch (_) {
                    }
                }
                return undefined;
            });
        }
        static fromScript(body, script, interval = Pocodoodle.minInterval) {
            return __awaiter(this, void 0, void 0, function* () {
                let canvasSize = yield GameScene.getCanvasSizeFromScript(script);
                if (typeof canvasSize == "undefined") {
                    console.log("bad script", script);
                    throw "error";
                }
                let scene = yield GameScene.
                    createGameScene(body, script.name, canvasSize, script.bg, script.bgColor, interval);
                if (typeof script.images != "undefined") {
                    for (let i = 0; i < script.images.length; ++i) {
                        let img = script.images[i];
                        scene.addImage(yield Paintable.
                            createPaintable(scene, img.image, img.x, img.y));
                    }
                }
                if (typeof script.buttons != "undefined") {
                    for (let i = 0; i < script.buttons.length; ++i) {
                        let btn = script.buttons[i];
                        if (typeof btn.image != "undefined") {
                            btn = btn;
                            scene.addPaintableButton(yield PaintableButton.
                                createPaintableButton(scene, btn.image, btn.x, btn.y, btn.next));
                        }
                        else {
                            btn = btn;
                            scene.addButton(new InvisibleButton(scene, btn.x, btn.y, btn.w, btn.h, btn.next));
                        }
                    }
                }
                return scene;
            });
        }
    }
    Pocodoodle.GameScene = GameScene;
    class Paintable {
        constructor(game, _x = 0, _y = 0) {
            this.game = game;
            this._x = _x;
            this._y = _y;
        }
        static createPaintable(game, image, _x = 0, _y = 0) {
            return __awaiter(this, void 0, void 0, function* () {
                let scene = new Paintable(game, _x, _y);
                return scene.init(image);
            });
        }
        init(image) {
            return __awaiter(this, void 0, void 0, function* () {
                this._image = typeof image == "string" ?
                    yield Pocodoodle.getImageElementById(image) :
                    image;
                return this;
            });
        }
        get image() { return this._image; }
        get x() { return this._x; }
        get y() { return this._y; }
        set x(x2) { this._x = this.saturateX(x2); }
        set y(y2) { this._y = this.saturateY(y2); }
        get canvasWidth() {
            return this.game.canvasWidth;
        }
        get canvasHeight() {
            return this.game.canvasHeight;
        }
        get point() {
            return { x: this.x, y: this.y };
        }
        moveTo(x, y) {
            if (typeof y == "undefined") {
                let p = x;
                x = p.x;
                y = p.y;
            }
            else
                x = x;
            this.x = x;
            this.y = y;
        }
        get width() {
            return typeof this.image != "undefined" ? this.image.width : 0;
        }
        get height() {
            return typeof this.image != "undefined" ? this.image.height : 0;
        }
        get maxX() {
            return this.canvasWidth - this.width;
        }
        get maxY() {
            return this.canvasHeight - this.height;
        }
        saturateX(x) {
            return Pocodoodle.saturate(x, 0, this.maxX);
        }
        saturateY(y) {
            return Pocodoodle.saturate(y, 0, this.maxY);
        }
        saturatePxPoint(p) {
            return {
                x: this.saturateX(p.x),
                y: this.saturateY(p.y)
            };
        }
        validateX(x) {
            return this.saturateX(x) == x;
        }
        validateY(y) {
            return this.saturateY(y) == y;
        }
        validatePxPoint(p) {
            return this.validateX(p.x) && this.validateY(p.y);
        }
    }
    Pocodoodle.Paintable = Paintable;
    class InvisibleButton {
        constructor(game, x = 0, y = 0, w = 0, h = 0, nextName, listener) {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.nextName = nextName;
            this.listener = undefined;
            if (typeof listener != "undefined")
                this.listener = listener;
        }
    }
    Pocodoodle.InvisibleButton = InvisibleButton;
    class PaintableButton extends Paintable {
        constructor(game, _x = 0, _y = 0, nextName, listener) {
            super(game, _x, _y);
            this.nextName = nextName;
            this.listener = undefined;
            if (typeof listener != "undefined")
                this.listener = listener;
        }
        static createPaintableButton(game, image, _x = 0, _y = 0, nextName, listener) {
            return __awaiter(this, void 0, void 0, function* () {
                let btn = new PaintableButton(game, _x, _y, nextName, listener);
                btn.init(image);
                return btn;
            });
        }
        get w() {
            return typeof this.image != "undefined" ? this.image.width : 0;
        }
        get h() {
            return typeof this.image != "undefined" ? this.image.height : 0;
        }
    }
    Pocodoodle.PaintableButton = PaintableButton;
})(Pocodoodle || (Pocodoodle = {}));
/* HTML側に要求するもの
cv_main: canvas。
btn_halt: 省略可。中断ボタン。
*/
/// <reference path="./game.ts" />
var Main;
(function (Main) {
    const config = {
        paintInterval: 5000
    };
    // how to fetch local files?
    function load(uri) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", uri, true);
        xhr.send();
        return xhr.responseText;
    }
    function init(script) {
        return new Promise((resolve, reject) => {
            window.setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (typeof script == "undefined") {
                        // not done
                        const srcElm = document.getElementById("scenes");
                        if (srcElm == null)
                            throw 'element "scenes" is not found';
                        script = srcElm.innerText; // load(srcElm.src);
                    }
                    if (typeof script == "string")
                        script = JSON.parse(script);
                    const events = new Pocodoodle.EventManager(document.body, config.paintInterval);
                    for (let i = 0; i < script.length; ++i) {
                        let sceneScript = script[i];
                        if (typeof sceneScript.name == "undefined" ||
                            typeof sceneScript.bg == "undefined")
                            throw "invalid syntax";
                        const scene = yield Pocodoodle.GameScene.
                            fromScript(document.body, sceneScript);
                        events.addScene(scene);
                    }
                    return resolve(events);
                }
                catch (e) {
                    return reject(e);
                }
            }), 0);
        });
    }
    function main(script) {
        init(script).then((events) => {
            let loopManager = events.loop("start");
            let haltBtn = document.getElementById("btn_halt");
            if (haltBtn != null) {
                haltBtn.addEventListener("click", () => loopManager.stop());
            }
        }, msg => {
            throw msg;
            window.alert(msg);
        });
    }
    Main.main = main;
})(Main || (Main = {}));
