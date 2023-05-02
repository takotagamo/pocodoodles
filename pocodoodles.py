import sys
import os
import io
import json


def get_dst_file_name(src_file, dst_dir, ext):
    dst_file = src_file.split(os.sep)[-1]

    if src_file.endswith(".json"):
        dst_file = dst_file[:-5]
        
    dst_file = dst_dir + os.sep + dst_file + ext

    return dst_file

def force_get_elm(lst: list, idx: int, t, default_value):
    if len(lst) > idx and type(lst[idx]) == t:
        return lst[idx]
    else:
        return default_value

def member_exists(d: list, k: str, t):
    return type(d) and k in d and type(d[k]) == t


# target HTML + map

def compile_scene_to_map(src: dict, dst_dir: str=".", options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    file_prefix = force_get_elm(options, 0, str, "")
    dst_file = file_prefix + src["name"]
    dst_file = get_dst_file_name(dst_file, dst_dir, ".html")

    img_dir = force_get_elm(options, 1, str, "")
    if img_dir != "" and not img_dir.endswith("/"):
        img_dir = img_dir + "/"

    try:
        with io.open(dst_file, "w") as f:
            f.writelines([
                "<html>\n",
                "<head>\n"
            ])
            if "title" in src.keys():
                f.write("<title>{}</title>\n".format(src["title"]))
            f.writelines([
                "</head>\n",
                "<body>\n"
                '<img usemap="#map" src="{}{}" />\n'.format(img_dir, src["bg"]),
                '<map name="map">\n'
            ])
            if member_exists(src, "images", list):
                sys.stderr.write("warrning. images ware ignored\n")

            if member_exists(src, "buttons", list):
                wrn_head = False

                for btn in src["buttons"]:
                    if (type(btn) == dict 
                            and "x" in btn.keys() and "y" in btn.keys() 
                            and "w" in btn.keys() and "h" in btn.keys()
                            and "next" in btn.keys()):

                        link_uri = btn["next"]
                        if not (link_uri.startswith("http://")
                                    or link_uri.startswith("https://")
                                    or link_uri.startswith("data://")
                                    or link_uri.startswith("blob://")
                                    or link_uri.startswith("file://")):
                            link_uri = file_prefix + link_uri
                            
                            if not link_uri.endswith(".html"):
                                link_uri = link_uri + ".html"

                        f.writelines([
                            '<area shape="rect" coords="{},{},{},{}" href="{}" />\n'
                                .format(
                                    btn["x"], btn["y"],
                                    btn["x"] + btn["w"], btn["y"] + btn["h"], 
                                    link_uri)
                        ])
                    else:
                        if not wrn_head:
                            sys.stderr.write("warrning. button ignored:\n")
                            wrn_head = True

                        json.dump(btn, sys.stderr)
                        sys.stderr.writelines([ "\n" ])

            f.writelines([
                '</map>\n',
                "</body>\n",
                "</html>\n"
            ])
    except Exception as e:
        sys.stderr.write("error. i/o error.\n")

        return False

    return True

def complie_scenes_to_map(src_file, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        return compile_scene_to_map(src, dst_dir, options)
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    for scene in src:
        if not compile_scene_to_map(scene, dst_dir, options):
            return False

    return True


# target HTML5 + JavaScript + Phaser

def complie_scenes_to_phaser(src_file: str, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    ss_name = "gameScenes"
    ss_name = force_get_elm(options, 0, str, ss_name)

    pfx_name = (src_file[:src_file.find(".")]
        .split(os.sep)[-1])
    pfx_name = force_get_elm(options, 1, str, pfx_name)

    img_dir = force_get_elm(options, 2, str, "./image")

    if img_dir != "":
        img_dir = img_dir + "//"


    dst_file = get_dst_file_name(src_file, dst_dir, ".js")

    try:
        encoder = json.encoder.JSONEncoder()

        with io.open(dst_file, "w") as f:
            f.write(f"""
if (typeof {ss_name} == "undefined") {ss_name} = [];
(function() {{
    let script_names = [""")

            f.write(",".join(map(lambda scene: f'"{scene["name"]}"', src)))

            f.write(f"""];
    let fromPocodoodleScript = function(script) {{
        if (script.images === void 0) script.images = [];
        if (script.buttons === void 0) script.buttons = [];
        for (let a of [script.images, script.buttons]) {{
            for (let i of a) {{
                if (i.x !== void 0) i.x = parseInt(i.x);
                if (i.y !== void 0) i.y = parseInt(i.y);
                if (i.w !== void 0) i.w = parseInt(i.w);
                if (i.h !== void 0) i.h = parseInt(i.h);
            }}
        }}
        return class extends Phaser.Scene {{
            constructor() {{
                super({{key: "{pfx_name}" + script.name}});
            }}
            load_image(name) {{
                this.load.image(name, "{img_dir}" + name);
            }}
            load_images(images) {{
                for (let i of images) {{
                    if (typeof i.image != "undefined") this.load_image(i.image);
                }}
            }}
            preload() {{
                if (script.bg !== void 0) this.load_image(script.bg);
                this.load_images(script.images);
                this.load_images(script.buttons);
            }}
            scene_start(name) {{
                if (script_names.some(s => s == name)) name = "{pfx_name}" + name;
                this.scene.start(name);
            }}
            add_image(x, y, name, next) {{
                let i = this.add.image(x, y, name);
                i.setOrigin(0, 0);
                if (next !== void 0) {{
                    i.setInteractive();
                    i.on("pointerup", () => this.scene_start(next));
                }}
            }}
            add_bg(name) {{
                this.add_image(0, 0, name);
            }}
            add_images(images) {{
                let rest = [];
                for (let i of images) {{
                    if (i.image !== void 0) this.add_image(i.x, i.y, i.image, i.next);
                    else rest.push(i);
                }}
                return rest;
            }}
            create() {{
                this.add_bg(script.bg);
                this.add_images(script.images);
                let buttons = this.add_images(script.buttons).reverse();
                this.input.on("pointerup", p => {{
                    for (let button of buttons) {{
                        let circle = new Phaser.Geom.Circle(p.x, p.y, 1);
                        let rect = new Phaser.Geom.Rectangle(button.x, button.y, button.w, button.h);
                        if (Phaser.Geom.Intersects.CircleToRectangle(circle, rect)) {{
                            this.scene_start(button.next);
                            break;
                        }}
                    }}
                }});
            }}
        }};
    }};

        {ss_name} = {ss_name}.concat([
""")

            for scene in src:
                f.write("fromPocodoodleScript(" + encoder.encode(scene) + "),\n")

            f.write("""
    ]);
})();
""")

    except Exception as e:
        print(e)
        sys.stderr.write("error. i/o error.\n")

        return False

    return True


# target C# + Windows.Forms.Form

def compile_scene_to_form(src: dict, f, options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    img_dir = force_get_elm(options, 2, str, "")

    if img_dir != "":
        img_dir = img_dir + "//"

    f.writelines([
        '{{ "{}", new SceneScript("{}", "{}",\n'
            .format(src["name"], src["name"], img_dir + src["bg"]),
        'new ClickableAreaScript[] {'
    ])

    if member_exists(src, "images", list):
        sys.stderr.write("warrning. images ware ignored\n")

    if member_exists(src, "buttons", list):
        wrn_head = False

        idx = 0
        for btn in src["buttons"]:
            if (type(btn) == dict 
                    and "x" in btn.keys() and "y" in btn.keys() 
                    and "w" in btn.keys() and "h" in btn.keys()
                    and "next" in btn.keys()):
                if idx > 0:
                    f.write(",\n")
                else:
                    f.write("\n")

                f.writelines([
                    'new ClickableAreaScript(new Rectangle({}, {}, {}, {}), "{}")'
                        .format(
                            btn["x"], btn["y"],
                            btn["w"], btn["h"], 
                            btn["next"])
                ])
                
                idx = idx + 1
            else:
                if not wrn_head:
                    sys.stderr.write("warrning. button ignored:\n")
                    wrn_head = True

                json.dump(btn, sys.stderr)
                sys.stderr.write("\n")

    f.write("\n}) }")

    return True

def complie_scenes_to_form(src_file: str, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    cls_name = (src_file[:src_file.find(".")]
        .split(os.sep)[-1])
    cls_name = force_get_elm(options, 0, str, cls_name)
    cls_name = cls_name[0].upper() + cls_name[1:]

    first_scene_name = force_get_elm(options, 1, str, "start")

    dst_file = get_dst_file_name(src_file, dst_dir, ".cs")

    try:
        with io.open(dst_file, "w") as f:
            f.write("""
using System.Drawing;
using System.Collections.Generic;
namespace Pocodoodles {{
public class {} : GameForm {{
public {}() {{
DoubleBuffered = true;
Script =
new Dictionary<string, SceneScript> {{
""".format(cls_name, cls_name))

            idx = 0
            for scene in src:
                if idx > 0:
                    f.write(",\n")
                else:
                    f.write("\n")

                if not compile_scene_to_form(scene, f, options):
                    return False
                
                idx = idx + 1

            f.write("""
}};
}}
public static void Main(string[] args) {{
using (var form = new {}()) form.ShowDialog("{}");
}}
}}
}}
""".format(cls_name, first_scene_name))

    except Exception as e:
        print(e)
        sys.stderr.write("error. i/o error.\n")

        return False

    return True


# target MS-DOS (stub)

def compile_scene_to_msdos(src: dict, f, options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    img_ext = force_get_elm(options, 0, str, ".pck")

    if not img_ext.startswith("."):
        img_ext = "." + img_ext

    img_dir = force_get_elm(options, 1, str, "")

    if img_dir != "":
        img_dir = img_dir + "//"

    bg_file = src["bg"]

    if bg_file.find(".") != -1:
        bg_file = bg_file[:bg_file.find(".")] + img_ext

    label_prefix = force_get_elm(options, 2, str, "label__")

    f.writelines([
        "{}:\n".format(label_prefix + src["name"]),
        'section .data\n',
        'align 2\n',
        '.name: db "{}", 0\n'.format(img_dir + bg_file),
        'section .code\n',
        'mov dx, .name\n',
        'mov [imgname], dx\n'
        'call imgload\n',
        'or ax, ax\n',
        'jz waitinput.onexit\n',
        'mov bx, [.callback]\n',
        'mov [waitinput.callback], bx\n',
        "jmp waitinput\n",
        '.callback:\n',
        'mov cx, [waitinput.x]\n',
        'mov dx, [waitinput.y]\n'
    ])

    if member_exists(src, "images", list):
        sys.stderr.write("warrning. images ware ignored\n")

    if member_exists(src, "buttons", list):
        wrn_head = False

        idx = 0
        for btn in src["buttons"]:
            if (type(btn) == dict 
                    and "x" in btn.keys() and "y" in btn.keys() 
                    and "w" in btn.keys() and "h" in btn.keys()
                    and "next" in btn.keys()):

                f.writelines([
                    '; {}<=x<{} && {}<=y<{}\n'
                        .format(
                            btn["x"], btn["x"] + btn["w"],
                            btn["y"], btn["y"] + btn["h"]),
                    '.area{}:\n'.format(idx),
                    'cmp cx, {}\n'.format(btn["x"]),
                    'jl .area{}\n'.format(idx + 1),
                    'cmp cx, {}\n'.format(btn["x"] + btn["w"]),
                    'jge .area{}\n'.format(idx + 1),
                    'cmp dx, {}\n'.format(btn["y"]),
                    'jl .area{}\n'.format(idx + 1),
                    'cmp dx, {}\n'.format(btn["y"] + btn["h"]),
                    'jge .area{}\n'.format(idx + 1),
                    'mov bx, {}\n'.format(label_prefix + btn["next"]),
                    'mov [waitinput.next], bx\n',
                    'ret\n'
                ])

                idx = idx + 1
            else:
                if not wrn_head:
                    sys.stderr.write("warrning. button ignored:\n")
                    wrn_head = True

                json.dump(btn, sys.stderr)
                sys.stderr.write("\n")

    f.writelines([
        '.area{}:\n'.format(idx),
        "xor bx, bx\n",
        'mov [waitinput.next], bx\n',
        "ret\n"
    ])

    return True

def complie_scenes_to_msdos(src_file, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    dst_file = get_dst_file_name(src_file, dst_dir, ".asm")

    try:
        with io.open(dst_file, "w") as f:
            f.write("""
; code generator for target msdos is stub.
; this code must be broken. 
; press Esc to exit.
bits 16
org 100h
call waitinput.init
""")
            for scene in src:
                if not compile_scene_to_msdos(scene, f, options):
                    return False

            f.write("""
%include "waitinput.inc"

;; you can replace this
;; proc imgload(global imgname: ptr to file name)
%include "pckload.inc"

""")
    except Exception as e:
        sys.stderr.write("error. i/o error.\n")

        return False

    return True


# target HSP3

def compile_scene_to_hsp(src: dict, f, options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    img_dir = force_get_elm(options, 0, str, "")

    if img_dir != "":
        img_dir = img_dir + "//"

    label_prefix = force_get_elm(options, 1, str, "label__")

    f.writelines([
        "*{}\n".format(label_prefix + src["name"]),
        "pos 0, 0\n"
        'picload "{}"\n'.format(img_dir + src["bg"]),
        "*wait__{}\n".format(src["name"]),
        "onclick *goto__{}\n".format(src["name"]),
        "stop\n",
        "*goto__{}\n".format(src["name"]),
    ])

    if member_exists(src, "images", list):
        sys.stderr.write("warrning. images ware ignored\n")

    if member_exists(src, "buttons", list):
        wrn_head = False

        for btn in src["buttons"]:
            if (type(btn) == dict 
                    and "x" in btn.keys() and "y" in btn.keys() 
                    and "w" in btn.keys() and "h" in btn.keys()
                    and "next" in btn.keys()):
                f.writelines([
                    'if (mousex>={})&(mousey>={})&(mousex<{})&(mousey<{}): goto *{}\n'
                        .format(
                            btn["x"], btn["y"],
                            btn["x"] + btn["w"], btn["y"] + btn["h"], 
                            label_prefix + btn["next"])
                ])
            else:
                if not wrn_head:
                    sys.stderr.write("warrning. button ignored:\n")
                    wrn_head = True

                json.dump(btn, sys.stderr)
                sys.stderr.write("\n")

        f.write("goto *wait__{}\n".format(src["name"]))

    return True

def complie_scenes_to_hsp(src_file, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    dst_file = get_dst_file_name(src_file, dst_dir, ".hsp")

    try:
        with io.open(dst_file, "w") as f:
            f.writelines([
                '// code generator for target hsp is stub. not tested.',
                '//#include "hsp3utf.as"\n',
                '//#include "hsp3dish.as"\n'
            ])

            for scene in src:
                if not compile_scene_to_hsp(scene, f, options):
                    return False
    except Exception as e:
        sys.stderr.write("error. i/o error.\n")

        return False

    return True


# target Nscripter1

def compile_scene_to_nscr(src: dict, f, options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    x_idx = force_get_elm(options, 0, str, "198")
    y_idx = force_get_elm(options, 1, str, "199")
    img_dir = force_get_elm(options, 2, str, "")

    if img_dir != "":
        img_dir = img_dir + "//"

    label_prefix = force_get_elm(options, 3, str, "label__")

    f.writelines([
        "*{}\n".format(label_prefix + src["name"]),
        'bg "{}", 0\n'.format(img_dir + src["bg"]),
        "*wait__{}\n".format(src["name"]),
        "@\n",
        "clickpos %click_x, %click_y\n"
    ])

    if member_exists(src, "images", list):
        sys.stderr.write("warrning. images ware ignored\n")

    if member_exists(src, "buttons", list):
        wrn_head = False

        for btn in src["buttons"]:
            if (type(btn) == dict 
                    and "x" in btn.keys() and "y" in btn.keys() 
                    and "w" in btn.keys() and "h" in btn.keys()
                    and "next" in btn.keys()):
                f.writelines([
                    'if %{}>={}&&%{}>={}&&%{}<{}&&%{}<{}  goto *{}\n'
                        .format(
                            x_idx, btn["x"], y_idx, btn["y"],
                            x_idx, btn["x"] + btn["w"], y_idx, btn["y"] + btn["h"], 
                            label_prefix + btn["next"])
                ])
            else:
                if not wrn_head:
                    sys.stderr.write("warrning. button ignored:\n")
                    wrn_head = True

                json.dump(btn, sys.stderr)
                sys.stderr.write("\n")

        f.write("goto *wait__{}\n".format(src["name"]))

    return True

def complie_scenes_to_nscr(src_file, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    dst_file = get_dst_file_name(src_file, dst_dir, ".txt")

    try:
        with io.open(dst_file, "w") as f:
            f.writelines([
                "*define\n",
                "game\n",
                "*start\n"
            ])

            for scene in src:
                if not compile_scene_to_nscr(scene, f, options):
                    return False
    except Exception as e:
        sys.stderr.write("error. i/o error.\n")

        return False

    return True


# target KAG + TyranoScript 

def compile_scene_to_tyrano(src: dict, f, options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    img_dir = force_get_elm(options, 0, str, "")

    if img_dir != "":
        img_dir = img_dir + "\\"

    label_prefix = force_get_elm(options, 1, str, "label__")

    f.writelines([
        "*{}\n".format(label_prefix + src["name"]),
        '[bg storage="{}{}"]\n'.format(img_dir, src["bg"])
    ])

    if member_exists(src, "images", list):
        sys.stderr.write("warrning. images ware ignored\n")

    if member_exists(src, "buttons", list):
        wrn_head = False

        for btn in src["buttons"]:
            if (type(btn) == dict 
                    and "x" in btn.keys() and "y" in btn.keys() 
                    and "w" in btn.keys() and "h" in btn.keys()
                    and "next" in btn.keys()):
                f.writelines([
                    '[clickable x="{}" y="{}" width="{}" height="{}" target="*{}"'
                        .format(
                            btn["x"], btn["y"],
                            btn["x"] + btn["w"], btn["y"] + btn["h"], 
                            label_prefix + btn["next"]) +
                    (' storage="{}.ks"'.format(btn["file"]) if "file" in btn.keys() else '') +
                    ']\n'
                ])
            else:
                if not wrn_head:
                    sys.stderr.write("warrning. button ignored:\n")
                    wrn_head = True
    
                json.dump(btn, sys.stderr)
                sys.stderr.write("\n")

        f.write("[s]\n")

    return True

def complie_scenes_to_tyrano(src_file, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    dst_file = get_dst_file_name(src_file, dst_dir, ".ks")

    try:
        with io.open(dst_file, "w") as f:
            f.writelines([
                "*start\n"
                "[clearfix]\n",
                "[cm]\n",
            ])

            for scene in src:
                if not compile_scene_to_tyrano(scene, f, options):
                    return False
    except Exception as e:
        sys.stderr.write("error. i/o error.\n")

        return False

    return True


# target KAG3 + Kirikiri2/Z

def compile_scene_to_krkr(src: dict, f, options=[]) -> bool:
    if not ("bg" in src.keys() and "name" in src.keys()):
        sys.stderr.write("error. no name nor bg exist.\n")

        return False

    img_dir = force_get_elm(options, 0, str, "")

    if img_dir != "":
        img_dir = img_dir + "\\"

    label_prefix = force_get_elm(options, 1, str, "label__")
    label = label_prefix + src["name"]

    f.writelines([
        "*{}\n".format(label_prefix + src["name"]),
        '[freeimage layer="base"]\n',
        "[cm]\n",
        '[image layer="base" index="0" left="0" top="0" storage="{}{}"]\n'.format(img_dir, src["bg"])
    ])

    if member_exists(src, "images", list):
        sys.stderr.write("warrning. images ware ignored\n")

    if member_exists(src, "buttons", list):
        wrn_head = False

        for btn in src["buttons"]:
            if (type(btn) == dict 
                    and "x" in btn.keys() and "y" in btn.keys() 
                    and "w" in btn.keys() and "h" in btn.keys()
                    and "next" in btn.keys()):
                f.writelines([
                    '[clickable x="{}" y="{}" width="{}" height="{}" target="*{}"'
                        .format(
                            btn["x"], btn["y"],
                            btn["w"], btn["h"], 
                            label_prefix + btn["next"]) +
                    (' storage="{}.ks"'.format(btn["file"]) if "file" in btn.keys() else '') +
                    ']\n'
                ])
            else:
                if not wrn_head:
                    sys.stderr.write("warrning. button ignored:\n")
                    wrn_head = True
    
                json.dump(btn, sys.stderr)
                sys.stderr.write("\n")

        f.write("[s]\n")

    return True

def complie_scenes_to_krkr(src_file, src, dst_dir: str=".", options=[]) -> bool:
    if type(src) == dict:
        src = [src]
    
    if type(src) != list:
        sys.stderr.write("error. invalid format.\n")

        return False

    dst_file = get_dst_file_name(src_file, dst_dir, ".ks")

    try:
        with io.open(dst_file, "w") as f:
            f.writelines([
                "*start\n",
                '[call target="*init_clickable" storage="clickable.ks"]\n'
            ])

            for scene in src:
                if not compile_scene_to_krkr(scene, f, options):
                    return False
    except Exception as e:
        sys.stderr.write("error. i/o error.\n")
        sys.stderr.write(str(e))

        return False

    return True



def compile_error(src_file, src = None, dst_dir=".", options={}):
    sys.stderr.write("error. file {} is not compilable script.\n".format(src_file))

    return False

def main(argv):
    if (len(argv) < 2 
            or not argv[1].endswith(".json")):

        sys.stdout.write("""
portable click-adventure compiler
python pocodoodles.py input_file [dst_dir] [target] [target_specific_parameters...]
targets:
  map: HTMLs + map. works even on old browsers without JavaScript and any runtime.
    parameters: ... [dst_file_prefix] [img_dir]
  phaser: HTML + Phaser. adds Scenes to Array of Scene.
    parameters: ... [var_scenes_name] [scene_prefix] [img_dir]
  form: C# + Windows.Forms.Form.
    parameters: ... [class_name] [first_scene] [img_dir]
  hsp: HSP3 (not tested)
    parameters: ... [img_dir] [label_prefix]
  tyrano: KAG (TyranoScript)
    parameters: ... [img_dir] [label_prefix]
  krkr: KAG3 (Kirikiri2 / KirikiriZ? (not tested))
    parameters: ... [img_dir] [label_prefix]
  nscr: NScripter1
    parameters: ... [var_x_idx] [var_y_idx] [img_dir] [label_prefix]
  msdos: NASM (MS-DOS + VGA + MOUSE.EXE)
    parameters: ... [img_ext] [img_dir] [label_prefix]
other targets(this script does not treat): canvas, enchant.js, kontra.js
""")
        return

    src_file = argv[1]

    try:
        with io.open(src_file, "r") as f:
            src = json.load(f)
    except:
        sys.stderr.write("src is not valid json.\n")
        return

    dst_dir = "."

    if len(argv) > 2:
        dst_dir = argv[2]

    target = "map"

    if len(argv) > 3:
        target = argv[3]
        options = argv[4:]
    else:
        options = []

    # synta-sugar
    def f(src):
        if ("buttons" in src.keys()
                and "btnW" in src.keys()
                and "btnH" in src.keys()):
            
            def f2(src2):
                if not ("w" in src2.keys()):
                    src2["w"] = src["btnW"]
                if not ("h" in src2.keys()):
                    src2["h"] = src["btnH"]
                return src2

            src = map(f2, src)
        
        return src
#    src = map(f, src)

    if target == "map":
        compile = complie_scenes_to_map
    elif target == "phaser":
        compile = complie_scenes_to_phaser
    elif target == "form":
        compile = complie_scenes_to_form
    elif target == "hsp":
        compile = complie_scenes_to_hsp
    elif target == "tyrano":
        compile = complie_scenes_to_tyrano
    elif target == "krkr":
        compile = complie_scenes_to_krkr
    elif target == "nscr":
        compile = complie_scenes_to_nscr
    elif target == "msdos":
        compile = complie_scenes_to_msdos
    else:
        compile = (lambda x, y, z, o: not compile_error(x, y, z, o))

    if not compile(src_file, src, dst_dir, options):
        compile_error(src_file, src, dst_dir, options)

if __name__ == "__main__":
    main(sys.argv)
