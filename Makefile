dev:
	parcel index.html
build:
	cd src/libwebrtc && \
	tsc -t es2017 index.ts && \
	rollup index.js -o ../libwebrtc.js -n libwebrtc -f es