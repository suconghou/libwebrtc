class event {
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

// 低级封装
class wsJson extends event {
    constructor(addr) {
        super();
        this.addr = addr;
        this.$ws = null;
        this.tasks = [];
        this.runing = false;
        if (addr) {
            this.connect();
        }
    }
    // update 仅在下次重新连接时生效
    update(addr) {
        this.addr = addr;
        this.connect();
    }
    connect() {
        if (this.$ws && (this.$ws.readyState == this.$ws.OPEN || this.$ws.readyState == this.$ws.CONNECTING)) {
            this.stopconnect();
            return;
        }
        this.$ws = new WebSocket(this.addr);
        this.$ws.binaryType = 'arraybuffer';
        this.$ws.onopen = (ev) => {
            this.trigger('open', ev);
            this.stopconnect();
            this.notify();
        };
        this.$ws.onmessage = (ev) => {
            this.trigger('message', ev);
        };
        this.$ws.onclose = (ev) => {
            this.trigger('close', ev);
            this.startconnect();
        };
        this.$ws.onerror = (ev) => {
            this.trigger('error', ev);
            this.startconnect();
        };
    }
    startconnect() {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (window.navigator.onLine === false) {
                return;
            }
            this.connect();
        }, 2000);
    }
    stopconnect() {
        clearInterval(this.timer);
    }
    notify() {
        if (this.runing) {
            return;
        }
        this.runing = true;
        if (this.$ws && this.$ws.readyState == this.$ws.OPEN) {
            let item;
            while ((item = this.tasks.shift())) {
                this.$ws.send(item);
            }
        }
        else {
            this.startconnect();
        }
        this.runing = false;
    }
    sendJson(data) {
        try {
            const str = JSON.stringify(data);
            if (str) {
                this.tasks.push(str);
                this.notify();
            }
        }
        catch (e) {
            console.error(e);
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
class wsSingle extends event {
    constructor(addr) {
        super();
        if (!wsSingle.ws) {
            wsSingle.ws = new wsJson(addr);
            wsSingle.ws.listen('open', () => {
                if (wsSingle.ev) {
                    wsSingle.ws.sendJson({ listen: true, event: wsSingle.ev });
                }
            });
            wsSingle.ws.listen('message', (msg) => {
                const { ev, data } = wsSingle.dispatch(msg);
                this.trigger(ev, data);
            });
        }
    }
    static getWs(addr, dispatch, ev) {
        if (!this.single) {
            this.ev = ev;
            this.dispatch = dispatch;
            this.single = new this(addr);
        }
        if (addr) {
            wsSingle.ws.update(addr);
        }
        if (ev === '') {
            // 传入空字符串清空订阅
            if (this.ev) {
                this.ws.sendJson({ listen: false, event: this.ev });
            }
            this.ev = ev;
        }
        else if (!ev) ;
        else if (ev !== this.ev) {
            if (this.ev) {
                this.ws.sendJson({ listen: false, event: this.ev });
            }
            this.ws.sendJson({ listen: true, event: ev });
            this.ev = ev;
        }
        return this.single;
    }
    sendJson(data) {
        wsSingle.ws.sendJson(data);
        return this;
    }
}

const baseURL = localStorage.getItem('ws') || 'wss://ws.feds.club/uid/';
let uid = '';
const ws = (ev) => {
    let event = '';
    if (!ev) {
        // ev 传入空字符串清空订阅, 传入false或不传不修改订阅
        event = ev;
    }
    else {
        event = `rtc:${ev}`;
    }
    const url = baseURL + uuid();
    return wsSingle.getWs(url, (event) => {
        const data = JSON.parse(event.data);
        return {
            ev: `${data.event}`,
            data: data
        };
    }, event);
};
const uuid = () => {
    if (uid) {
        return uid;
    }
    uid = sessionStorage.getItem('uid');
    if (!uid || uid.length != 36) {
        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(36);
        }
        uid = (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        sessionStorage.setItem('uid', uid);
    }
    return uid;
};
const sleep = async (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};
const logevel = sessionStorage.getItem('loglevel');
const warn = ['warn', 'info', 'log'].includes(logevel) ? console.warn.bind(console) : () => { };
const info = ['info', 'log'].includes(logevel) ? console.info.bind(console) : () => { };
const log = ['log'].includes(logevel) ? console.log.bind(console) : () => { };
const concatArrayBuffers = (buffer1, buffer2) => {
    if (!buffer1) {
        return buffer2;
    }
    else if (!buffer2) {
        return buffer1;
    }
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
};
const ab2str = (buf) => {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
};
const str2ab = (str) => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};
const padRight = (str, max) => {
    const n = max - str.length;
    if (n > 0) {
        return str + " ".repeat(n);
    }
    return str;
};

class peer {
    constructor(id, servers, onmsg) {
        this.id = id;
        this.servers = servers;
        this.onmsg = onmsg;
        this.tx = 0;
        this.rx = 0;
        this.restart = 0;
        this.init();
    }
    init() {
        if (this.c) {
            try {
                this.c.close();
            }
            catch (e) {
                log(e);
            }
        }
        this.c = new RTCPeerConnection(this.servers);
        this.c.onnegotiationneeded = async (ev) => {
            log(ev);
            try {
                const offer = await this.c.createOffer();
                await this.c.setLocalDescription(offer);
                // send sdp to ws server
                ws().sendJson({ event: 'offer', to: this.id, from: uuid(), data: offer });
                log(offer);
            }
            catch (e) {
                warn(e);
            }
        };
        this.c.ondatachannel = (ev) => {
            // 对方建立了 datachannel, 我方收到就维护起来
            if (this.dc) {
                try {
                    this.dc.close();
                }
                catch (e) {
                    log(e);
                }
            }
            this.dc = ev.channel;
            this.dc.binaryType = 'arraybuffer';
            this.dcInit();
            log(ev);
        };
        this.c.onconnectionstatechange = (ev) => {
            log(ev);
        };
        this.c.onicecandidateerror = (ev) => {
            warn(ev);
        };
        this.c.onicegatheringstatechange = (ev) => {
            log(ev);
        };
        this.c.oniceconnectionstatechange = (ev) => {
            log(ev);
        };
        this.c.onicecandidate = (ev) => {
            log(ev);
            if (ev.candidate) {
                const data = {
                    event: 'candidate',
                    from: uuid(),
                    to: this.id,
                    data: ev.candidate
                };
                ws().sendJson(data);
                log("send candidate", data);
            }
        };
    }
    waitForConnect() {
    }
    // 我主动链接这个ID
    async connect() {
        log("i connect ", this.id);
        const connect = () => {
            this.init();
            if (this.dc) {
                try {
                    this.dc.close();
                }
                catch (e) {
                    log(e);
                }
            }
            this.dc = this.c.createDataChannel("dc", { maxPacketLifeTime: 2000 });
            this.dc.binaryType = 'arraybuffer';
            this.dcInit();
        };
        if (this.c && this.c.connectionState == 'connected' && this.dc && this.dc.readyState == 'open') {
            info("connection to ", this.id, " is already open");
            // 对方刷新时,我方执行此逻辑;这个到底是不是链接着的,我们再发送一个ping探测一下
            this.send(JSON.stringify({ event: 'ping' }));
            clearTimeout(this.restart);
            this.restart = setTimeout(() => connect(), 5e3);
            return;
        }
        connect();
    }
    dcInit() {
        window.addEventListener('beforeunload', () => {
            this.c.close();
            this.dc.close();
        });
        this.dc.onopen = (e) => {
            warn("dc open me : " + uuid() + " remote: " + this.id, e);
            this.onmsg('open', e);
        };
        this.dc.onclose = e => {
            warn("dc close " + this.id, e);
            this.onmsg('close', e);
        };
        this.dc.onerror = e => {
            warn("dc error " + this.id, e);
            this.onmsg('error', e);
        };
        this.dc.addEventListener('closing', (e) => {
            warn("dc closing " + this.id, e);
            this.onmsg('closing', e);
        });
        this.dc.onmessage = async (e) => {
            clearTimeout(this.restart);
            let data = e.data;
            if (data instanceof Blob) {
                // 火狐浏览器始终是blob格式,这里修正
                data = await e.data.arrayBuffer();
            }
            if (data instanceof ArrayBuffer) {
                this.rx += data.byteLength;
            }
            else {
                this.rx += data.length;
            }
            this.onmsg('message', { data });
        };
    }
    async onOffer(sdp) {
        if (this.c.signalingState == 'closed') {
            warn("onOffer error signalingState is closed");
            return;
        }
        await this.c.setRemoteDescription(sdp);
        const answer = await this.c.createAnswer();
        await this.c.setLocalDescription(answer);
        // PeerConnection cannot create an answer in a state other than have-remote-offer or have-local-pranswer.
        const data = {
            event: "answer",
            from: uuid(),
            to: this.id,
            data: answer,
        };
        log("send answer", data);
        ws().sendJson(data);
    }
    async onAnswer(sdp) {
        if (['closed'].includes(this.c.signalingState)) {
            warn("onAnswer error signalingState is " + this.c.signalingState);
            return;
        }
        await this.c.setRemoteDescription(sdp);
        info('setRemoteDescription', sdp);
        // 设置后,链接建立完毕
    }
    async onCandidate(candidate) {
        if (['closed'].includes(this.c.signalingState)) {
            warn("onCandidate error signalingState is " + this.c.signalingState);
            return;
        }
        this.c.addIceCandidate(candidate);
        log("made connection ", this.id);
    }
    send(data) {
        if (!this.dc) {
            log("data channel to " + this.id + " is not avaiable");
            return;
        }
        if (this.dc.readyState !== 'open') {
            log("data channel to " + this.id + " is not open");
            return;
        }
        try {
            const r = this.dc.send(data);
            if (data instanceof ArrayBuffer) {
                this.tx += data.byteLength;
            }
            else {
                this.tx += data.length;
            }
            return r;
        }
        catch (e) {
            warn(e);
            // 尝试重新建立连接
            this.connect();
        }
    }
    stat() {
        return {
            tx: this.tx,
            rx: this.rx,
            state: this.dc ? this.dc.readyState : '',
            cstate: this.c ? this.c.connectionState : '',
            istate: this.c ? this.c.iceConnectionState : '',
            gstate: this.c ? this.c.iceGatheringState : '',
        };
    }
}

const streams = new Map();
class manager extends event {
    constructor(servers) {
        super();
        this.servers = servers;
    }
    createPassive(uid) {
        // type message,open,close,error
        const s = new peer(uid, this.servers, (type, e) => {
            this.trigger(type, {
                uid,
                e,
            });
        });
        streams.set(uid, s);
        s.waitForConnect();
    }
    createPositive(uid) {
        const s = new peer(uid, this.servers, (type, e) => {
            this.trigger(type, {
                uid,
                e,
            });
        });
        streams.set(uid, s);
        s.connect();
    }
    ensureWaitIds(ids) {
        ids.forEach(id => {
            if (streams.has(id)) {
                // 是我断线重连,无论这些ID中,之前有我主动链接他的,也有他主动链接我的
                // 我重新上线后,都变成他们主动链接我
                const s = streams.get(id);
                s.waitForConnect();
            }
            else {
                // 是我首次上线,我需要等待这些id链接我
                this.createPassive(id);
            }
        });
    }
    ensureToConnect(id) {
        if (streams.has(id)) {
            // 如果对方是断线重连,无论之前是他早于我上线(他链接的我),还是我早于他上线(我链接的他)
            // 再次上线后,都变成我主动链接他
            const s = streams.get(id);
            s.connect();
        }
        else {
            // 如果对方是首次上线,我方应该主动
            this.createPositive(id);
        }
    }
    // 我方上线消息被对方察觉,然后主动链接我方,向我发来了offer
    // 我方应 setRemoteDescription,createAnswer,setLocalDescription,ws.send
    async onOffer(from, sdp) {
        const s = streams.get(from);
        if (!s) {
            console.error("onOffer peer not found error");
            return;
        }
        s.onOffer(sdp);
    }
    // 我发送的offer对方给了回应,我马上就可以链接他了
    async onAnswer(from, sdp) {
        const s = streams.get(from);
        if (!s) {
            console.error("onAnswer peer not found error");
            return;
        }
        s.onAnswer(sdp);
    }
    async onCandidate(from, candidate) {
        const s = streams.get(from);
        if (!s) {
            console.error("onCandidate peer not found error");
            return;
        }
        s.onCandidate(candidate);
    }
    sendTo(uuid, data) {
        const s = streams.get(uuid);
        if (!s) {
            console.error("uuid " + uuid + " not connected");
            return;
        }
        return s.send(data);
    }
    broadcast(data) {
        streams.forEach(item => {
            item.send(data);
        });
    }
    getPeers() {
        return streams.keys();
    }
    getStats() {
        const stat = {};
        streams.forEach(item => {
            stat[item.id] = item.stat();
        });
        return stat;
    }
}

const s = 51200;
class index extends event {
    constructor(servers) {
        super();
        this.servers = servers;
        this.buffers = new Map();
        this.m = new manager(servers);
        this.m.listen("message", (e) => {
            const data = e.e.data;
            if (data instanceof ArrayBuffer) {
                return this.extract(data, e.uid);
            }
            this.trigger("message", e);
        });
        this.m.listen("open", (e) => this.trigger("open", e));
        this.m.listen("close", (e) => this.trigger("close", e));
        this.m.listen("error", (e) => this.trigger("error", e));
        this.id = uuid();
    }
    extract(data, uid) {
        try {
            const headerLen = 30;
            let meta = ab2str(data.slice(0, headerLen)).trim();
            info(meta);
            if (!/^[!-~]+$/.test(meta)) {
                // 不是我们的分片数据直接交由其他程序处理
                this.trigger('message.buffer', { data, uid });
                return;
            }
            const buffer = data.slice(headerLen);
            const [id, i, n] = JSON.parse(meta);
            const item = this.buffers.get(id);
            if (item) {
                item[i] = buffer;
            }
            else {
                const b = [];
                b[i] = buffer;
                this.buffers.set(id, b);
            }
            // 分片协议前缀 ["id",i,n] ,分片传输中,可用于进度提示
            this.trigger('buffer.recv', {
                id,
                buffer,
                i,
                n,
                uid,
            });
            let done = true;
            const c = this.buffers.get(id);
            for (let j = 0; j < n; j++) {
                if (!c[j]) {
                    done = false;
                }
            }
            if (!done) {
                return;
            }
            let buffers = c[0];
            for (let j = 1; j < n; j++) {
                buffers = concatArrayBuffers(buffers, c[j]);
            }
            this.trigger('buffer', {
                id,
                buffer: buffers,
                uid,
            });
            this.buffers.delete(id);
        }
        catch (e) {
            console.error(e);
        }
    }
    init() {
        ws()
            .listen('offer', (data) => {
            this.m.onOffer(data.from, data.data);
        })
            .listen("answer", (data) => {
            this.m.onAnswer(data.from, data.data);
        })
            .listen("candidate", (data) => {
            this.m.onCandidate(data.from, data.data);
        })
            .listen('online', (data) => {
            if (data.id != this.id) {
                this.m.ensureToConnect(data.id);
            }
        })
            .listen('init', (data) => {
            this.m.ensureWaitIds(data.ids);
        });
    }
    // 向外暴露API
    // 单个发送
    sendTo(uuid, data) {
        return this.m.sendTo(uuid, data);
    }
    // 广播
    broadcast(data) {
        return this.m.broadcast(data);
    }
    getPeers() {
        return this.m.getPeers();
    }
    getStats() {
        return this.m.getStats();
    }
    async sendBuffer(uuid, data, id, cancel) {
        const datas = this.splitBuffer(data, id);
        for (let i = 0; i < datas.length; i++) {
            const item = datas[i];
            if (cancel(i, item)) {
                return;
            }
            this.sendTo(uuid, item.data);
            await sleep(500);
        }
    }
    broadcastBuffer(data, id) {
        const datas = this.splitBuffer(data, id);
        datas.forEach(item => {
            this.broadcast(item.data);
        });
    }
    splitBuffer(data, id) {
        let i = 0;
        let last = false;
        const datas = [];
        const n = Math.ceil(data.byteLength / s);
        while (true) {
            const start = s * i;
            let end = s * (i + 1);
            if (end >= data.byteLength) {
                end = data.byteLength;
                last = true;
            }
            const v = data.slice(start, end);
            let str = JSON.stringify([
                id.substring(0, 20),
                i,
                n,
            ]);
            const t = str2ab(padRight(str, 30));
            datas.push({
                start,
                end,
                i,
                data: concatArrayBuffers(t, v)
            });
            i++;
            if (last) {
                return datas;
            }
        }
    }
}

export { index as default };
