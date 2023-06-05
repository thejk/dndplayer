.PHONY: all clean lint csslint npm_install

NPM=npm
NPX=npx

all: csslint

clean:

npm_install:
	$(NPM) install

csslint: npm_install
	$(NPX) csslint style.css

