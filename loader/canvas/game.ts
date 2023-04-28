/// <reference path="./dom_misc.ts" />

namespace Pocodoodle {
    export interface Button {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
        readonly nextName: string;
        readonly listener: ButtonEventListener | undefined;
    }
    export interface PaintRequest extends PxPoint {
        readonly image?: HTMLImageElement;
        readonly x: number;
        readonly y: number;
    };
    export interface ButtonPaintRequest extends PaintRequest, Button {
    }
    export type ButtonEventListener = (this: Button,
                                       tickets: EventInterruptTickets) => void;

    export interface SceneScriptImage {
        image: string;
        x: number;
        y: number;
    }
    export type SceneScriptButtonCommand = "replace" | "wait" | "move" | "none";
    export interface SceneScriptImageButton extends SceneScriptImage {
        next: string;
        command?: SceneScriptButtonCommand;
        nParams?: number[];
        sParams?: string[];
    }
    export interface SceneScriptButton {
        x: number;
        y: number;
        w: number;
        h: number;
        next: string;
        command?: SceneScriptButtonCommand;
        nParams?: number[];
        sParams?: string[];
    }
    export interface SceneScript {
        name: string;
        size?: PxSize;
        bg: string;
        unitSize?: PxSize;
        areaSize?: PxSize;
        wallImage?: string;
        walls?: boolean[][];
        bgColor?: string;
        images?: SceneScriptImage[];
        buttons?: (SceneScriptButton | SceneScriptImageButton)[];
    }

    export class GameScene extends Scene {
        cv: HTMLCanvasElement;
        paintQueue: PaintRequest[] = [];
        paintables: PaintRequest[] = [];
        paintableButtons: ButtonPaintRequest[] = [];
        buttons: Button[] = [];

        public bg?: HTMLImageElement;

        protected constructor(private body: HTMLElement,
                              name: string,
                              public bgColor = "black",
                              public readonly defaultInterval: number = minInterval) {
            super(body, name);

            this.cv = getElementById<HTMLCanvasElement>("cv_main");
        }

        public static async createGameScene(body: HTMLElement,
                                            name: string,
                                            canvasSize: PxSize,
                                            bg?: HTMLImageElement | string,
                                            bgColor?: string,
                                            defaultInterval?: number): Promise<GameScene> {

            let scene = new GameScene(body, name, bgColor, defaultInterval);

            scene.cv.width = canvasSize.w;
            scene.cv.height = canvasSize.h;

            scene.bg = typeof bg == "string" ?
                await getImageElementById(bg) :
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
        }

        public onstart(tickets: EventInterruptTickets) {
            this.onpaint(tickets);
        }
        public onpaint = (tickets: EventInterruptTickets): boolean => {            
            let queue = this.paintables.
                concat(this.paintQueue).
                concat(this.paintableButtons);

            if (queue.length == 0) return true;

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
        }
        public onmouseup(tickets: EventInterruptTickets,
                            p: PxPoint, buttons: number) {
            if (this.buttons.length == 0) return true;

            for (let i = this.buttons.length; 0 < i;) {
                let req = this.buttons[--i];

                if (pointInRect(p, req as PxPoint,
                        { x: req.x + req.w,
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

        public paint(req: PaintRequest) {
            this.paintQueue.push(req);
        }

        public addImage(req: PaintRequest) {
            this.paintables.push(req);
        }
        public addButton(req: Button) {
            this.buttons.push(req);
        }
        public addPaintableButton(req: ButtonPaintRequest) {
            this.paintableButtons.push(req);
            this.buttons.push(req);
        }
        
        public get canvasSize(): PxSize {
            return { w: this.canvasWidth, h: this.canvasHeight };
        }
        public get canvasWidth(): number {
            return this.cv.width;
        }
        public get canvasHeight(): number {
            return this.cv.height;
        }

        static async getCanvasSizeFromScript(script: SceneScript): Promise<PxSize | undefined> {
            if (typeof script.size != "undefined")
                return script.size;

            if (typeof script.bg != "undefined") {
                try {
                    let img = await getImageElementById(script.bg);

                    return { w: img.width, h: img.height };
                } catch(_) {
                }
            }

            return undefined;
        }

        public static async fromScript(body: HTMLElement, script: SceneScript,
                                       interval: number = minInterval): Promise<GameScene> {
            let canvasSize = await GameScene.getCanvasSizeFromScript(script);

            if (typeof canvasSize == "undefined") {
                console.log("bad script", script);
                throw "error"
            }

            let scene = await GameScene.
                createGameScene(body, script.name,
                                canvasSize,
                                script.bg,
                                script.bgColor,
                                interval);

            if (typeof script.images != "undefined") {
                for (let i = 0; i < script.images.length; ++i) {
                    let img = script.images[i];
                    scene.addImage(await Paintable.
                        createPaintable(scene, img.image, 
                                        img.x, img.y));
                }
            }
            if (typeof script.buttons != "undefined") {
                for (let i = 0; i < script.buttons.length; ++i) {
                    let btn: any = script.buttons[i];

                    if (typeof btn.image != "undefined") {
                        btn = btn as SceneScriptImageButton;
                        scene.addPaintableButton(await PaintableButton.
                                createPaintableButton(scene, btn.image,
                                                      btn.x, btn.y,
                                                      btn.next));
                    } else {
                        btn = btn as SceneScriptButton;
                        scene.addButton(new InvisibleButton(scene,
                                                            btn.x, btn.y,
                                                            btn.w, btn.h,
                                                            btn.next));
                    }
                }
            }

            return scene;
        }
    }


    export class Paintable implements PaintRequest {
        protected _image?: HTMLImageElement;

        protected constructor(protected readonly game: GameScene,
                              protected _x: number = 0,
                              protected _y: number = 0) {
        }
        public static async createPaintable(game: GameScene,
                                            image: HTMLImageElement | string,
                                            _x: number = 0,
                                            _y: number = 0): Promise<Paintable> {
            let scene = new Paintable(game, _x, _y);

            return scene.init(image);
        }
        public async init(image: HTMLImageElement | string): Promise<Paintable> {
            this._image = typeof image == "string" ?
                await getImageElementById(image) :
                image;

            return this;
        }

        public get image(): HTMLImageElement | undefined { return this._image; }
        public get x(): number { return this._x; }
        public get y(): number { return this._y; }
        public set x(x2: number) { this._x = this.saturateX(x2); }
        public set y(y2: number) { this._y = this.saturateY(y2); }
        public get canvasWidth(): number {
            return this.game.canvasWidth;
        }
        public get canvasHeight(): number {
            return this.game.canvasHeight;
        }
        public get point(): PxPoint {
            return { x: this.x, y: this.y };
        }
        public moveTo(p: PxPoint): void;
        public moveTo(x: number, y: number): void;
        public moveTo(x: PxPoint | number, y?: number): void {
            if (typeof y == "undefined") {
                let p = x as PxPoint;

                x = p.x;
                y = p.y;
            } else 
                x = x as number;
 
            this.x = x;
            this.y = y;
        }
        public get width(): number {
            return typeof this.image != "undefined" ? this.image.width : 0;
        }
        public get height(): number {
            return typeof this.image != "undefined" ? this.image.height : 0;
        }
        public get maxX(): number {
            return this.canvasWidth - this.width;
        }
        public get maxY(): number {
            return this.canvasHeight - this.height;
        }
        protected saturateX(x: number): number {
            return saturate(x, 0, this.maxX);
        }
        protected saturateY(y: number): number {
            return saturate(y, 0, this.maxY);
        }
        protected saturatePxPoint(p: PxPoint): PxPoint {
            return {
                x: this.saturateX(p.x),
                y: this.saturateY(p.y)
            };
        }
        protected validateX(x: number): boolean {
            return this.saturateX(x) == x;
        }
        protected validateY(y: number): boolean {
            return this.saturateY(y) == y;
        }
        protected validatePxPoint(p: PxPoint): boolean {
            return this.validateX(p.x) && this.validateY(p.y);
        }
    }
    export class InvisibleButton implements Button {
        public listener: ButtonEventListener | undefined = undefined;

        public constructor(game: GameScene,
                           public readonly x: number = 0,
                           public readonly y: number = 0,
                           public readonly w: number = 0,
                           public readonly h: number = 0,
                           public nextName: string,
                           listener?: ButtonEventListener) {

            if (typeof listener != "undefined") this.listener = listener;
        }
    }

    export class PaintableButton extends Paintable implements ButtonPaintRequest {
        public listener: ButtonEventListener | undefined = undefined;

        constructor(game: GameScene,
                    _x: number = 0,
                    _y: number = 0,
                    public nextName: string,
                    listener?: ButtonEventListener) {
            super(game, _x, _y);

            if (typeof listener != "undefined") this.listener = listener;
        }

        public static async createPaintableButton(game: GameScene,
                                                  image: HTMLImageElement | string,
                                                  _x: number = 0,
                                                  _y: number = 0,
                                                  nextName: string,
                                                  listener?: ButtonEventListener): Promise<PaintableButton> {
            let btn = new PaintableButton(game, _x, _y, nextName, listener);
            btn.init(image);

            return btn;
        }

        public get w(): number {
            return typeof this.image != "undefined" ? this.image.width : 0;
        }
        public get h(): number {
            return typeof this.image != "undefined" ? this.image.height : 0;
        }
    }

}
