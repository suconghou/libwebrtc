# rtc

一个rtc网状网络




## P2P DATA 


setLocalDescription 以后发送offer到服务端

服务端广播到对应需求的客户端,客户端完成setRemote

1、A用户 createOffer
2、A用户 setLocalDescription(offer) 并发送信令 给B
3、B用户设置 setRemoteDescription(offer)
4、B用户 createAnswer 设置 setLocalDescription(answer) 并发送信令
5、A用户 setLocalDescription(answer)
————————————————

RTCPeerConnection 有多个实例

一个本地

多个远程


sessionStorage 记住uuid客户端



## WEBRTC

1. 获取视频流

`navigator.mediaDevices.getUserMedia`


2. P2P链接建立

RTCPeerConnection 需要iceServers

`new RTCPeerConnection(servers);`  `RTCSessionDescription`  `pc.onaddstream`  createOffer


pc.createOffer() , 接受两个回调函数,第一个成功以后的回调,第二个失败的回调, 成功的回调函数会得到一个实参,是一个 RTCSessionDescription 的对象, 包含两个键 `sdp` 和`type` type的值为'offer'

这个对象需要传送到 信令服务器.



3. `RTCDataChannel`

P2P 转送数据


https://test.webrtc.org/ 用来测试STUN和TURN服务器的可用性


turnserver 的默认端口是 外网的  3478 3479  127.0.0.1 的 5766

包括 tcp4 tcp6 udp4 udp6 本机内网IP,和本地公网IP





webrtc 链接与ws一样全局保持连接


## events

signal
connect
data
stream



ws链接服务器,包含自己ID

页面加载时,查询有多少个在线人数,即实例化多少个peer

假设100个在线,则实例化100个peer

每个peer包含要链接的ID

这100个peer中,对于peer1(网页1), 他需要实例化99个实例.

对每一个peer执行如下操作

peer2等待事件 signal , 然后通过ws发送signal给ws的ID是2的用户,并标明是1发送的.
在另一端的网页里(2的网页里),有 peer1实例,当收到是1发来的消息时,peer1.signal(发来的数据),得到answer,
然后,通过ws发送消息给网页1,并标明是网页2发送的,网页1收到以后认识到是网页2发来的,则peer2.signal(answer)
链接建立,网页1与网页2,直接通信

peer3等待事件 signal , 然后通过ws发送signal给ws的ID是3的用户,并标明是1发送的.
在另一端的网页里(3的网页里),有peer1实例,当收到1发来的消息,peer1.signal(发来的数据),得到answer,
然后,通过ws发送消息给网页1,并标明是网页3发送的,网页1收到以后认识到是网页3发来的,则peer3.signal(answer)
链接建立,网页1与网页3,直接通信

按照ID从小到大主动发起链接

当第一个ID进来时,ws,告诉自己当前的ID和当前在线ID,并向全网广播1号上线.
此时,无其他在线ID,不做操作.

当2号进来时,ws告诉自己是2号和当前在线ID,并向全网广播2号上线,自己需初始化这些在线ID的实例,然后被动等待链接过来.
1号收到2号上线的消息后,主动链接2号

当3号进来时,ws告诉3号自己的ID和当前在线ID,广播3号上线,1和2号收到后主动链接3号.

数据传输使用二进制传输, 扩展二进制


不考虑断线重连的情况:

为此我们要创建一个管理器

当init时,收到所有在线的用户id,

管理器需要为这些id初始化被动链接

当online时,
管理器需要创建主动链接,主动发起链接.


另一端页面发生刷新后

原本逻辑: 本端收到online,创建主动链接

但此uid,已在自己的列表中,此前的状态可能是主动,也可能是被动的. 原先的p2p链接已经是断开的了.

策略1:
    按原有状态,重新发起握手链接.
        当此uid晚于我上线,是我主动链接他的,那断线重连后与第一次是一样的逻辑.
        当此uid早于我上线,是他主动链接我的,那断线重连后,对方必定是被动等待链接,所以之前的被动链接
        需要转化为主动链接,变成此处我主动链接他.对方遵循的原则使用没变.


另一端仅仅ws重连了

    本端收到uid上线,
    按原有逻辑,本端应主动链接uid,但此uid已在列表中.
    若已连接则忽略,
    若未链接
        走策略1


在 ICE 处理中

里面还分为 iceGatheringState 和 iceConnectionState

iceGatheringState: 用来检测本地 candidate 的状态。其有以下三种状态：

new: 该 candidate 刚刚被创建

gathering: ICE 正在收集本地的 candidate

complete: ICE 完成本地 candidate 的收集

iceConnectionState: 用来检测远端 candidate 的状态。远端的状态比较复杂，一共有 7 种: new/checking/connected/completed/failed/disconnected/closed



iceGatheringState -> ready 

iceConnectionState -> new 



