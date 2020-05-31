import libwebrtc from "./libwebrtc/index.ts";
const rtc = new libwebrtc();
rtc.init()
window.rtc = rtc