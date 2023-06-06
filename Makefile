.PHONY: all clean lint csslint htmllint jslint npm_install

NPM=npm
NPX=npx

all: csslint htmllint jslint

clean:

npm_install:
	$(NPM) install --no-audit --no-fund --no-save

csslint: npm_install
	$(NPX) csslint style.css

htmllint: npm_install
	$(NPX) htmllint index.html

jslint: npm_install
	$(NPX) eslint script.js
