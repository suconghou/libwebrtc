import { peerState } from './types'
import conn from './conn';

export default class {

    public state: peerState;
    private conn: conn;
    constructor(public readonly id: string, private passive: boolean, private readonly servers: RTCConfiguration, onmsg: Function) {
        this.state = peerState.CONNECTING
        this.conn = new conn(id, servers, (type: string, e: MessageEvent) => {
            if (type == 'message') {
                onmsg(e)
            } else if (type == 'open') {
                this.state = peerState.OPEN
            } else {
                // close, error
                this.state = peerState.CLOSE
            }
        })
    }


    public connect() {
        this.passive = false
        this.conn.connect()
    }

    public waitForConnect() {
        this.passive = true
    }

    public onOffer(sdp: RTCSessionDescription) {
        this.conn.onOffer(sdp)
    }

    public onAnswer(sdp: RTCSessionDescription) {
        this.conn.onAnswer(sdp)
    }

    public onCandidate(candidate: RTCIceCandidate) {
        this.conn.onCandidate(candidate)
    }

    send(data: any) {
        return this.conn.send(data)
    }

    stat() {
        return this.conn.stat()
    }

}

