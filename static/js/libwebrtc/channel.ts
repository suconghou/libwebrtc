export default class {

    private channel: RTCDataChannel;

    constructor(conn: RTCPeerConnection, name: string) {
        this.channel = conn.createDataChannel(name);

        this.channel.onmessage = (ev: MessageEvent) => {
            console.info(ev)
        }

        this.channel.onopen = (ev: Event) => {
            console.info(ev)
        }

        this.channel.onclose = (ev: Event) => {
            console.info(ev)
        }
    }



}