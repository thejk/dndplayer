.PHONY: all clean lint csslint htmllint jslint npm_install

NPM=npm
NPX=npx
JQ=jq
CXX=c++

all: csslint htmllint jslint items.tree

clean:

npm_install:
	$(NPM) install --no-audit --no-fund --no-save

csslint: npm_install
	$(NPX) csslint style.css

htmllint: npm_install
	$(NPX) htmllint index.html

jslint: npm_install
	$(NPX) eslint script.js tree.js
	$(NPX) eslint --env node tree-cli.js

mktree: mktree.cc
	$(CXX) -Wall -Werror -o $@ $<

items.tree: itemnames mktree
	./mktree $< $@

itemnames: 5e.tools/items-base.json 5e.tools/items.json
	$(JQ) -r '.item[]|.source="PHB"|.name' 5e.tools/items.json > .#itemnames
	$(JQ) -r '.baseitem[]|.source="PHB"|.name' 5e.tools/items-base.json >> .#itemnames
	sort -u .#itemnames -o $@
	rm -f .#itemnames
