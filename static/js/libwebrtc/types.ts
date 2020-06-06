export interface peerConn {
    passive: boolean,
    uid: string
    conn: any
    state: number
    connect: Function
}

export const enum peerState {
    OPEN,
    CLOSE,
    CONNECTING
}