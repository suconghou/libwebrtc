import { ws, uuid, concatArrayBuffers, str2ab, ab2str, padRight } from './util/util'
import event from './util/event'
import manager from './manager'

const s = 102400

export default class extends event {
	private m: manager
	public id: string
	private buffers: Map<string, Array<ArrayBuffer>> = new Map()
	constructor(private readonly servers: RTCConfiguration) {
		super()
		this.m = new manager(servers)
		this.m.register("message", (e) => {
			const data = e.e.data
			if (data instanceof ArrayBuffer) {
				return this.extract(data, e.uid);
			}
			this.trigger("message", e)
		})
		this.id = uuid()
	}

	private extract(data: ArrayBuffer, uid: string) {
		try {
			let meta = ab2str(data.slice(0, 60))
			const buffer = data.slice(60)
			const [id, i, n] = JSON.parse(meta.trim())
			const item = this.buffers.get(id)
			if (item) {
				item[i] = buffer
			} else {
				const b = []
				b[i] = buffer
				this.buffers.set(id, b)
			}
			this.trigger('buffer.recv', {
				id,
				buffer,
				i,
				n,
				uid,
			})
			let done = true;
			const c = this.buffers.get(id)
			for (let j = 0; j < n; j++) {
				if (!c[j]) {
					done = false
				}
			}
			if (!done) {
				return
			}
			let buffers: ArrayBuffer = c[0]
			for (let j = 1; j < n; j++) {
				buffers = concatArrayBuffers(buffers, c[j])
			}
			this.trigger('buffer', {
				id,
				buffer: buffers,
				uid,
			})
			console.info(this.buffers, c)
			this.buffers.delete(id)
		} catch (e) {
			console.error(e)
		}
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

	sendBuffer(uuid: string, data: ArrayBuffer, id: string) {
		const datas = this.splitBuffer(data, id)
		datas.forEach(item => {
			this.sendTo(uuid, item.data)
		})
	}

	broadcastBuffer(data: ArrayBuffer, id: string) {
		const datas = this.splitBuffer(data, id)
		datas.forEach(item => {
			this.broadcast(item.data)
		})
	}

	private splitBuffer(data: ArrayBuffer, id: string) {
		let i = 0;
		let last = false;
		const datas = [];
		const n = Math.ceil(data.byteLength / s)
		while (true) {
			const start = s * i;
			let end = s * (i + 1)
			if (end >= data.byteLength) {
				end = data.byteLength
				last = true
			}
			const v = data.slice(start, end)
			let str = JSON.stringify([
				id.substr(0, 15),
				i,
				n,
			]);
			const t = str2ab(padRight(str, 30));
			datas.push({
				start,
				end,
				i,
				data: concatArrayBuffers(t, v)
			})
			i++
			if (last) {
				return datas;
			}
		}
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


