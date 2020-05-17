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
				console.info(data)
			})
			.listen('online', (data: any) => {
				this.connectId(data.id)
			})
			.listen('init', (data: any) => {
				this.waitForIds(data.ids)
			})
	}

	private onOffer(data: any) {

	}

	private connectId(id: string) {
		this.m.ensureToConnect(id)
	}

	private waitForIds(ids: Array<string>) {
		this.m.ensureWaitIds(ids)
	}

}


