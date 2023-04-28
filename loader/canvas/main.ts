/* HTML側に要求するもの
cv_main: canvas。
btn_halt: 省略可。中断ボタン。
*/

/// <reference path="./game.ts" />

namespace Main {
    const config = {
        paintInterval: 5000
    }; 

    type EventManager = Pocodoodle.EventManager<HTMLElement>;

    // how to fetch local files?
    function load(uri: string): string {
        let xhr = new XMLHttpRequest();

        xhr.open("GET", uri, true);
        xhr.send();
    
        return xhr.responseText;
    }

    function init(script?: string | Pocodoodle.SceneScript[]): Promise<EventManager> {
        return new Promise<EventManager>((resolve, reject) => {
            window.setTimeout(async () => {
            try {
                if (typeof script == "undefined") {
                    // not done
                    const srcElm = document.getElementById("scenes") as (HTMLScriptElement | null);
                    if (srcElm == null)
                        throw 'element "scenes" is not found';
                    script = srcElm.innerText; // load(srcElm.src);
                }

                if (typeof script == "string")
                    script = JSON.parse(script) as Pocodoodle.SceneScript[];
                const events = new Pocodoodle.EventManager(document.body, config.paintInterval);

                for (let i = 0; i < script.length; ++i) {
                    let sceneScript = script[i];

                    if (typeof sceneScript.name == "undefined" ||
                        typeof sceneScript.bg == "undefined")
                        throw "invalid syntax";

                    const scene = await Pocodoodle.GameScene.
                        fromScript(document.body, sceneScript);

                    events.addScene(scene);
                }

                return resolve(events);
            } catch(e) {
                return reject(e);
            }
        }, 0);
        });
    }

    export function main(script?: string) {
        init(script).then(
            (events) => {
                let loopManager = events.loop("start");

                let haltBtn = document.getElementById("btn_halt");

                if (haltBtn != null) {
                    haltBtn.addEventListener("click", () =>
                        loopManager.stop());
                }
            },
            msg => {
                throw msg;
                window.alert(msg);
            });
    }

}
