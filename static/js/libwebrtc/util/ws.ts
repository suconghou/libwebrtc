// 低级封装
/**
 * ws = new wsJson("ws://xxx")
 * ws.sendJson()
 * ws.listen('message',()=>{})
 * ws.remove('message',fn)
 */
export class wsJson {
    private $ws: WebSocket | null = null;
    private tasks: Array<string> = [];
    private runing: Boolean = false;
    private clientList: Map<string, Array<Function>> = new Map();
    private timer: any;

    constructor(private addr: string) {
        this.connect();
    }
    private connect() {
        if (this.$ws && (this.$ws.readyState == this.$ws.OPEN || this.$ws.readyState == this.$ws.CONNECTING)) {
            this.stopconnect();
            return;
        }
        this.$ws = new WebSocket(this.addr);
        this.$ws.onopen = (ev: Event) => {
            this.trigger('open', ev);
            this.stopconnect();
            this.notify();
        };
        this.$ws.onmessage = (ev: MessageEvent) => {
            try {
                if (ev.data) {
                    const res = JSON.parse(ev.data);
                    this.trigger('message', res);
                }
            } catch (e) {
                // eslint-disable-next-line
                console.error(e);
            }
        };
        this.$ws.onclose = (ev: CloseEvent) => {
            this.trigger('close', ev);
            this.startconnect();
        };
        this.$ws.onerror = (ev: Event) => {
            this.trigger('error', ev);
            this.startconnect();
        };
    }

    private startconnect() {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (window.navigator.onLine === false) {
                return;
            }
            this.connect();
        }, 2000);
    }

    private stopconnect() {
        clearInterval(this.timer);
    }

    private notify() {
        if (this.runing) {
            return;
        }
        this.runing = true;
        if (this.$ws && this.$ws.readyState == this.$ws.OPEN) {
            let item;
            while ((item = this.tasks.shift())) {
                this.$ws.send(item);
            }
        } else {
            this.startconnect();
        }
        this.runing = false;
    }

    public sendJson(data: Object): this {
        try {
            const str = JSON.stringify(data);
            if (str) {
                this.tasks.push(str);
                this.notify();
            }
        } catch (e) {
            // eslint-disable-next-line
            console.error(e);
        }
        return this;
    }

    private trigger(ev: string, data: Object) {
        const fns = this.clientList.get(ev);
        if (!fns || fns.length === 0) {
            return;
        }
        for (let fn of fns) {
            fn(data);
        }
    }

    public listen(ev: string, fn: Function): this {
        const fns = this.clientList.get(ev);
        if (!fns) {
            this.clientList.set(ev, [fn]);
            return this;
        }
        // 反向遍历
        for (let i = fns.length - 1; i >= 0; i--) {
            let _fn = fns[i];
            if (_fn === fn) {
                // 已添加过,此处忽略重复添加
                return this;
            }
        }
        fns.push(fn);
        return this;
    }

    public remove(ev: string, fn: Function): this {
        const fns = this.clientList.get(ev);
        if (!fns) {
            return this;
        }
        // 没有传入fn(具体的回调函数), 表示取消key对应的所有订阅
        if (!fn) {
            fns.length = 0;
        } else {
            // 反向遍历
            for (let i = fns.length - 1; i >= 0; i--) {
                let _fn = fns[i];
                if (_fn === fn) {
                    // 删除订阅回调函数
                    fns.splice(i, 1);
                }
            }
        }
        return this;
    }
}

// 默认是一个单例模式的封装
/**
 * 高级封装,主要用于订阅和发布者模式
 *
 * const ws = (ev)=>wsSingle.getWs('ws://xxx',dispath,ev)
 *
 * ws(ev).listen()
 * ws(ev).remove()
 */
export default class wsSingle {
    private static single: wsSingle;
    private static ws: wsJson;
    private static ev: string;
    private static dispatch: Function;
    private clientList: Map<string, Array<Function>> = new Map();

    private constructor(addr: string) {
        if (!wsSingle.ws) {
            wsSingle.ws = new wsJson(addr);
            wsSingle.ws.listen('open', () => {
                if (wsSingle.ev) {
                    wsSingle.ws.sendJson({ listen: true, event: wsSingle.ev });
                }
            });
            wsSingle.ws.listen('message', (msg: Object) => {
                const { ev, data } = wsSingle.dispatch(msg);
                this.trigger(ev, data);
            });
        }
    }

    public static getWs(addr: string, dispatch: Function, ev: string) {
        if (!this.single) {
            this.ev = ev;
            this.dispatch = dispatch;
            this.single = new this(addr);
        }
        if (ev === '') {
            // 传入空字符串清空订阅
            if (this.ev) {
                this.ws.sendJson({ listen: false, event: this.ev });
            }
            this.ev = ev;
        } else if (!ev) {
            // 传入false,null,undefined不修改订阅
        } else if (ev !== this.ev) {
            if (this.ev) {
                this.ws.sendJson({ listen: false, event: this.ev });
            }
            this.ws.sendJson({ listen: true, event: ev });
            this.ev = ev;
        }
        return this.single;
    }

    private trigger(ev: string, data: Object) {
        const fns = this.clientList.get(ev);
        if (!fns || fns.length === 0) {
            return;
        }
        for (let fn of fns) {
            fn(data);
        }
    }

    public listen(ev: string, fn: Function): this {
        const fns = this.clientList.get(ev);
        if (!fns) {
            this.clientList.set(ev, [fn]);
            return this;
        }
        // 反向遍历
        for (let i = fns.length - 1; i >= 0; i--) {
            let _fn = fns[i];
            if (_fn === fn) {
                // 已添加过,此处忽略重复添加
                return this;
            }
        }
        fns.push(fn);
        return this;
    }

    public remove(ev: string, fn: Function): this {
        const fns = this.clientList.get(ev);
        if (!fns) {
            return this;
        }
        // 没有传入fn(具体的回调函数), 表示取消key对应的所有订阅
        if (!fn) {
            fns.length = 0;
        } else {
            // 反向遍历
            for (let i = fns.length - 1; i >= 0; i--) {
                let _fn = fns[i];
                if (_fn === fn) {
                    // 删除订阅回调函数
                    fns.splice(i, 1);
                }
            }
        }
        return this;
    }

    public sendJson(data: Object): this {
        wsSingle.ws.sendJson(data);
        return this;
    }
}
