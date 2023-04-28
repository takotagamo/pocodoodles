; TyranoScript-like clickable (version 191105, no copyright, tagamo)


*init_clickable
[if exp="typeof global.clickable_areas == 'undefined'"]
[iscript]
class ClickableArea {
    var x, y, width, height, target;
    property left { setter(_) {} getter() { return x; } }
    property top { setter(_) {} getter() { return y; } }
    property right { setter(_) {} getter() { return x + width - 1; } }
    property bottom { setter(_) {} getter() { return y + height - 1; } }
    function ClickableArea(x, y, width, height, target, storage) {
        this.x = 1*x; this.y = 1*y; this.width = 1*width; this.height = 1*height;
        this.target = target;
        this.storage = storage;
    }
}

var clickable_initialized = false;
var clickable_areas = [];

class DummyWindow extends KAGWindow {
    function onClick(x, y) { super.onClick(x, y); }
}

class ClickableWindow extends KAGWindow {
    function onClick(x, y) {
        super.onClick(x, y);

        var i;

        for (i = 0; i < clickable_areas.count; ++i) {
            var a = clickable_areas[i];            

            if (x >= a.left && y >= a.top && x <= a.right && y <= a.bottom) {
                var target = a.target;

                clickable_areas = [];
                clickable_initialized = false;
                conductor.sleep();
                if (a.storage !== void) conductor.loadScenario(a.storage);
                conductor.goToLabel(target);
                conductor.run();
                kag.onClick = DummyWindow.onClick;

                return;
            }
        }
    }
}

function initClickable() {
    clickable_initialized = true;
    clickable_areas = [];
    kag.onClick = ClickableWindow.onClick;
}
function createClickableArea(x, y, w, h, t, s) {
    if (!clickable_initialized) initClickable();
    clickable_areas.add(new ClickableArea(x, y, w, h, t, s));
}

[endscript]
[macro name="clickable"]
    [eval exp="&createClickableArea(mp.x, mp.y, mp.width, mp.height, mp.target, mp.storage)"]
[endmacro]
[endif]
[return]
