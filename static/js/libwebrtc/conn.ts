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
            console.info(ev)
            try {
                const offer = await this.c.createOffer();
                await this.c.setLocalDescription(offer)
                // send sdp to ws server
                ws().sendJson({ event: 'offer', to: this.id, from: uuid(), data: offer })
                console.info(offer)
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
            console.info(ev)
        }
        this.c.onicecandidateerror = (ev: RTCPeerConnectionIceErrorEvent) => {
            console.info(ev)
        }

        this.c.onicegatheringstatechange = (ev: Event) => {
            console.info(ev)
        }

        this.c.oniceconnectionstatechange = (ev: Event) => {
            console.info(ev)
        }

        this.c.onicecandidate = (ev) => {
            console.info("onicecandidate", ev)
            if (ev.candidate) {
                const data = {
                    event: 'candidate',
                    from: uuid(),
                    to: this.id,
                    data: ev.candidate
                }
                ws().sendJson(data)
                console.info("send candidate", data)
            }
        }
    }

    // 我主动链接这个ID
    async connect() {
        console.info("i connect ", this.id)
        this.init()
        this.dc = this.c.createDataChannel("dc")
        this.dcInit()
    }

    private dcInit() {
        this.dc.onopen = (e) => {
            console.info("dc open", e)
            this.dc.send("hello world, " + this.id + " , i am " + uuid())
        }
        this.dc.onclose = e => {
            console.info("dc close", e)
        }
        this.dc.onerror = e => {
            console.info("dc error", e)
        }
        this.dc.onmessage = e => {
            console.info("dc msg", e)
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
        console.info("send", data)
        ws().sendJson(data)
    }

    public async onAnswer(sdp: RTCSessionDescription) {
        await this.c.setRemoteDescription(sdp)
        console.info(this.dc)
        // 设置后,链接建立完毕
    }

    public async onCandidate(candidate: RTCIceCandidate) {
        this.c.addIceCandidate(candidate)
        console.info("made connection ", this.id)

    }


}