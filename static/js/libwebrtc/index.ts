import { ws } from './util/util'
import conn from './conn'
import channel from './channel'
import manager from './manager'

export default class {
	private m: manager

	constructor(private readonly servers: RTCConfiguration) {
		this.m = new manager(servers)
	}

	initChannel() {
		// this.conn = new conn(this.servers)
		// this.channel = new channel(this.conn.getConn(), "name1")

	}

	init() {
		ws()
			.listen('offer', (data: any) => {
				this.onOffer(data)
			})
			.listen("answer", (data: any) => {
				this.onAnswer(data)
			})
			.listen("candidate", (data: any) => {
				this.onCandidate(data)
			})
			.listen('online', (data: any) => {
				this.connectId(data.id)
			})
			.listen('init', (data: any) => {
				this.waitForIds(data.ids)
			})
	}

	private onOffer(data: any) {
		console.info("我收到offer,应该设置")
		this.m.onOffer(data.from, data.data)
	}


	private onAnswer(data: any) {
		this.m.onAnswer(data.from, data.data)
	}

	private onCandidate(data: any) {
		this.m.onCandidate(data.from, data.data)
	}

	private connectId(id: string) {
		this.m.ensureToConnect(id)
	}

	private waitForIds(ids: Array<string>) {
		this.m.ensureWaitIds(ids)
	}

}


