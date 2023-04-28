/// <reference path="./misc.ts" />

namespace Pocodoodle {
    // 全体のイベント発生周期
    export const unit_timeout = 50;

    export const minInterval = 100;
    export const maxInterval = 10000;

    export function wait(timeout: number): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve();
                } catch(e) {
                    reject(e);
                }    
            }, timeout);
        });
    }

    export function getElementById<T extends HTMLElement>(id: string, error?: string): T {
        const elm = document.getElementById(id) as (T | null);

        if (elm == null) {
            if (typeof error == "undefined") {
                error = "failed to get element " + id;
            }

            throw error;
        }

        return elm;
    }

    export async function loadImage(uri: string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            let elm = document.createElement("img");

            if (elm == null) reject("failed to crerate image element");

            elm.onload = () => resolve(elm);
            elm.src = "./image/" + uri;
        }).then(elm => {
            elm.width = elm.naturalWidth;
            elm.height = elm.naturalHeight;

            return elm;
        });
    }

    export async function getImageElementById(id: string,
                                              size?: PxSize,
                                              error?: string): Promise<HTMLImageElement> {
        let elm: HTMLImageElement;
        try {
            elm = getElementById(id);
        } catch(e) {
            elm = await loadImage(id);
        }

        if (typeof size != "undefined" &&
            !objectEqual(size, { w: elm.width, h: elm.height })) {

            if (typeof error == "undefined") {
                error = "image element has different size to required";
            }

            throw error;
        }

        return elm;
    }

    export type EventInterruptTickets = {
        exit: () => void;
        changeScene: (sceneName: string) => boolean;

    };
    export type InitEventListener = (tickets: EventInterruptTickets) => boolean;
    export type StartEventListener = (tickets: EventInterruptTickets) => void;
    export type StopEventListener = (tickets: EventInterruptTickets) => void;
    export type IntervalEventListener = (tickets: EventInterruptTickets) => boolean;

    export type KeyEventState = ("keydown" | "keypress" | "keyup");
    export type KeyState = (KeyEventState | "none");
    export const MODKEY_NONE = 0;
    export const MODKEY_ALT = 1;
    export const MODKEY_CTRL = 2;
    export const MODKEY_SHIFT = 4;
    export const MODKEY_META = 8;
    export type KeyEventListener = (tickets: EventInterruptTickets,
                                    key: string, modkeys: number,
                                    d: Direction2D) => void;

    export type MouseEventState = ("mousedown" | "buttonpress" | "mouseup");
    export type MouseState = (MouseEventState | "none");
    export type MouseEventListener = (tickets: EventInterruptTickets,
                                      x: PxPoint,
                                      buttons: number) => void;

    export interface BaseEventListenerSet {}

    export class Scene {
        public initialized: boolean = false;
        public exited: boolean = false;

        public oninit(tickets: EventInterruptTickets) { return true; }
        public onexit() {}
        public onstart(tickets: EventInterruptTickets) {}
        public onstop(tickets: EventInterruptTickets) {}
        public onkeydown(tickets: EventInterruptTickets, 
                         key: string, modkeys: number, d: Direction2D) {}
        public onkeyup(tickets: EventInterruptTickets, 
                       key: string, modkeys: number, d: Direction2D) {}
        public onmousedown(tickets: EventInterruptTickets, 
                           mousePoint: PxPoint, buttons: number) {}
        public onmousemove(tickets: EventInterruptTickets, 
                           mousePoint: PxPoint, buttons: number) {}
        public onmouseup(tickets: EventInterruptTickets, 
                         mousePoint: PxPoint, buttons: number) {}
        public onpaint(tickets: EventInterruptTickets) {}

        public constructor(public target: unknown,
                           public name: string) {
        };

        static fixTimeout(interval: number) {
            let max = Math.floor(maxInterval / minInterval);
            let interval2 = saturate(Math.floor(interval), 1, max);
            let timeout = saturate(interval - 1, 0, max);

            return {
                interval: interval2,
                timeout: timeout
            }
        }

        public invokeStart(tickets: EventInterruptTickets) {
            if (this.exited) return;

            if (!this.initialized) {
                if (!this.oninit(tickets)) {
                    this.exited = true;

                    return;
                }

                this.initialized = true;
            }

            this.onstart(tickets);
        }
        public invokeStop(tickets: EventInterruptTickets) {
            if (this.exited) return;

            this.onstop(tickets);
        }
        public invokeKeydown(tickets: EventInterruptTickets,
                             key: string, modkeys: number, d: Direction2D) {
            if (this.exited) return;

            this.onkeydown(tickets, key, modkeys, d);
        }
        public invokeKeyup(tickets: EventInterruptTickets,
                           key: string, modkeys: number, d: Direction2D) {
            if (this.exited) return;

            this.onkeyup(tickets, key, modkeys, d);
        }
        public invokeMousedown(tickets: EventInterruptTickets, point: PxPoint, buttons: number) {
            if (this.exited) return;

            this.onmousedown(tickets, point, buttons);
        }
        public invokeMouseup(tickets: EventInterruptTickets, point: PxPoint, buttons: number) {
            if (this.exited) return;

            this.onmouseup(tickets, point, buttons);
        }
        public invokeMousepress(tickets: EventInterruptTickets, point: PxPoint, buttons: number) {
            if (this.exited) return;

            this.onmousemove(tickets, point, buttons);
        }
        public invokeExit() {
            if (!this.exited && this.initialized) {
                this.onexit();

                this.exited = true;
            }
        }

        public invokePaint(tickets: EventInterruptTickets) {
            this.onpaint(tickets);
        }
    }

    export interface SceneDictionary {
        [index: string]: Scene;
    }

    // バレルプロセッサによる疑似スレッド
    export class EventManager<T extends HTMLElement> implements EventInterruptTickets {
        scenes: SceneDictionary = {};
        currentSceneName: string = "";
        currentScene: Scene | undefined = undefined;
        running: boolean = false;
        keystat: KeyState = "keyup";
        mousestat: MouseState = "mouseup";
        key: string = "";
        modkeys: number = MODKEY_NONE;
        buttons: number = 0;
        buttonPoint: PxPoint = { x: -1, y: -1 };
        d: Direction2D = DIRECTION_NONE;

        public constructor(protected target: T | null = null,
                           public readonly paintInterval = minInterval) {
            if (target == null) target = document.body as T;

            target.addEventListener("keydown", e => {
                if (this.keystat != "keyup") return;

                this.keystat = "keydown";
                this.key = (e as KeyboardEvent).key;

                this.modkeys = MODKEY_NONE;
                if (e.altKey) this.modkeys |= MODKEY_ALT;
                if (e.ctrlKey) this.modkeys |= MODKEY_CTRL;
                if (e.shiftKey) this.modkeys |= MODKEY_SHIFT;
                if (e.metaKey) this.modkeys |= MODKEY_META;

                switch (this.key) {
                    case "ArrowLeft":
                        this.d = DIRECTION_LEFT;
                        break;
                    case "ArrowRight":
                        this.d = DIRECTION_RIGHT;
                        break;
                    case "ArrowUp":
                        this.d = DIRECTION_UP;
                        break;
                    case "ArrowDown":
                        this.d = DIRECTION_DOWN;
                        break;
                    default:
                        return;
                }
            });

            target.addEventListener("keyup", _ => {
                this.keystat = "keyup";

                if (typeof this.currentScene == "undefined") return;
                    this.currentScene.invokeKeyup(this, this.key, this.modkeys, this.d);
            });

            target.addEventListener("mousedown", e => {
                if (this.mousestat != "mouseup") return;

                this.mousestat = "mousedown";
                this.buttonPoint = { x: e.clientX, y: e.clientY };
                this.buttons = e.buttons;

                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokeMousedown(this, this.buttonPoint, this.buttons);
            });

            target.addEventListener("mousemove", e => {
                if (this.mousestat != "mousedown") return;

                this.buttonPoint = { x: e.clientX, y: e.clientY };
                this.buttons = e.buttons;

                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokeMousepress(this, this.buttonPoint, this.buttons);
            });

            target.addEventListener("mouseup", _ => {
                if (this.mousestat != "mousedown") return;

                this.mousestat = "mouseup";

                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokeMouseup(this, this.buttonPoint, this.buttons);
            });

            window.setInterval(() => {
                if (typeof this.currentScene != "undefined")
                    this.currentScene.invokePaint(this);
            }, this.paintInterval);
        }

        public addScene(scene: Scene): boolean {
            if (scene.name in this.scenes)
                return false;

            this.scenes[scene.name] = scene;

            return true;
        };

        handle: number = 0;

        // Tickets
        public stop() {
            if (this.handle != 0)
                window.clearInterval(this.handle);
            this.running = false;

            if (typeof this.currentScene != "undefined")
                this.currentScene.invokeExit();
        }
        public exit() { this.stop(); }

        public changeScene (sceneName: string) {
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
        public loop(sceneName: string): { stop: () => void } {
            if (this.running) return this;

            this.changeScene(sceneName);
            this.running = true;
            
            return this;
        }
    }
}
