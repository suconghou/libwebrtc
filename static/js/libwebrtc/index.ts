import { ws, uuid } from './util/util'
import event from './util/event'
import manager from './manager'

export default class extends event {
	private m: manager
	public id: string
	constructor(private readonly servers: RTCConfiguration) {
		super()
		this.m = new manager(servers)
		this.m.register("message", (e) => {
			this.trigger("message", e)
		})
		this.id = uuid()
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

	// 向外暴露API

	// 单个发送
	sendTo(uuid: string, data: any) {
		return this.m.sendTo(uuid, data)
	}

	// 广播
	broadcast(data: any) {
		return this.m.broadcast(data)
	}

	getPeers() {
		return this.m.getPeers();
	}

	getStats() {
		return this.m.getStats()
	}



	private onOffer(data: any) {
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


