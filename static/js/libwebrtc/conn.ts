import { ws, uuid } from './util/util'

export default class {
    private c: RTCPeerConnection

    constructor(private readonly id: string, private readonly servers: RTCConfiguration) {


    }

    // 我主动链接这个ID
    connect() {
        console.info("i connect ", this.id)
        if (this.c) {
            this.c.close()
        }
        this.c = new RTCPeerConnection(this.servers);
        this.c.onnegotiationneeded = async (ev: Event) => {
            console.info(ev)
            try {
                const offer = await this.c.createOffer();
                await this.c.setLocalDescription(offer)
                // send sdp to ws server
                ws().sendJson({ event: 'offer', from: uuid(), data: offer })
                console.info(offer)
                this.c.setRemoteDescription(offer)

            } catch (e) {
                console.error(e)
            }
        }

        this.c.ondatachannel = (ev: RTCDataChannelEvent) => {
            console.info(ev)
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
    }


}