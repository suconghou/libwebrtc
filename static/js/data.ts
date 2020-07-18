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
		this.listen('message', (e) => {
			const uid = e.uid;
			const text = e.e.data;
			try {
				const { event, data } = JSON.parse(text)
				this.trigger(event, { data, uid })
			} catch (e) {
				console.error(e)
			}
		})
		this.listenInit()
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

	// 1. 每次我们取到数据块后在此声明,发送给查询过此数据块的用户
	// 2. 如果有用户查询时,我们也调用此函数检查
	async found(id: string, index: number) {
		const resolve = this.resolver.get(id)
		if (!resolve) {
			// 用户查询的这个资源我们从来没接触过,更别提里面的数据块了.
			console.warn("no resolve found for ", id)
			return
		}
		const k = `${id}:${index}`
		const buffer: ArrayBuffer = await resolve(id, index)
		if (!buffer) {
			console.warn("resolve has no buffer for ", id, index)
			return
		}
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

	private quit(uid: string, id: string, index: number) {
		this.sendTo(uid, JSON.stringify({
			event: 'quit',
			data: {
				id,
				index,
			}
		}))
	}

	private listenInit() {
		const quitList = {}
		this.listen("quit", async ({ data, uid }) => {
			const { id, index } = data
			quitList[`${id}|${index}`] = {
				time: +new Date(),
				uid,
			}
			// console.info('got quit msg ', quitList, data, uid)
		})
		this.listen('query', async ({ data, uid }) => {
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
		this.listen('found', ({ data, uid }) => {
			// 多个客户响应了,选取前几个客户随机发送请求
			const { id, index } = data
			const k = `${id}:${index}`
			let u = this.founders.get(k)
			// 这些uid返回了他们持有这个资源
			// console.info(uid, " has ", k)
			if (!u) {
				return console.warn(k + " is already resolve")
			}
			u.push(uid)
			clearTimeout(this.founderTimers[k])
			this.founderTimers[k] = setTimeout(async () => {
				// 如果对方响应found很慢,我们已经持有了此资源,则忽略
				const resolve = this.resolver.get(id)
				if (resolve) {
					const has = await resolve(id, index)
					if (has) {
						return
					}
				}
				const rr = u[Math.floor(Math.random() * u.length)]
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
		this.listen('resolve', async ({ data, uid }) => {
			const { id, index } = data
			const buffer = this.refBuffers.get(`${id}:${index}`)
			if (buffer) {
				const bufferKey = `${id}|${index}`
				return await this.sendBuffer(uid, buffer, bufferKey, () => {
					const has = quitList[bufferKey]
					if (has && uid == has.uid && +new Date() - has.time < 60e3) {
						// console.log("so stop send to ", uid, bufferKey)
						has.time = 0
						return true
					}
				})
			}
			return console.error("unresolved", id, index)
		})
		this.listen('buffer.recv', async (res) => {
			this.trigger('buffer.progress', res)
			// 当resolve时,http还未下载或未下载完成,但是收到rtc分片时,http已完成,则取消剩余分片
			const [id, index] = res.id.split('|')
			// id 为资源 vid:itag , index 为range分片ID
			const resolve = this.resolver.get(id)
			if (resolve) {
				const has = await resolve(id, index)
				if (has) {
					// console.warn("send quit buffer recv msg", res)
					this.quit(res.uid, id, index)
				}
			}
		})
		this.listen('buffer', ({ id, uid, buffer }) => {
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
