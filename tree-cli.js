// Copyright (c) 2023 Joel Klinghed, see LICENSE file.

import { readFileSync } from 'fs';

import { complete } from './tree.js';

const buffer = readFileSync(process.argv[2]);

const data = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

console.log(complete(data, process.argv[3]));
