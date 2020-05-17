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
    uid = sessionStorage.getItem('uid')
    if (!uid) {
        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
        uid = (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        sessionStorage.setItem('uid', uid)
    }
    return uid
}