import { ws, uuid } from './util/util'

export default class {
    private c: RTCPeerConnection

    private dc: RTCDataChannel;

    constructor(private readonly id: string, private readonly servers: RTCConfiguration) {
        this.init()
    }

    private init() {
        this.c = new RTCPeerConnection(this.servers);
        this.c.onnegotiationneeded = async (ev: Event) => {
            console.log(ev)
            try {
                const offer = await this.c.createOffer();
                await this.c.setLocalDescription(offer)
                // send sdp to ws server
                ws().sendJson({ event: 'offer', to: this.id, from: uuid(), data: offer })
                console.log(offer)
                // wait for remote sdp and then set 
                // this.c.setRemoteDescription(offer)

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
            console.log(ev)
        }
        this.c.onicecandidateerror = (ev: RTCPeerConnectionIceErrorEvent) => {
            console.log(ev)
        }

        this.c.onicegatheringstatechange = (ev: Event) => {
            console.log(ev)
        }

        this.c.oniceconnectionstatechange = (ev: Event) => {
            console.log(ev)
        }

        this.c.onicecandidate = (ev) => {
            console.log("onicecandidate", ev)
            if (ev.candidate) {
                const data = {
                    event: 'candidate',
                    from: uuid(),
                    to: this.id,
                    data: ev.candidate
                }
                ws().sendJson(data)
                console.log("send candidate", data)
            }
        }
    }

    // 我主动链接这个ID
    async connect() {
        console.log("i connect ", this.id)
        this.init()
        this.dc = this.c.createDataChannel("dc")
        this.dcInit()
    }

    private dcInit() {
        this.dc.onopen = (e) => {
            console.warn("dc open me : " + uuid() + " remote: " + this.id, e)
        }
        this.dc.onclose = e => {
            console.log("dc close", e)
        }
        this.dc.onerror = e => {
            console.log("dc error", e)
        }
        this.dc.onmessage = e => {
            console.log("dc msg", e)
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
        console.log("send", data)
        ws().sendJson(data)
    }

    public async onAnswer(sdp: RTCSessionDescription) {
        await this.c.setRemoteDescription(sdp)
        console.log(this.dc)
        // 设置后,链接建立完毕
    }

    public async onCandidate(candidate: RTCIceCandidate) {
        this.c.addIceCandidate(candidate)
        console.log("made connection ", this.id)

    }


    send(data: any) {
        if (!this.dc) {
            console.error("data channel to " + this.id + " is not avaiable")
            return
        }
        return this.dc.send(data)
    }


}