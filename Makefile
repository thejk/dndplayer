.PHONY: all clean lint csslint htmllint npm_install

NPM=npm
NPX=npx

all: csslint htmllint

clean:

npm_install:
	$(NPM) install

csslint: npm_install
	$(NPX) csslint style.css

htmllint: npm_install
	$(NPX) htmllint index.html

