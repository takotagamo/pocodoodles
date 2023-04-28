
namespace Pocodoodle {
    export function saturate(i: number, min: number, max: number): number {
        return i <= min ?
                min :
                i >= max ?
                    max :
                    i;
    }

    export function objectEqual<T extends {}>(o1: T, o2: T): boolean {
        return objectEqualWithMemo(o1, o2);
    }
    // memo1+memo2: 仮想のDictionary<o1, List<o2>>
    // memo1: o1。keys。
    // memo2: o1と一致したo2。values。
    function objectEqualWithMemo(o1: any,
                                 o2: any,
                                 memo1: any[] = [],
                                 memo2: any[][] = []): boolean {
        if (o1 === o2) return true;

        let memoIdx = memo1.indexOf(o1);

        if (memoIdx == -1) {
            memo1.push(o1);
            memo2.push([]);

            memoIdx = memo1.indexOf(o1);
        }

        let memoForO1 = memo2[memoIdx];

        if (memoForO1.indexOf(o2) != -1) return true;

        memoForO1.push(o2);

        let r: boolean = true;

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

    export function zip<T>(f: (a: T, b: T) => T, x: T[], y: T[]): T[] {
        let len = Math.min(x.length, y.length);
        let r = new Array(len);

        let i: number;
        for (i = 0; i < len; ++i) {
            r[i] = f(x[i], y[i]);
        }

        return r;
    }

    export function makeObject<T>(factory: () => T): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                resolve(factory());
            } catch(e) {
                reject(e);
            }
        });
    }


    export interface Point { x: number; y: number; }
    export interface PxPoint extends Point {}
    export interface UnitPxPoint extends Point {}
    export interface UnitPoint extends Point {}
    /// タイル単位の座標
    export interface AreaPoint extends Point {}

    export function pointInRect<TPoint1 extends Point,
                                TPoint2 extends Point>(p: TPoint1, 
                                                       pR0: TPoint2,
                                                       pR1: TPoint2): boolean {
        return saturate(p.x, pR0.x, pR1.x - 1) == p.x &&
            saturate(p.y, pR0.y, pR1.y - 1) == p.y;
    }

    export interface Size { w: number; h: number; }
    export interface PxSize extends Size {}
    // タイル単位のサイズ
    export interface AreaSize extends Size {}

    export type Direction = -1 | 0 | 1 | -0;
    export type Direction2D = { x: Direction, y: Direction };

    export const DIRECTION_NONE: Direction2D = { x: 0, y: 0 };
    export const DIRECTION_LEFT: Direction2D = { x: -1, y: 0 };
    export const DIRECTION_RIGHT: Direction2D = { x: 1, y: 0 };
    export const DIRECTION_UP: Direction2D = { x: 0, y: -1 };
    export const DIRECTION_DOWN: Direction2D = { x: 0, y: 1 };


    export function lazy<T>(generator: () => T): Promise<() => T> {
        return new Promise((resolve, reject) => {
            resolve(generator);
        });
    }
}
