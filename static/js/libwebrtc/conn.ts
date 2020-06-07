import { ws, uuid, warn, info, log } from './util/util'

export default class {
    private c: RTCPeerConnection

    private dc: RTCDataChannel;

    private tx: number = 0

    private rx: number = 0

    constructor(private readonly id: string, private readonly servers: RTCConfiguration, private readonly onmsg: Function) {
        this.init()
    }

    private init() {
        this.c = new RTCPeerConnection(this.servers);
        this.c.onnegotiationneeded = async (ev: Event) => {
            log(ev)
            try {
                const offer = await this.c.createOffer();
                await this.c.setLocalDescription(offer)
                // send sdp to ws server
                ws().sendJson({ event: 'offer', to: this.id, from: uuid(), data: offer })
                log(offer)
            } catch (e) {
                console.error(e)
            }
        }

        this.c.ondatachannel = (ev: RTCDataChannelEvent) => {
            // 对方建立了 datachannel, 我方收到就维护起来
            this.dc = ev.channel
            this.dcInit()

        }
        this.c.onconnectionstatechange = (ev: Event) => {
            log(ev)
        }
        this.c.onicecandidateerror = (ev: RTCPeerConnectionIceErrorEvent) => {
            log(ev)
        }

        this.c.onicegatheringstatechange = (ev: Event) => {
            log(ev)
        }

        this.c.oniceconnectionstatechange = (ev: Event) => {
            log(ev)
        }

        this.c.onicecandidate = (ev) => {
            log(ev)
            if (ev.candidate) {
                const data = {
                    event: 'candidate',
                    from: uuid(),
                    to: this.id,
                    data: ev.candidate
                }
                ws().sendJson(data)
                log("send candidate", data)
            }
        }
    }

    // 我主动链接这个ID
    async connect() {
        log("i connect ", this.id)
        this.init()
        this.dc = this.c.createDataChannel("dc")
        this.dcInit()
    }

    private dcInit() {
        this.dc.onopen = (e) => {
            warn("dc open me : " + uuid() + " remote: " + this.id, e)
            this.onmsg('open', e);
        }
        this.dc.onclose = e => {
            warn("dc close " + this.id, e)
            this.onmsg('close', e);
        }
        this.dc.onerror = e => {
            warn("dc error " + this.id, e)
            this.onmsg('error', e);
        }
        this.dc.onmessage = e => {
            this.rx += e.data.length
            this.onmsg('message', e)
        }
    }

    public async onOffer(sdp: RTCSessionDescription) {
        await this.c.setRemoteDescription(sdp)
        const answer = await this.c.createAnswer()
        await this.c.setLocalDescription(answer)
        const data = {
            event: "answer",
            from: uuid(),
            to: this.id,
            data: answer,
        }
        log("send answer", data)
        ws().sendJson(data)
    }

    public async onAnswer(sdp: RTCSessionDescription) {
        await this.c.setRemoteDescription(sdp)
        info('setRemoteDescription', sdp)
        // 设置后,链接建立完毕
    }

    public async onCandidate(candidate: RTCIceCandidate) {
        this.c.addIceCandidate(candidate)
        info("made connection ", this.id)
    }


    send(data: any) {
        if (!this.dc) {
            warn("data channel to " + this.id + " is not avaiable")
            return
        }
        if (this.dc.readyState !== 'open') {
            warn("data channel to " + this.id + " is not open")
            return
        }
        const r = this.dc.send(data)
        this.tx += data.length
        return r
    }

    stat() {
        return {
            tx: this.tx,
            rx: this.rx,
            state: this.dc ? this.dc.readyState : '',
        }
    }

}