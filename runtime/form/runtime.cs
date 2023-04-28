using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;


namespace Pocodoodles {


public class ClickableAreaScript {
    string imgName = "";
    public string ImgName {
        get => imgName;
        protected set => imgName = value;
    }
    string nextSceneName = "";
    public string NextSceneName {
        get => nextSceneName;
        protected set => nextSceneName = value;
    }
    public Point Point {
        get => area.Location;
        protected set 
        {
            if (area == null)
                area = new Rectangle(value, new Size(0, 0));
            else
                area.Location = value;
        }
    }
    Rectangle area;
    public Rectangle Area {
        get => area;
        protected set => area = value;
    }

    public ClickableAreaScript(string imgName, Rectangle area, string nextSceneName) 
    {
        this.imgName = imgName;
        this.area = area;
        this.nextSceneName = nextSceneName;
    }
    public ClickableAreaScript(Rectangle area, string nextSceneName) 
        : this("", area, nextSceneName)
    {}
    public ClickableAreaScript(string imgName, Point point, string nextSceneName) 
        : this(
            "", 
            new Rectangle(point, new Size(0, 0)), 
            nextSceneName)
    {
        this.Point = point;
    }
}
class ClickableArea : ClickableAreaScript, IDisposable {
    public ClickableArea(Rectangle area, string nextSceneName)
        : base("", area, nextSceneName)
    {}
    protected ClickableArea(string imgName, Point point, string nextSceneName)
        : base(imgName, point, nextSceneName)
    {}

    public ClickableArea(ClickableAreaScript script)
        : this(
            script.Area, 
            script.NextSceneName)
    {}

    ~ClickableArea() => Dispose();

    public static ClickableArea FromScript(ClickableAreaScript script)
        => new ClickableArea(script);

    public virtual void Dispose()
    {}

    public bool Contains(Point p) => Area.Contains(p);

    public virtual void Paint(Graphics g) 
    {}

}
class ClickableImageArea : ClickableArea {
    Bitmap img = null;
    public Bitmap Img => img;

    public ClickableImageArea(string imgName, Point point, string nextSceneName)
        : base(imgName, point, nextSceneName)
    {
        if (imgName != "")
        {
            img = new Bitmap(imgName);

            this.Area = new Rectangle(Point, img.Size);
        }
    }
    public ClickableImageArea(string imgName, Rectangle area, string nextSceneName)
        : this(imgName, area.Location, nextSceneName)
    {
        if (img != null)
            this.Area = area;
        else if (area != this.Area)
            throw new Exception("");
    }

    ~ClickableImageArea() => Dispose();


    public static new ClickableArea FromScript(ClickableAreaScript script)
    {
        return script.ImgName == ""
            ? new ClickableArea(script)
            : new ClickableImageArea(
                script.ImgName, 
                script.Point, 
                script.NextSceneName);
    }

    public override void Dispose()
    {
        if (img != null) 
        {
            img.Dispose();
            img = null;
        }
    }

    public override void Paint(Graphics g) 
    {
        if (img != null) g.DrawImage(img, Area.Location);
    }
}
public class SceneScript {
    string name;
    public string Name {
        get => name;
        protected set => name = value;
    }
    string bgImgName;
    public string BgImgName {
        get => bgImgName;
        protected set => bgImgName = value;
    }
    ClickableAreaScript[] areas;
    public ClickableAreaScript[] Areas {
        get => areas;
        protected set => areas = value;
    }

    public SceneScript(
        string name, 
        string bgImgName, 
        ClickableAreaScript[] areas) 
    {
        this.name = name;
        this.bgImgName = bgImgName;
        this.areas = areas;
    }
}
class Scene : SceneScript, IDisposable {
    Bitmap bgImg;
    public Bitmap BgImg => bgImg;

    public new ClickableArea[] Areas {
        get => (ClickableArea[])base.Areas;
        protected set => base.Areas = (ClickableAreaScript[])value;
    }
    public Scene(string name, string bgImgName, ClickableArea[] areas)
        : base(name, bgImgName, areas)
    {
        if (bgImgName != "")
            this.bgImg = new Bitmap(bgImgName);
    }

    public Scene(SceneScript script)
        : this(
            script.Name, 
            script.BgImgName, 
            AreasFromScript(script.Areas))
    {}

    static ClickableArea[] AreasFromScript(ClickableAreaScript[] script)
    {
        var r = new ClickableArea[script.Length];

        for (int i = 0; i < r.Length; ++i)
            r[i] = ClickableImageArea.FromScript(script[i]);

        return r;
    }

    ~Scene() => Dispose();
    
    public void Dispose()
    {
        if (bgImg != null) {
            bgImg.Dispose();
            bgImg = null;
        }

        if (Areas != null)
        {
            for (int i = 0; i < Areas.Length; ++i)
                Areas[i].Dispose();

            Areas = null;
        }
    }

    public string GetNextSceneNameFromPoint(Point p) {
        if (Areas != null)
            for (var i = Areas.Length; i-- > 0;) {
                if (Areas[i].Contains(p))
                    return Areas[i].NextSceneName;
            }

        return "";
    }

    public void Paint(Graphics g) {
        if (bgImg != null) g.DrawImage(bgImg, 0, 0);

        if (Areas != null)
            for (int i = 0; i < Areas.Length; ++i)
                Areas[i].Paint(g);
    }
}

public class GameForm : Form {
    Dictionary<string, SceneScript> script = null;
    public Dictionary<string, SceneScript> Script {
        get => script;
        protected set => script = value;
    }
    Scene scene = null;

    public DialogResult ShowDialog(string firstSceneName = "start")
    {
        if (scene != null)
            scene.Dispose();

        if (script != null)
            scene = new Scene(script[firstSceneName]);

        return base.ShowDialog();
    }

    protected override void OnMouseUp(MouseEventArgs e) {
        if (scene == null) return;

        string nextSceneName = 
            scene.GetNextSceneNameFromPoint(e.Location);

        if (nextSceneName != "" && nextSceneName != scene.Name) {
            var scene2 = new Scene(script[nextSceneName]);

            scene.Dispose();

            scene = scene2;
            Refresh();
        }
    }

    protected override void OnPaint(PaintEventArgs e) {
        if (scene == null) return;
        
        Size = scene.BgImg.Size;
        scene.Paint(e.Graphics);
    }

    public new void Dispose() {
        if (scene != null) scene.Dispose();

        base.Dispose();
    }
}


}
