import libwebrtc from "./libwebrtc/index";

/**
 * query 全网查询, {id,index, }
 * found 响应我持有资源
 * resolve 请求下载资源
 */

export default class extends libwebrtc {
	private refBuffers: Map<string, ArrayBuffer> = new Map()
	private founders: Map<string, Array<string>> = new Map()
	private founderTimers = {}
	private queries: Map<string, Array<string>> = new Map()
	private resolver: Map<string, Function> = new Map()
	constructor(servers: RTCConfiguration) {
		super(servers)
		this.register('message', (e) => {
			const uid = e.uid;
			const text = e.e.data;
			try {
				const { event, data } = JSON.parse(text)
				this.trigger(event, { data, uid })
			} catch (e) {
				console.error(e)
			}
		})
		this.listen()
	}

	query(id: string, index: number, resolve: Function) {
		this.founders.set(`${id}:${index}`, [])
		this.resolver.set(id, resolve)
		this.broadcast(JSON.stringify({
			event: 'query',
			data: {
				id,
				index
			}
		}))
	}

	async found(id: string, index: number) {
		const resolve = this.resolver.get(id)
		if (!resolve) {
			return
		}
		const k = `${id}:${index}`
		const buffer: ArrayBuffer = await resolve(id, index)
		if (buffer) {
			this.refBuffers.set(k, buffer)
			const u = this.queries.get(k)
			if (!u || !u.length) {
				// 没有人查询过,或者都已回复过
				return
			}
			u.forEach(uid => {
				this.sendTo(uid, JSON.stringify({
					event: 'found',
					data: {
						id,
						index,
					}
				}))
			})
			this.queries.delete(k)
		}
	}

	private listen() {
		this.register('query', async ({ data, uid }) => {
			const { id, index } = data
			const k = `${id}:${index}`
			const u = this.queries.get(k)
			if (!u) {
				this.queries.set(k, [uid])
			} else {
				u.push(uid)
			}
			await this.found(id, index)
		})
		this.register('found', ({ data, uid }) => {
			// 多个客户响应了,选取前3个客户随机发送请求
			const { id, index } = data
			const k = `${id}:${index}`
			let u = this.founders.get(k)
			if (!u) {
				return console.warn(k + " is already resolve")
			}
			u.push(uid)
			clearTimeout(this.founderTimers[k])
			this.founderTimers[k] = setTimeout(() => {
				const rr = u[Math.floor(Math.random() * u.length)]
				console.info(rr, 'resolve', id, index)
				this.sendTo(rr, JSON.stringify({
					event: 'resolve',
					data: {
						id,
						index,
					}
				}))
				this.founders.delete(k)
			}, 100)
		})
		this.register('resolve', async ({ data, uid }) => {
			const { id, index } = data
			const buffer = this.refBuffers.get(`${id}:${index}`)
			if (buffer) {
				return this.sendBuffer(uid, buffer, `${id}|${index}`)
			}
			return console.error("unresolved", id, index)
		})

		this.register('buffer', ({ id, uid, buffer }) => {
			let [idtag, index] = id.split('|')
			index = Number(index)
			this.trigger('data', {
				id: idtag,
				index,
				buffer,
			})
		})
	}

}
