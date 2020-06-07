build:
	cd static/js/libwebrtc && \
	tsc -t es2017 index.ts && \
	rollup index.js -o ../libwebrtc.js -n libwebrtc -f es