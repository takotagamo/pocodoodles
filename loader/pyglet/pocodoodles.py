from __future__ import annotations

from typing import cast, Union, List, Set, Tuple, Dict
import os
import io
import json
import pyglet
import pyglet.image
import pyglet.graphics
import pyglet.sprite


image_dir = "image"

def set_image_dir(dir: str):
    global image_dir

    image_dir = dir

def create_sprite(win: pyglet.window.Window, file_name: str, x: int, y: int) -> pyglet.sprite.Sprite:
    """creates Image and Sprite from file name and lefttop-based position"""
    global image_dir

    try:
        img = pyglet.image.load(os.sep.join([image_dir, file_name]))

        return pyglet.sprite.Sprite(img, x, win.height - img.height - y)
    except Exception:
        return None

class rect:
    def __init__(self, x: int, y: int, w = -1, h = -1, x2 = -1, y2 = -1) -> None:
        super().__init__()

        self.x = x
        self.y = y

        if w == -1 and x2 == -1 or h == -1 and y2 == -1:
            raise Exception("can not determin size of rect")

        if w == -1:
            self.x2 = x2
            self.w = x2 - x + 1
        else:
            self.x2 = x + w - 1
            self.w = w

        if h == -1:
            self.y2 = y2
            self.h = y2 - y + 1
        else:
            self.y2 = y + h - 1
            self.h = h

    def contains(self, pos: Tuple[int, int]) -> bool:
        x, y = pos

        return (self.x <= x <= self.x2
            and self.y <= y <= self.y2)

    def __str__(self) -> str:
        return f"rect({self.x}, {self.y}, {self.x2}, {self.y2})"

class image:
    @staticmethod
    def is_valid_src(src):
        return (type(src) == dict
            and set(["x", "y"]) <= set(src.keys())
            and "image" in src.keys())

    def __init__(self, src: Dict[str, Union[str, int]]) -> None:
        super().__init__()

        if not image.is_valid_src(src):
            raise Exception("invalid area")

        self.x = int(src["x"])
        self.y = int(src["y"])
        self.rect = None
        self.image = src["image"]

        self.next = src["next"] if "next" in src.keys() else ""
        self.sprite = None

    def instantiate(self, win: pyglet.window.Window):
        self.sprite = create_sprite(win, self.image, self.x, self.y)
    
    def dispose(self):
        self.sprite.delete()
        self.sprite = None

    def check(self, pos: Tuple[int, int]) -> str:
        """returns scene name if clicked. or returns empty."""

        if self.sprite == None:
            return ""

        if self.rect == None:
            self.rect = rect(self.x, self.y, self.sprite.width, self.sprite.height)

        if self.rect.contains(pos):
            return self.next
        else:
            return ""

    def draw(self):
        if self.sprite != None:
            self.sprite.draw()

class button:
    @staticmethod
    def is_valid_src(src: dict):
        return (type(src) == dict
            and set(["x", "y"]) <= set(src.keys())
            and (set(["w", "h"]) <= set(src.keys())
                or "image" in src.keys()))

    def __init__(self, src: Dict[str, Union[str, int]]) -> None:
        super().__init__()

        if not button.is_valid_src(src):
            raise Exception("invalid area")

        self.x = int(src["x"])
        self.y = int(src["y"])
        if "w" in src.keys():
            self.w = int(src["w"])
            self.h = int(src["h"])
            self.image = ""
        else:
            self.w = 0
            self.h = 0
            self.image = src["image"]

        self.next = src["next"] if "next" in src.keys() else ""
        self.sprite = None
        self.rect = None

    def instantiate(self, win: pyglet.window.Window):
        if self.rect != None:
            return

        if self.image == "":
            self.rect = rect(self.x, self.y, self.w, self.h)

            return

        self.sprite = create_sprite(win, self.image, self.x, self.y)
        self.rect = rect(self.x, self.y, self.sprite.width, self.sprite.height)
    
    def dispose(self):
        self.rect = None

        if self.image == "":
            return

        self.sprite.delete()        
        self.sprite = None

    def check(self, pos: Tuple[int, int]) -> str:
        """returns scene name if clicked. or returns empty."""

        if self.rect == None:
            self.rect = rect(self.x, self.y, self.w, self.h)

        if self.rect != None and self.rect.contains(pos):
            return self.next
        else:
            return ""
    
    def draw(self):
        if self.sprite != None:
            self.sprite.draw()

class scene:
    def __init__(self, src: dict) -> None:
        super().__init__()

        if not (type(src) == dict and "bg" in src.keys() and "name" in src.keys()):
            raise Exception("input must be dict that contains at least bg and name")

        self.name = src["name"]
        self.bg = src["bg"]

        self.images = scene.load_images(src)
        self.buttons = scene.load_buttons(src)
        self.sprite: pyglet.sprite.Sprite = None

    def instantiate(self, win: pyglet.window.Window):
        if self.sprite != None:
            return

        self.sprite = create_sprite(win, self.bg, 0, 0)
        instantiate = (lambda x: x.instantiate(win))
        list(map(instantiate, self.images))
        list(map(instantiate, self.buttons))

    def dispose(self):
        if self.sprite == None:
            return

        self.sprite.delete()
        self.sprite = None
        list(map(image.dispose, self.images))
        list(map(button.dispose, self.buttons))

    def check(self, pos: Tuple[int, int]) -> str:
        """change current scene if clicked"""

        if self.sprite == None:
            return ""

        f = (lambda x: x.check(pos))

        r = list(filter(len,
                list(map(f, self.buttons))
                + list(map(f, self.images))))

        if len(r):
            return r[0]
        else:
            return ""

    def draw(self):
        if self.sprite == None:
            return

        self.sprite.draw()

        list(map(image.draw, self.images))
        list(map(button.draw, self.buttons))

    @staticmethod
    def load_scenes(src: List[dict]) -> Dict[str, scene]:
        if type(src) != list:
            raise Exception("input must be List[dict]")

        r: Dict[str, scene] = dict()

        for i in map(scene, src):
            r[i.name] = i

        return r

    @staticmethod
    def load_images(src: Dict[str, Union[str, dict]]) -> List[image]:
        if type(src) != dict:
            raise Exception("input must be List[dict]")

        if "images" in src.keys():
            return list(map(image, src["images"]))
        else:
            return []

    @staticmethod
    def load_buttons(src: Dict[str, Union[str, dict]]) -> List[button]:
        if type(src) != dict:
            raise Exception("input must be List[dict]")

        if "buttons" in src.keys():
            return list(map(button, src["buttons"]))
        else:
            return []

class pocodoodles:
    def __init__(self, file: str="") -> None:
        super().__init__()
        self.scenes = dict()
        self.running = False
        self.scene = None
        self.win = None

        if file != "":
            self.load_file(file)

    def load_file(self, file: io.TextIOWrapper):
        self.load(json.load(file))

    def load(self, src: dict):
        self.scenes = scene.load_scenes(src)

    def start(self, win: pyglet.window.Window) -> bool:
        if not ("start" in self.scenes.keys()):
            return False

        self.running = True
        self.win = win
        self.scene = self.scenes["start"]
        self.scene.instantiate(win)

        return True
    
    def stop(self):
        if self.scene == None:
            return

        self.win = None
        self.scene.dispose()
        self.scene = None
        self.running = False

    def check(self, pos: Tuple[int, int]) -> str:
        """returns next scene name when clicked. or returns None."""

        if self.scene == None:
            return ""

        # 上下逆に
        x, y = pos
        y = self.win.height - y - 1
        pos = (x, y)

        name = self.scene.check(pos)

        if name == "":
            return ""

        self.scene.dispose()
    
        if name in self.scenes.keys():
            self.scene = self.scenes[name]
            self.scene.instantiate(self.win)

            return ""
        else:
            self.win = None
            self.scene = None
            self.running = False

            return name

    def draw(self):
        if self.scene == None:
            return
        
        self.scene.draw()

if __name__ == "__main__":
    import sys
    import pyglet.app
    import pyglet.window

    if len(sys.argv) > 1 and sys.argv[1] in ["/?", "-?", "-h", "-help", "--help"]:
        print(f"{sys.argv[0]} [scenes.json [image_dir]]")
        sys.exit(0)

    script_file = sys.argv[1] if len(sys.argv) > 1 else "scenes/scenes.json"

    if len(sys.argv) > 2:
       set_image_dir(sys.argv[2])

    scenes: pocodoodles = None

    try:
        with io.open(script_file, "r") as f:
            scenes = pocodoodles(f)
    except Exception as e:
        print(f"failed to open script.\nerror:\n{e}")

        sys.exit(1)

    win = pyglet.window.Window(width=640, height=480)

    if not scenes.start(win):
        print("failed to start")
        sys.exit(1)

    @win.event
    def on_draw():
        scenes.draw()

    @win.event
    def on_mouse_press(x: int, y: int, button, modifiers):
        next = scenes.check((x, y))

        # contiue
        if next == "":
            return

        # exit

        # external scene name
        print(next)

        win.close()
        pyglet.app.exit()


    pyglet.app.run()
