export default class event {
    constructor() {
        this.clientList = new Map();
    }
    trigger(ev, ...args) {
        const fns = this.clientList.get(ev);
        if (!fns || fns.length === 0) {
            return;
        }
        for (let fn of fns) {
            fn.apply(null, args);
        }
    }
    listen(ev, fn) {
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
    remove(ev, fn) {
        if (!ev) {
            this.clientList.clear();
            return this;
        }
        const fns = this.clientList.get(ev);
        if (!fns) {
            return this;
        }
        // 没有传入fn(具体的回调函数), 表示取消key对应的所有订阅
        if (!fn) {
            fns.length = 0;
        }
        else {
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
