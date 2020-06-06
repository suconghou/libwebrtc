import wsocket from './ws'
const baseURL = 'ws://127.0.0.1:9090/channel/json/uid/'
let uid = '';
export const ws = (ev?: any) => {
    let event = '';
    if (!ev) {
        // ev 传入空字符串清空订阅, 传入false或不传不修改订阅
        event = ev;
    } else {
        event = `rtc:${ev}`;
    }
    const url = baseURL + uuid();
    return wsocket.getWs(
        url,
        (data: any) => {
            return {
                ev: `${data.event}`,
                data: data
            };
        },
        event
    );
}

export const uuid = () => {
    if (uid) {
        return uid;
    }
    uid = localStorage.getItem('uid')
    if (!uid || uid.length != 36) {
        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(36)
        }
        uid = (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        localStorage.setItem('uid', uid)
    }
    return uid
}

const logevel = sessionStorage.getItem('loglevel') || 'warn'

export const warn = ['warn', 'info', 'log'].includes(logevel) ? console.warn.bind(console) : () => { }
export const info = ['info', 'log'].includes(logevel) ? console.info.bind(console) : () => { }
export const log = ['log'].includes(logevel) ? console.log.bind(console) : () => { }